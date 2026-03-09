"use client";

import AppHeader from "@/components/AppHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import PartPickerModal from "@/components/PartPickerModal";

/* ======================
    TYPES
====================== */

type SearchResult = {
  id: string;
  plate: string;
  client_name: string;
};

type Client = {
  id: string;
  name: string;
};

type Vehicle = {
  id: string;
  model: string;
  plate: string;
  client_id: string;
};

type Part = {
  id: string;
  name: string;
  sale_price: number;
  quantity: number;
};

type BudgetItem = {
  type: "part" | "service";
  part_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
};

export default function NewBudgetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleIdFromUrl = searchParams.get("vehicleId");

  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [parts, setParts] = useState<Part[]>([]);

  const [clientId, setClientId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [items, setItems] = useState<BudgetItem[]>([]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);

  /* ======================
      LOAD INITIAL DATA
  ====================== */

  useEffect(() => {
    const loadData = async () => {
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");

      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, model, plate, client_id");

      const { data: parts } = await supabase
        .from("stock_current")
        .select("id, name, sale_price, quantity")
        .order("name");

      setClients(clients || []);
      setVehicles(vehicles || []);
      setParts(parts || []);
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!vehicleIdFromUrl) return;

    const loadVehicleFromUrl = async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, model, plate, client_id")
        .eq("id", vehicleIdFromUrl)
        .single();

      if (error || !data) {
        console.error("Erro ao carregar veículo da URL", error);
        return;
      }

      setVehicleId(data.id);
      setClientId(data.client_id);
      setQuery(`${data.plate} — veículo selecionado`);
      setResults([]);
    };

    loadVehicleFromUrl();
  }, [vehicleIdFromUrl]);

  /* ======================
      SEARCH LOGIC
  ====================== */

  useEffect(() => {
    if (!query.trim() || vehicleId) {
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
  }, [query, vehicleId]);

  /* ======================
      ITEM HELPERS
  ====================== */

  const addService = () => {
    setItems((prev) => [
      ...prev,
      {
        type: "service",
        description: "",
        quantity: 1,
        unit_price: 0,
        discount: 0,
        total: 0,
      },
    ]);
  };

  const addPart = (part: Part) => {
    if (part.quantity <= 0) {
      alert("Peça indisponível em estoque");
      return;
    }

    const existing = items.find((i) => i.part_id === part.id);
    const currentQty = existing?.quantity ?? 0;

    if (currentQty >= part.quantity) {
      alert("Quantidade máxima disponível em estoque atingida");
      return;
    }

    if (existing) {
      setItems((prev) =>
        prev.map((i) =>
          i.part_id === part.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                total: (i.quantity + 1) * i.unit_price - i.discount,
              }
            : i
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          type: "part",
          part_id: part.id,
          description: part.name,
          quantity: 1,
          unit_price: part.sale_price,
          discount: 0,
          total: part.sale_price,
        },
      ]);
    }
  };

  const updateItem = (index: number, field: keyof BudgetItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    if (updated[index].type === "part" && updated[index].part_id) {
      const part = parts.find((p) => p.id === updated[index].part_id);
      if (part && updated[index].quantity > part.quantity) {
        updated[index].quantity = part.quantity;
        alert("Quantidade ajustada para o máximo disponível em estoque");
      }
    }

    const q = updated[index].quantity;
    const p = updated[index].unit_price;
    const d = updated[index].discount;

    updated[index].total = q * p - d;

    setItems(updated);
  };

  /* ======================
      SAVE BUDGET
  ====================== */

  const saveBudget = async () => {
    if (!clientId || !vehicleId) {
      alert("Selecione cliente e veículo");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const totalDiscount = items.reduce((s, i) => s + i.discount, 0);

    const { data: budget, error } = await supabase
      .from("budgets")
      .insert({
        client_id: clientId,
        vehicle_id: vehicleId,
        subtotal: subtotal,
        discount_total: totalDiscount,
        total: subtotal - totalDiscount,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error || !budget) {
      alert(error?.message || "Erro ao salvar orçamento");
      return;
    }

    for (const item of items) {
      await supabase.from("budget_items").insert({
        budget_id: budget.id,
        type: item.type,
        part_id: item.part_id ?? null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total: item.total,
      });
      
      // O bloco de "stock_movements" que ficava aqui foi removido.
      // Agora o estoque só baixa quando o orçamento for convertido em OS no backend.
    }

    router.push(`/dashboard/budgets/${budget.id}`);
  };

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <main className="min-h-screen bg-gray-100">
      <AppHeader />

      <section className="max-w-5xl mx-auto px-4 mt-10 space-y-8">
        <header>
          <h1 className="text-2xl font-semibold text-black">Novo orçamento</h1>
          <p className="text-sm text-gray-600 mt-1">
            Selecione o veículo e monte o orçamento
          </p>
        </header>

        <div className="flex gap-2 max-w-xl">
          <input
            type="text"
            placeholder="Buscar por placa ou nome do cliente..."
            value={query}
            disabled={!!vehicleId}
            onChange={(e) => setQuery(e.target.value)}
            className={`flex-1 px-4 py-3 rounded-md shadow text-black ${
              vehicleId ? "bg-gray-200 cursor-not-allowed" : "bg-white"
            }`}
          />

          <button className="bg-gray-800 text-white px-4 rounded-md cursor-pointer shadow">
            <Search size={18} />
          </button>
        </div>

        {results.length > 0 && !vehicleId && (
          <div className="bg-white border rounded-md shadow max-w-xl mt-[-28px] relative z-10">
            {results.map((r) => (
              <button
                key={r.id}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b"
                onClick={async () => {
                  const { data } = await supabase
                    .from("vehicles")
                    .select("id, model, plate, client_id")
                    .eq("id", r.id)
                    .single();

                  if (data) {
                    setVehicleId(data.id);
                    setClientId(data.client_id);
                    setQuery(`${data.plate} — ${r.client_name}`);
                    setResults([]);
                  }
                }}
              >
                <p className="font-medium text-black">{r.plate}</p>
                <p className="text-sm text-gray-600">{r.client_name}</p>
              </button>
            ))}
          </div>
        )}

        {selectedVehicle && selectedClient && (
          <div className="bg-gray-50 border rounded-md p-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-black">
                {selectedVehicle.plate} — {selectedVehicle.model}
              </p>
              <p className="text-sm text-gray-600">
                Cliente: {selectedClient.name}
              </p>
              <div className="mt-2 text-xs text-gray-400">
                ID Veículo: {vehicleId} | ID Cliente: {clientId}
              </div>
            </div>
            <button 
              onClick={() => {
                setVehicleId("");
                setClientId("");
                setQuery("");
              }}
              className="text-xs text-red-500 hover:underline"
            >
              Alterar veículo
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-black">
              Itens do orçamento
            </h2>
            <div className="flex gap-2">
              <button
                onClick={addService}
                className="px-3 py-2 text-sm bg-gray-200 rounded-md hover:bg-gray-300 text-black cursor-pointer"
              >
                Serviço
              </button>
              <button
                onClick={() => setShowPartModal(true)}
                className="px-3 py-2 text-sm bg-gray-200 rounded-md hover:bg-gray-300 text-black cursor-pointer"
              >
                Peça
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhum item adicionado ainda.
            </p>
          ) : (
            <table className="w-full text-sm border-collapse text-black">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Descrição</th>
                  <th className="py-2 w-20">Qtd</th>
                  <th className="py-2 w-28">Preço</th>
                  <th className="py-2 w-28">Desconto</th>
                  <th className="py-2 w-28 text-right">Total</th>
                  <th className="py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">
                      <input
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, "description", e.target.value)
                        }
                        className="w-full px-2 py-1 border rounded text-black"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          updateItem(
                            index,
                            "quantity",
                            value === "" ? 0 : Number(value)
                          );
                        }}
                        className="w-full px-2 py-1 border rounded text-black"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.unit_price}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          updateItem(
                            index,
                            "unit_price",
                            value === "" ? 0 : Number(value)
                          );
                        }}
                        className="w-full px-2 py-1 border rounded text-black"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.discount}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          updateItem(
                            index,
                            "discount",
                            value === "" ? 0 : Number(value)
                          );
                        }}
                        className="w-full px-2 py-1 border rounded text-black"
                      />
                    </td>
                    <td className="py-2 text-right font-medium">
                      R$ {item.total.toFixed(2)}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() =>
                          setItems(items.filter((_, i) => i !== index))
                        }
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-lg shadow text-black p-6">
          <h2 className="text-lg font-medium mb-4">Resumo</h2>
          {(() => {
            const totalParts = items
              .filter((i) => i.type === "part")
              .reduce((sum, i) => sum + i.total, 0);
            const totalLabor = items
              .filter((i) => i.type === "service")
              .reduce((sum, i) => sum + i.total, 0);
            const totalDiscount = items.reduce((sum, i) => sum + i.discount, 0);
            const subtotal = totalParts + totalLabor;
            const totalFinal = subtotal - totalDiscount;

            return (
              <>
                <div className="flex justify-between">
                  <span>Total de Peças</span>
                  <span>R$ {totalParts.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total de Mão de Obra</span>
                  <span>R$ {totalLabor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Descontos</span>
                  <span>- R$ {totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2 text-xl">
                  <span>Total</span>
                  <span>R$ {totalFinal.toFixed(2)}</span>
                </div>
              </>
            );
          })()}
          <div className="flex justify-end mt-6">
            <button
              onClick={saveBudget}
              className="px-6 py-3 bg-gray-800 text-white cursor-pointer rounded-md font-medium hover:bg-black transition-colors"
            >
              Gerar orçamento
            </button>
          </div>
        </div>
      </section>

      {showPartModal && (
        <PartPickerModal
          parts={parts}
          onSelect={addPart}
          onClose={() => setShowPartModal(false)}
        />
      )}
    </main>
  );
}