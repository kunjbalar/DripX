"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import * as Select from "@radix-ui/react-select";
import { motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Download,
  LoaderCircle,
  Shirt,
  Sparkles,
  Upload,
} from "lucide-react";
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
import { SourceTextModule } from "vm";

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

type StyledSelectProps<T extends string> = {
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
};

function StyledSelect<T extends string>({
  label,
  value,
  onValueChange,
  options,
}: StyledSelectProps<T>) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[#f7f0d8]">{label}</p>
      <Select.Root value={value} onValueChange={(next) => onValueChange(next as T)}>
        <Select.Trigger className="flex h-11 w-full items-center justify-between rounded-xl border border-[#d9cfaf] bg-[#616261] px-3 text-sm text-[#f1e9cd] outline-none transition-colors hover:border-[#e04c1f]/70 focus:border-[#e04c1f]">
          <Select.Value />
          <Select.Icon>
            <ChevronDown className="h-4 w-4 text-[#f1e9cd]" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            className="z-50 min-w-[200px] overflow-hidden rounded-xl border border-[#d9cfaf] bg-[#fffaf0] p-1 shadow-xl shadow-black/10"
          >
            <Select.Viewport className="p-1">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex cursor-pointer items-center rounded-lg py-2 pr-8 pl-8 text-sm text-[#282a26] outline-none transition-colors data-[highlighted]:bg-[#f6e7d9]"
                >
                  <Select.ItemIndicator className="absolute left-2 inline-flex items-center text-[#e04c1f]">
                    <Check className="h-4 w-4" />
                  </Select.ItemIndicator>
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

export function TryOnStudio() {
  const [country, setCountry] = useState<CountryOption>(COUNTRY_OPTIONS[0]);
  const [gender, setGender] = useState<GenderOption>(GENDER_OPTIONS[0].value);
  const [garmentType, setGarmentType] = useState<GarmentOption>(GARMENT_OPTIONS[0]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [garmentPreview, setGarmentPreview] = useState("");
  const [resultImageUrl, setResultImageUrl] = useState("");
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
    <section className="relative mx-auto max-w-6xl">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-12 -left-8 h-36 w-36 rounded-full bg-[#e04c1f]/12"
          animate={{ y: [0, 10, 0], x: [0, 8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-32 -right-10 h-28 w-28 rounded-3xl bg-[#caa86f]/20"
          animate={{ y: [0, -12, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        <motion.div
          className="absolute -bottom-8 left-1/3 h-24 w-24 rounded-full bg-[#9a8f72]/16"
          animate={{ y: [0, -8, 0], x: [0, -8, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        />
      </div>
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mb-6 text-center sm:mb-8"
      >
        <p className="font-display text-5xl font-semibold tracking-tight text-[#e04c1f] sm:text-6xl">DripX</p>
        <p className="mt-2 text-sm text-[#282a26] sm:text-base">AI Virtual Try-On Studio</p>
      </motion.header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
          className="rounded-2xl border border-[#d9cfaf] bg-[#433F3D]/95 p-4 shadow-2xl shadow-[#7b6f4f]/15 sm:p-6"
        >
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[#f7f0d8]">
                Upload garment image
              </p>
              <label
                htmlFor="garment-upload"
                className="group relative block cursor-pointer overflow-hidden rounded-2xl border border-dashed border-[#d9cfaf] bg-[#616261] p-4 transition-colors hover:border-[#e04c1f]  sm:p-5"
                >
                <input
                  id="garment-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {garmentPreview ? (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-xl border border-[#d9cfaf]">
                      <Image
                        src={garmentPreview}
                        alt="Uploaded garment preview"
                        width={1024}
                        height={1024}
                        unoptimized
                        className="h-64 w-full object-contain sm:h-72"
                      />
                    </div>
                    <p className="text-center text-xs text-[#f1e9cd]">
                      Click to replace image · PNG/JPG/WEBP · up to {MAX_FILE_SIZE_MB}MB
                    </p>
                  </div>
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center gap-3 text-center sm:h-64">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#d9cfaf] bg-[#f6ecde] text-[#282a26] transition-colors group-hover:border-[#e04c1f] group-hover:text-[#e04c1f]">
                      <Upload className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-medium text-[#fffaf0]">Drag & drop or click to upload</p>
                    <p className="text-xs text-[#f1e9cd]">PNG/JPG/WEBP · max {MAX_FILE_SIZE_MB}MB</p>
                  </div>
                )}
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <StyledSelect
                label="Model country"
                value={country}
                onValueChange={setCountry}
                options={COUNTRY_OPTIONS.map((option) => ({ value: option, label: option }))}
              />

              <StyledSelect
                label="Model gender"
                value={gender}
                onValueChange={setGender}
                options={GENDER_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[#f7f0d8]">
                Garment category
              </p>
              <div className="flex flex-wrap gap-2">
                {GARMENT_OPTIONS.map((option) => {
                  const active = garmentType === option;
                  return (
                    <motion.button
                      key={option}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setGarmentType(option)}
                      className={`rounded-full border-2 px-4 py-2 text-sm transition-colors ${
                        active
                          ? "border-[#e04c1f] bg-[#f1e9cd] text-[#3a3f44] shadow-sm shadow-[#e04c1f]/20"
                          : "border-[#d9cfaf] bg-[#616261] text-[#f1e9cd] hover:border-[#e04c1f]/70"
                      }`}
                    >
                      {option}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[#f7f0d8]">
                Optional custom adjustment
              </p>
              <textarea
                value={additionalNotes}
                onChange={(event) => setAdditionalNotes(event.target.value)}
                placeholder="e.g. tuck in shirt, keep sleeves full, simple studio stance"
                rows={3}
                className="block w-full resize-none rounded-xl border border-[#d9cfaf] bg-[#616261] px-3 py-2.5 text-sm text-[#f1e9cd] outline-none transition-colors placeholder:text-[#8a8578] focus:border-[#e04c1f]"
              />
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.99 }}
              onClick={handleGenerate}
              disabled={isGenerating || !isPuterReady}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#e04c1f] text-sm font-semibold text-[#fff9ef] transition-colors hover:bg-[#c9431a] disabled:cursor-not-allowed disabled:bg-[#d9a494] disabled:text-[#fff9ef]/70"
            >
              {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {isGenerating ? "Generating..." : isPuterReady ? "Generate Try-On" : "Preparing engine..."}
            </motion.button>

            {errorMessage ? (
              <p className="rounded-xl border border-red-300/30 bg-red-900/20 px-3 py-2 text-sm text-red-100">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="rounded-2xl border border-[#d9cfaf] bg-[#433F3D]/95 p-4 shadow-2xl shadow-[#7b6f4f]/15 sm:p-6"
        >
          <div className="space-y-5">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#f7f0d8]">
                <Shirt className="h-3.5 w-3.5" />
                Uploaded garment
              </p>
              <div className="flex min-h-44 items-center justify-center overflow-hidden rounded-2xl border border-[#d9cfaf] bg-[#616261] p-3">
                {garmentPreview ? (
                  <Image
                    src={garmentPreview}
                    alt="Uploaded garment"
                    width={1024}
                    height={1024}
                    unoptimized
                    className="h-52 w-full object-contain"
                  />
                ) : (
                  <p className="text-center text-sm text-[#f1e9cd]">Your uploaded garment preview appears here.</p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#fffaf0]">
                <Sparkles className="h-3.5 w-3.5" />
                Generated model
              </p>
              <div className="flex min-h-[340px] items-center justify-center overflow-hidden rounded-2xl border border-[#d9cfaf] bg-[#616261] p-3">
                {resultImageUrl ? (
                  <Image
                    src={resultImageUrl}
                    alt="Generated model wearing garment"
                    width={1024}
                    height={1024}
                    unoptimized
                    className="h-full max-h-[540px] w-full object-contain"
                  />
                ) : (
                  <p className="text-center text-sm text-[#f1e9cd]">
                    Generated image will appear here after you click Generate.
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!resultImageUrl}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d9cfaf] bg-[#fffaf0] text-sm font-medium text-[#282a26] transition-colors hover:border-[#e04c1f]/70 hover:bg-[#fff3e6] disabled:cursor-not-allowed disabled:border-[#ddd6bf] disabled:bg-[#f5eed8] disabled:text-[#a29b8d]"
            >
              <Download className="h-4 w-4" />
              Download image
            </button>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}
