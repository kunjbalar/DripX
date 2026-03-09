"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { fileToDataUrl, fileToPuterPayload } from "@/lib/image-utils";
import {
  COUNTRY_OPTIONS,
  GARMENT_OPTIONS,
  GENDER_OPTIONS,
  RANDOM_MODEL_TRAITS,
  type CountryOption,
  type GarmentOption,
  type GenderOption,
} from "@/lib/options";
import { buildTryOnPrompt, type RandomizedModelTraits } from "@/lib/prompt";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function getRandomTraits(): RandomizedModelTraits {
  return {
    ageRange: pickRandom(RANDOM_MODEL_TRAITS.ageRange),
    bodyType: pickRandom(RANDOM_MODEL_TRAITS.bodyType),
    hairStyle: pickRandom(RANDOM_MODEL_TRAITS.hairStyle),
    pose: pickRandom(RANDOM_MODEL_TRAITS.pose),
    setting: pickRandom(RANDOM_MODEL_TRAITS.setting),
  };
}

function extractImageSource(result: unknown): string | null {
  if (typeof result === "object" && result instanceof HTMLImageElement) {
    return result.src;
  }

  if (Array.isArray(result)) {
    const first = result[0];
    if (first && typeof first === "object" && first instanceof HTMLImageElement) {
      return first.src;
    }
    if (
      first &&
      typeof first === "object" &&
      "src" in first &&
      typeof (first as { src?: unknown }).src === "string"
    ) {
      return (first as { src: string }).src;
    }
  }

  if (
    result &&
    typeof result === "object" &&
    "src" in result &&
    typeof (result as { src?: unknown }).src === "string"
  ) {
    return (result as { src: string }).src;
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Image generation failed. Please check Puter login/credits and try again.";
}

export function TryOnStudio() {
  const [country, setCountry] = useState<CountryOption>(COUNTRY_OPTIONS[0]);
  const [gender, setGender] = useState<GenderOption>(GENDER_OPTIONS[0].value);
  const [garmentType, setGarmentType] = useState<GarmentOption>(GARMENT_OPTIONS[0]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [garmentPreview, setGarmentPreview] = useState("");
  const [resultImageUrl, setResultImageUrl] = useState("");
  const [activeTraits, setActiveTraits] = useState<RandomizedModelTraits | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPuterReady, setIsPuterReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const checkPuter = () => {
      setIsPuterReady(Boolean(window.puter?.ai?.txt2img));
    };

    checkPuter();
    const interval = window.setInterval(checkPuter, 700);

    return () => window.clearInterval(interval);
  }, []);

  const staticPreviewTraits = useMemo<RandomizedModelTraits>(
    () => ({
      ageRange: "late 20s",
      bodyType: "natural medium build",
      hairStyle: "clean studio-ready hairstyle",
      pose: "full-body front pose",
      setting: "minimal studio backdrop",
    }),
    [],
  );

  const promptPreview = useMemo(
    () =>
      buildTryOnPrompt(
        {
          country,
          gender,
          garmentType,
          additionalNotes,
        },
        staticPreviewTraits,
      ),
    [country, gender, garmentType, additionalNotes, staticPreviewTraits],
  );

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload an image file (PNG, JPG, or WEBP).");
      event.currentTarget.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(`Image is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      event.currentTarget.value = "";
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setGarmentFile(file);
      setGarmentPreview(dataUrl);
      setResultImageUrl("");
      setActiveTraits(null);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleGenerate = async () => {
    if (!garmentFile) {
      setErrorMessage("Upload a garment image first.");
      return;
    }

    if (!window.puter?.ai?.txt2img) {
      setErrorMessage("Puter.js is still loading. Please wait a moment and retry.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");

    try {
      if (window.puter.auth?.isSignedIn) {
        const signedIn = await window.puter.auth.isSignedIn();
        if (!signedIn && window.puter.auth.signIn) {
          await window.puter.auth.signIn();
        }
      }

      const randomizedTraits = getRandomTraits();
      setActiveTraits(randomizedTraits);

      const prompt = buildTryOnPrompt(
        {
          country,
          gender,
          garmentType,
          additionalNotes,
        },
        randomizedTraits,
      );

      const { base64, mimeType } = await fileToPuterPayload(garmentFile);

      const generationResult = await window.puter.ai.txt2img({
        prompt,
        provider: "gemini",
        model: "gemini-3-pro-image-preview",
        input_image: base64,
        input_image_mime_type: mimeType,
        ratio: { w: 1024, h: 1024 },
      });

      const generatedSrc = extractImageSource(generationResult);
      if (!generatedSrc) {
        throw new Error("No image was returned. Please retry generation.");
      }

      setResultImageUrl(generatedSrc);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!resultImageUrl) {
      return;
    }

    const filename = `dripx-${country.toLowerCase().replace(/\s+/g, "-")}-${garmentType
      .toLowerCase()
      .replace(/\s+/g, "-")}-${Date.now()}.png`;

    const link = document.createElement("a");
    link.href = resultImageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-stone-300 bg-white px-5 py-5 shadow-sm sm:px-7">
        <p className="font-display text-sm font-semibold tracking-[0.18em] text-stone-500">DRIPX</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          AI Garment Try-On Studio
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600 sm:text-base">
          Upload one garment image, select model preferences (country, gender, and garment type), and
          generate a high-quality model image where the same garment is worn.
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full border border-stone-300 bg-stone-100 px-3 py-1 text-stone-700">
            Next.js + Tailwind v4
          </span>
          <span className="rounded-full border border-stone-300 bg-stone-100 px-3 py-1 text-stone-700">
            No DB / No Auth Layer
          </span>
          <span
            className={`rounded-full border px-3 py-1 ${
              isPuterReady
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-amber-300 bg-amber-50 text-amber-700"
            }`}
          >
            Puter.js {isPuterReady ? "ready" : "loading"}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-stone-300 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-xl font-semibold text-stone-900">Input</h2>
          <p className="mt-1 text-sm text-stone-500">
            Provide garment image and model preferences. DripX combines these with a strict fidelity prompt.
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-800" htmlFor="garment-upload">
                Garment image
              </label>
              <input
                id="garment-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileChange}
                className="block w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-stone-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-stone-800"
              />
              <p className="mt-1 text-xs text-stone-500">PNG/JPG/WEBP, up to {MAX_FILE_SIZE_MB}MB.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-800" htmlFor="country-select">
                  Model country style
                </label>
                <select
                  id="country-select"
                  value={country}
                  onChange={(event) => setCountry(event.target.value as CountryOption)}
                  className="block w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none ring-0 focus:border-blue-500"
                >
                  {COUNTRY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-800" htmlFor="gender-select">
                  Model gender
                </label>
                <select
                  id="gender-select"
                  value={gender}
                  onChange={(event) => setGender(event.target.value as GenderOption)}
                  className="block w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none ring-0 focus:border-blue-500"
                >
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-stone-800" htmlFor="garment-type-select">
                Garment type
              </label>
              <select
                id="garment-type-select"
                value={garmentType}
                onChange={(event) => setGarmentType(event.target.value as GarmentOption)}
                className="block w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none ring-0 focus:border-blue-500"
              >
                {GARMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-stone-800" htmlFor="notes-input">
                Optional extra styling notes
              </label>
              <textarea
                id="notes-input"
                value={additionalNotes}
                onChange={(event) => setAdditionalNotes(event.target.value)}
                placeholder="e.g. clean studio shot, plain background, standing pose"
                rows={3}
                className="block w-full resize-none rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <p className="mb-2 block text-sm font-medium text-stone-800">Prompt preview</p>
              <pre className="max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border border-stone-300 bg-stone-50 p-3 text-xs leading-5 text-stone-600">
                {promptPreview}
              </pre>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex w-full items-center justify-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isGenerating ? "Generating..." : "Generate Try-On Image"}
            </button>

            {errorMessage ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-stone-300 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="font-display text-lg font-semibold text-stone-900">Uploaded garment</h3>
            <div className="mt-3 flex min-h-52 items-center justify-center overflow-hidden rounded-xl border border-dashed border-stone-300 bg-stone-50">
              {garmentPreview ? (
                <Image
                  src={garmentPreview}
                  alt="Uploaded garment preview"
                  width={1024}
                  height={1024}
                  unoptimized
                  className="h-full max-h-72 w-full object-contain"
                />
              ) : (
                <p className="px-4 text-center text-sm text-stone-500">No garment image uploaded yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-300 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="font-display text-lg font-semibold text-stone-900">Generated result</h3>
            {activeTraits ? (
              <p className="mt-2 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-600">
                Randomized model profile: {activeTraits.ageRange}, {activeTraits.bodyType},{" "}
                {activeTraits.hairStyle}, {activeTraits.pose}.
              </p>
            ) : null}

            <div className="mt-3 flex min-h-72 items-center justify-center overflow-hidden rounded-xl border border-dashed border-stone-300 bg-stone-50">
              {resultImageUrl ? (
                <Image
                  src={resultImageUrl}
                  alt="Generated model wearing uploaded garment"
                  width={1024}
                  height={1024}
                  unoptimized
                  className="h-full max-h-[520px] w-full object-contain"
                />
              ) : (
                <p className="px-4 text-center text-sm text-stone-500">
                  Generated image will appear here after you click Generate.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!resultImageUrl}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
            >
              Download generated image
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
