export {};

type PuterTxt2ImgOptions = {
  prompt: string;
  provider?: "openai-image-generation" | "gemini" | "together" | "xai";
  model?: string;
  ratio?: {
    w: number;
    h: number;
  };
  input_image?: string;
  input_image_mime_type?: string;
  test_mode?: boolean;
};

declare global {
  interface Window {
    puter?: {
      ai?: {
        txt2img: (
          input: string | PuterTxt2ImgOptions,
          options?: boolean | Omit<PuterTxt2ImgOptions, "prompt">,
        ) => Promise<unknown>;
      };
      auth?: {
        isSignedIn?: () => Promise<boolean> | boolean;
        signIn?: () => Promise<void>;
      };
    };
  }
}
