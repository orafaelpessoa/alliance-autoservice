"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Search, Plus, User, Car } from "lucide-react";

type SearchResult = {
  id: string;
  type: "client" | "vehicle";
  label: string;
  secondary: string | null;
};

export default function DashboardPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("search_index")
        .select("*")
        .ilike("search_text", `%${query.toLowerCase()}%`)
        .limit(10);

      if (!error && data) {
        setResults(data as SearchResult[]);
      }

      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  function handleNavigate(item: SearchResult) {
    if (item.type === "client") {
      router.push(`/dashboard/clients/${item.id}`);
    } else {
      router.push(`/dashboard/vehicles/${item.id}`);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100">
      {/* HEADER */}
      <header className="bg-yellow-400 px-6 py-4 shadow">
        <h1 className="text-xl text-center font-bold text-black">
          Alliance Auto Service
        </h1>
      </header>

      {/* CONTEÚDO */}
      <section className="flex flex-col items-center mt-20 px-4">
        {/* BUSCA */}
        <div className="w-full max-w-xl flex gap-2">
          <input
            type="text"
            placeholder="Buscar por cliente ou placa..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-4 py-3 rounded-md shadow focus:outline-none text-black"
          />

          <button
            className="bg-gray-800 text-white px-4 rounded-md shadow hover:bg-gray-700 flex items-center justify-center"
            aria-label="Buscar"
          >
            <Search size={18} />
          </button>
        </div>

        {/* RESULTADOS */}
        {query && (
          <div className="w-full max-w-xl bg-white mt-2 rounded-md shadow divide-y">
            {loading && (
              <p className="p-4 text-sm text-gray-600">Buscando...</p>
            )}

            {!loading && results.length === 0 && (
              <p className="p-4 text-sm text-gray-600">
                Nenhum resultado encontrado
              </p>
            )}

            {results.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item)}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 flex gap-3 items-start"
              >
                <div className="mt-1 text-gray-600">
                  {item.type === "client" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Car className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <p className="font-medium text-black">{item.label}</p>

                  {item.secondary && (
                    <p className="text-sm text-gray-600">{item.secondary}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* BOTÃO CADASTRAR */}
        <button
          onClick={() => router.push("/dashboard/clients/new")}
          className="mt-10 bg-yellow-400 text-black font-semibold px-6 py-3 rounded-md shadow hover:bg-yellow-300 flex items-center gap-2"
        >
          <Plus size={18} />
          Cadastrar
        </button>
      </section>
    </main>
  );
}
