import { TryOnStudio } from "@/components/try-on-studio";

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-100 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <TryOnStudio />
      </div>
    </main>
  );
}
