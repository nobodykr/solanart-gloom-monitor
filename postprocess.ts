// Helper library written for useful postprocessing tasks with Flat Data
// Has helper functions for manipulating csv, txt, json, excel, zip, and image files
import {
  readJSON,
  writeCSV,
  writeJSON,
  removeFile,
} from "https://deno.land/x/flat@0.0.13/mod.ts";

import { DB } from "https://deno.land/x/sqlite@v3.1.1/mod.ts";

type RawData = {
  id: number;
  // deno-lint-ignore camelcase
  token_add: string;
  price: number;
  // deno-lint-ignore camelcase
  for_sale: number;
  // deno-lint-ignore camelcase
  link_img: string;
  name: string;
  escrowAdd: string;
  // deno-lint-ignore camelcase
  seller_address: string;
  attributes: string;
  skin: null;
  type: "gloompunk";
  ranking: null;
  lastSoldPrice: null | number;
};

type ParsedData = {
  id: number;
  price: number;
  rank?: string;
  solanartURL: string;
  rarityURL: string;
} & Traits;

type Traits = {
  hair?: string;
  headAccessory?: string;
  faceAccessorry?: string;
  glasses?: string;
  clothes?: string;
  eyes?: string;
  eyebrows?: string;
  mouth?: string;
  skin?: string;
  background?: string;
};

const headers = [
  "id",
  "rank",
  "background",
  "skin",
  "hair",
  "mouth",
  "eyes",
  "eyebrows",
  "clothes",
  "headAccessory",
  "faceAccessory",
  "glasses",
];

type RarityData = { rank: string } & Traits;

// Step 1: Read the downloaded_filename JSON
const filename = Deno.args[0]; // Same name as downloaded_filename `const filename = 'btc-price.json';`
const data: Array<RawData> = await readJSON(filename);

const db = new DB("glooms.db");

// Step 2: Filter specific data we want to keep and write to a new JSON file
const enhancedData: Array<ParsedData> = data
  .map((gloom) => {
    const [_, id] = gloom.name.split("#");
    const rarityURL = `https://gloom-rarity-page.vercel.app/punk/${id}`;
    const solanartURL = `https://solanart.io/search/?token=${gloom.token_add}`;

    const queryData = db.query("SELECT * from gloomRarity WHERE id = ?", [id]);

    if (!queryData.length) {
      console.log("Couldn't find data for gloom:", id);
      return { id: parseInt(id), price: gloom.price, rarityURL, solanartURL };
    }

    const rarityData = queryData[0];

    const rarity: RarityData = headers.reduce<RarityData>(
      (acc, header, index) => {
        return {
          ...acc,
          [header]: rarityData[index],
        };
      },
      { rank: "" }
    );

    return {
      id: parseInt(id),
      price: gloom.price,
      ...rarity,
      rarityURL,
      solanartURL,
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.id - b.id);

db.close();

console.log("Initial Glooms:", data.length);
console.log("Processed Glooms:", enhancedData.length);

// Step 3. Write a new JSON file with our filtered data
await writeJSON("gloom-data-processed.json", enhancedData, null, 2);
await writeCSV("gloom-data-processed.csv", enhancedData);
console.log("Wrote a post process file");

// Delete the original file
await removeFile("./gloom-data.json");
