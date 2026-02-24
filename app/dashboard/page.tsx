"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Search, Plus, Car, Package } from "lucide-react";
import AppHeader from "@/components/AppHeader";
type SearchResult = {
  id: string;
  plate: string;
  client_name: string;
};

type Vehicle = {
  id: string;
  plate: string;
  brand: string;
  model: string;
};

type StockMovement = {
  id: string;
  quantity: number;
  type: "in" | "out";
  part_name: string;
  reason: string | null;
};

export default function DashboardPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const [recentVehicles, setRecentVehicles] = useState<Vehicle[]>([]);
  const [recentStock, setRecentStock] = useState<StockMovement[]>([]);

  // ===============================
  // BUSCA PRINCIPAL (VEÍCULOS)
  // ===============================
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);

      const normalizedQuery = query
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      const { data, error } = await supabase.rpc("search_index_ranked", {
        q: normalizedQuery,
      });

      if (!error && data) {
        setResults(data as SearchResult[]);
      } else {
        setResults([]);
      }

      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  // ===============================
  // DADOS RECENTES
  // ===============================
  useEffect(() => {
    loadRecentData();
  }, []);

  async function loadRecentData() {
    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("id, plate, brand, model")
      .order("created_at", { ascending: false })
      .limit(3);

    const { data: stock } = await supabase
      .from("stock_report")
      .select("id, part_name, quantity, type, created_at, reason")
      .order("created_at", { ascending: false })
      .limit(3);

    if (vehicles) setRecentVehicles(vehicles);
    if (stock) setRecentStock(stock);
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <AppHeader>
        <button
          onClick={() => router.push("/dashboard/vehicles/new")}
          className="bg-black text-white px-4 py-2 rounded-md shadow hover:bg-gray-800 flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} />
          Cadastrar
        </button>
      </AppHeader>

      <section className="max-w-5xl mx-auto px-4 mt-10">
        {/* BUSCA */}
        <div className="flex gap-2 max-w-xl mx-auto">
          <input
            type="text"
            placeholder="Buscar por placa do veículo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-4 py-3 rounded-md shadow text-black"
          />

          <button
            className="bg-gray-800 text-white px-4 rounded-md shadow cursor-pointer hover:bg-gray-700"
            aria-label="Buscar"
          >
            <Search size={18} />
          </button>
        </div>

        {/* RESULTADOS */}
        {query && (
          <div className="max-w-xl mx-auto bg-white mt-2 rounded-md shadow divide-y">
            {loading && <p className="p-4 text-black text-sm">Buscando...</p>}

            {!loading && results.length === 0 && (
              <p className="p-4 text-black text-sm">
                Nenhum veículo encontrado
              </p>
            )}

            {results.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(`/dashboard/vehicles/${item.id}`)}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 flex gap-3 items-center cursor-pointer"
              >
                <Car className="w-4 h-4 text-black" />
                <span className="font-medium uppercase text-black">
                  {item.plate}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {/* VEÍCULOS */}
          <div className="bg-white rounded-md shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-black">Últimos veículos</h2>

              <button
                onClick={() => router.push("/dashboard/vehicles")}
                className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-md shadow hover:bg-gray-200 cursor-pointer text-black text-sm"
              >
                <Car size={14} />
                Ir para veículos
              </button>
            </div>

            {recentVehicles.length === 0 && (
              <p className="text-sm text-black">Nenhum veículo cadastrado.</p>
            )}

            {recentVehicles.map((v) => (
              <div
                key={v.id}
                onClick={() => router.push(`/dashboard/vehicles/${v.id}`)}
                className="flex items-center gap-4 p-3 mb-2 rounded-md shadow-sm hover:shadow-md cursor-pointer transition"
              >
                {/* ÍCONE */}
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                  <Car size={18} />
                </div>

                {/* TEXTO */}
                <div>
                  <p className="font-semibold text-black tracking-wide">
                    {v.plate}
                  </p>
                  <p className="text-sm text-black">
                    {v.brand} {v.model}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ESTOQUE */}
          <div className="bg-white rounded-md shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-black">
                Movimentações de estoque
              </h2>

              <button
                onClick={() => router.push("/dashboard/stock")}
                className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-md shadow hover:bg-gray-200 cursor-pointer text-black text-sm"
              >
                <Package size={14} />
                Ir para estoque
              </button>
            </div>

            {recentStock.length === 0 && (
              <p className="text-sm text-black">
                Nenhuma movimentação registrada.
              </p>
            )}

            {recentStock.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 mb-2 rounded-md shadow-sm"
              >
                <div className="flex items-center gap-4">
                  {/* ÍCONE */}
                  <div
                    className={`w-10 h-10 flex items-center justify-center rounded-full ${
                      s.type === "in"
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    <Package size={18} />
                  </div>

                  {/* TEXTO */}
                  <div>
                    <p className="font-medium text-black">{s.part_name}</p>
                    {s.reason && (
                      <p className="text-xs text-black">{s.reason}</p>
                    )}
                  </div>
                </div>

                {/* QUANTIDADE */}
                <span
                  className={`font-semibold ${
                    s.type === "in" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {s.type === "in" ? "+" : "-"}
                  {s.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push("/dashboard/vehicles/new")}
          className="mt-12 mx-auto flex items-center gap-2 bg-yellow-400 px-6 py-3 rounded-md shadow hover:bg-yellow-300 text-black cursor-pointer"
        >
          <Plus size={18} />
          Cadastrar veículo
        </button>
      </section>
    </main>
  );
}
