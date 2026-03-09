import { TryOnStudio } from "@/components/try-on-studio";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#433F3D] py-6 sm:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <TryOnStudio />
      </div>
    </main>
  );
}
