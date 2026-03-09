export const COUNTRY_OPTIONS = [
  "Indian",
  "African",
  "American",
  "Japanese",
  "Chinese",
  "Korean",
  "Middle Eastern",
  "Latin American",
  "European",
  "Southeast Asian",
] as const;

export const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
] as const;

export const GARMENT_OPTIONS = [
  "Kurti",
  "Skirt",
  "T-shirt",
  "Blazer",
  "Pants",
  "Saree",
  "Jeans",
  "Formal shirt",
  "Dress",
  "Jacket",
  "Sweater",
] as const;

export const RANDOM_MODEL_TRAITS = {
  ageRange: ["early 20s", "late 20s", "early 30s"],
  bodyType: ["slim build", "athletic build", "natural medium build"],
  hairStyle: [
    "neatly styled hair",
    "soft natural hair",
    "clean studio-ready hairstyle",
  ],
  pose: [
    "full-body front pose",
    "slight 3/4 angle fashion pose",
    "standing runway-style pose",
  ],
  setting: [
    "minimal studio backdrop",
    "clean indoor editorial backdrop",
    "fashion catalog backdrop with soft neutral lighting",
  ],
} as const;

export type CountryOption = (typeof COUNTRY_OPTIONS)[number];
export type GenderOption = (typeof GENDER_OPTIONS)[number]["value"];
export type GarmentOption = (typeof GARMENT_OPTIONS)[number];
