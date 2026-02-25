'use client'

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type AppHeaderProps = {
  children?: ReactNode;
};

export default function AppHeader({ children }: AppHeaderProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsAuthenticated(!!session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="bg-yellow-400 px-6 py-4 shadow relative min-h-22">
      {/* CENTRO CLICÁVEL */}
      <button
        onClick={() => {
          if (isAuthenticated) {
            router.push("/dashboard");
          }
        }}
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 ${
          isAuthenticated ? "cursor-pointer" : "cursor-default"
        }`}
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