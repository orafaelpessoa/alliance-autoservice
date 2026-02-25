"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, Plus, PlusCircle, MinusCircle } from "lucide-react";
import StockMovementModal from "@/components/StockMovementModal";
import NewPartModal from "@/components/NewPartModal";
import AppHeader from "@/components/AppHeader";
import { useRouter } from "next/navigation";

type StockItem = {
  id: string;
  name: string;
  quantity: number;
};

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [openNewPart, setOpenNewPart] = useState(false);
  const [selectedPart, setSelectedPart] = useState<StockItem | null>(null);
  const [movementType, setMovementType] = useState<"in" | "out" | null>(null);

  async function loadStock() {
    setLoading(true);
    const { data, error } = await supabase.rpc("stock_current");
    if (!error && data) setItems(data as StockItem[]);
    setLoading(false);
  }

  useEffect(() => {
    loadStock();
  }, []);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <main className="min-h-screen bg-gray-100">
      <AppHeader />

      <h1 className="text-xl font-bold text-center py-7 text-black">
        Estoque de Peças
      </h1>

      <section className="max-w-4xl mx-auto mt-10 px-4">
        {/* BUSCA + NOVA PEÇA */}
        <div className="flex gap-2 mb-6">
          <div className="flex items-center bg-white rounded-md shadow px-3 flex-1">
            <Search size={16} className="text-gray-500" />
            <input
              type="text"
              placeholder="Buscar peça..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-2 py-2 outline-none text-black"
            />
          </div>

          <button
            onClick={() => router.push("/dashboard/stock/report")}
            className="bg-black text-white px-4 py-2 rounded-md shadow hover:bg-gray-800 flex items-center gap-2 cursor-pointer"
          >
            Relatório
          </button>

          <button
            onClick={() => setOpenNewPart(true)}
            className="bg-yellow-400 text-black px-4 rounded-md shadow hover:bg-yellow-300 flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            Nova peça
          </button>
        </div>

        {/* LISTA */}
        <div className="bg-white rounded-md shadow divide-y">
          {loading && (
            <p className="p-4 text-sm text-gray-500">Carregando estoque...</p>
          )}

          {!loading && filteredItems.length === 0 && (
            <p className="p-4 text-sm text-gray-500">Nenhuma peça encontrada</p>
          )}

          {filteredItems.map((item) => {
            const status =
              item.quantity === 0
                ? "text-red-600"
                : item.quantity < 5
                  ? "text-yellow-600"
                  : "text-green-600";

            return (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="font-medium uppercase tracking-wide text-black">
                    {item.name}
                  </p>
                  <p className={`text-sm font-semibold ${status}`}>
                    {item.quantity} em estoque
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedPart(item);
                      setMovementType("in");
                    }}
                    title="Entrada de estoque"
                    className="p-2 rounded-md bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer"
                  >
                    <PlusCircle size={18} />
                  </button>

                  <button
                    onClick={() => {
                      setSelectedPart(item);
                      setMovementType("out");
                    }}
                    title="Saída de estoque"
                    className="p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer"
                  >
                    <MinusCircle size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* MODAL MOVIMENTAÇÃO */}
      {movementType && selectedPart && (
        <StockMovementModal
          open={true}
          partId={selectedPart.id}
          type={movementType}
          onClose={() => setMovementType(null)}
          onSuccess={() => {
            loadStock();
            setMovementType(null);
          }}
        />
      )}

      {/* MODAL NOVA PEÇA (ENCadeado) */}
      <NewPartModal
        open={openNewPart}
        onClose={() => setOpenNewPart(false)}
        onFinish={async () => {
          setOpenNewPart(false);
          await loadStock();
        }}
      />
    </main>
  );
}
