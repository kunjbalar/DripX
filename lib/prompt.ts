import type { CountryOption, GarmentOption, GenderOption } from "@/lib/options";

export type RandomizedModelTraits = {
  ageRange: string;
  bodyType: string;
  hairStyle: string;
  pose: string;
  setting: string;
};

export type PromptSelections = {
  country: CountryOption;
  gender: GenderOption;
  garmentType: GarmentOption;
  additionalNotes?: string;
};

const BASE_INSTRUCTIONS = [
  "Create one highly photorealistic fashion image.",
  "The person must wear the garment from the uploaded reference image.",
  "Do not redesign or replace the garment.",
  "Keep the same fabric texture, color, print, pattern, silhouette, stitch lines, and garment details from the reference.",
  "Preserve embroidery, logos, motifs, folds, and trim exactly if present.",
  "Model should be fully visible from head to toe, centered, and naturally proportioned.",
  "Ensure clean lighting, sharp details, realistic shadows, and realistic skin texture.",
  "No text overlays, no watermark, no extra garments covering the uploaded garment.",
  "Professional fashion catalog quality output.",
] as const;

export function buildTryOnPrompt(
  selections: PromptSelections,
  traits: RandomizedModelTraits,
): string {
  const detailLine = selections.additionalNotes?.trim()
    ? `Extra user styling intent: ${selections.additionalNotes.trim()}.`
    : "Extra user styling intent: keep styling simple and product-focused.";

  return [
    ...BASE_INSTRUCTIONS,
    "",
    `Model identity style: ${selections.country}.`,
    `Model gender: ${selections.gender}.`,
    `Garment category in reference image: ${selections.garmentType}.`,
    `Random model profile: ${traits.ageRange}, ${traits.bodyType}, ${traits.hairStyle}.`,
    `Pose direction: ${traits.pose}.`,
    `Scene direction: ${traits.setting}.`,
    detailLine,
    "",
    "Strict requirement: the worn garment in output must match the uploaded garment exactly.",
  ].join("\n");
}
