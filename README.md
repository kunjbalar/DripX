# DripX
DripX is a single-page virtual try-on web app built with Next.js + Tailwind CSS v4.  
Users upload one garment photo, choose model preferences, and generate a photorealistic model wearing the same garment using Puter.js with Gemini image generation.

## Core Features
- Garment image upload (PNG/JPG/WEBP)
- Model preference selection:
  - Country style (Indian, African, American, Japanese, Chinese, Korean, etc.)
  - Gender (Male/Female)
  - Garment type (Kurti, Skirt, T-shirt, Blazer, Pants, Saree, Jeans, Formal shirt, etc.)
- Strong prompt composition focused on garment fidelity
- Randomized model variation per generation (within selected preferences)
- Generated image preview
- One-click download of generated result
- No database, no custom auth layer

## Tech Stack
- Next.js (App Router, TypeScript)
- Tailwind CSS v4
- Puter.js (`https://js.puter.com/v2/`)
- Gemini image model via Puter (`gemini-3-pro-image-preview`)

## How DripX Works
1. User uploads a garment image.
2. User selects country, gender, garment type, and optional notes.
3. App builds a strict prompt by combining:
   - fixed garment-fidelity instructions
   - user selections
   - randomized model traits (age/body/pose/setting)
4. App converts the uploaded image to base64 and sends prompt + image to Puter:
   - `provider: "gemini"`
   - `model: "gemini-3-pro-image-preview"`
   - `input_image` + `input_image_mime_type`
5. Generated output image is displayed and can be downloaded.

## Project Structure
```text
DripX/
├─ app/
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ components/
│  └─ try-on-studio.tsx
├─ lib/
│  ├─ image-utils.ts
│  ├─ options.ts
│  └─ prompt.ts
├─ types/
│  └─ puter.d.ts
├─ progress.md
├─ package.json
└─ ...
```

## Setup
### Prerequisites
- Node.js 20+ (recommended)
- npm
- Internet connection for Puter/Gemini calls

### Install
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```
Then open: `http://localhost:3000`

### Production Build
```bash
npm run build
npm start
```

## Available Scripts
- `npm run dev` - start development server
- `npm run build` - create production build
- `npm start` - run production server
- `npm run lint` - run ESLint

## Puter/Gemini Notes
- DripX loads Puter.js in `app/layout.tsx`.
- On first generation, Puter may require sign-in.
- This project does not manage billing/trials itself; usage limits and billing are handled by Puter.

## Customization Pointers
- Update selectable countries, genders, and garment types in `lib/options.ts`.
- Refine prompt strategy in `lib/prompt.ts`.
- Adjust UI layout and styling in `components/try-on-studio.tsx` and `app/globals.css`.

## Scope
- Single-page experience
- Frontend and backend served through one Next.js app/port
- No database
- No user account system inside this codebase
