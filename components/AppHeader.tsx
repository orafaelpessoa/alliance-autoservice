import { ReactNode } from "react";
import { useRouter } from "next/navigation";

type AppHeaderProps = {
  children?: ReactNode;
};

export default function AppHeader({ children }: AppHeaderProps) {
  const router = useRouter();

  return (
    <header className="bg-yellow-400 px-6 py-4 shadow relative">
      {/* CENTRO CLICÁVEL */}
      <button
        onClick={() => router.push("/dashboard")}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 cursor-pointer"
      >
        <img
          src="/assets/LOGO_ALLIANCE.png"
          alt="Alliance Auto Service"
          className="h-14 w-auto object-contain"
        />

        <h1 className="font-logo font-semibold text-2xl tracking-tight leading-none text-black">
          Alliance Auto Service
        </h1>
      </button>

      {/* AÇÕES À DIREITA */}
      <div className="flex justify-end">{children}</div>
    </header>
  );
}