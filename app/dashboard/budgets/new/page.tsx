"use client";

import AppHeader from "@/components/AppHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import PartPickerModal from "@/components/PartPickerModal";

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

  /* ======================
     STATES
  ====================== */

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

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);

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
        .from("parts")
        .select("id, name, sale_price")
        .order("name");

      setClients(clients || []);
      setVehicles(vehicles || []);
      setParts(parts || []);
    };

    loadData();
  }, []);

  /* ======================
     REALTIME SEARCH (VEHICLE)
  ====================== */

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

  /* ======================
     ITEM HELPERS (FUTURO)
  ====================== */

  const addService = () => {
    setItems([
      ...items,
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
    setItems([
      ...items,
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
  };

  const updateItem = (index: number, field: keyof BudgetItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

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

    const { data: budget, error } = await supabase
      .from("budgets")
      .insert({
        client_id: clientId,
        vehicle_id: vehicleId,
        subtotal,
        total: subtotal,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
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
    }

    router.push(`/dashboard/budgets/${budget.id}`);
  };

  /* ======================
     UI
  ====================== */

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <main className="min-h-screen bg-gray-100">
      <AppHeader />

      <section className="max-w-5xl mx-auto px-4 mt-10 space-y-8">
        {/* TÍTULO */}
        <header>
          <h1 className="text-2xl font-semibold text-black">Novo orçamento</h1>
          <p className="text-sm text-gray-600 mt-1">
            Selecione o veículo e monte o orçamento
          </p>
        </header>

        {/* BUSCA */}
        <div className="flex gap-2 max-w-xl">
          <input
            type="text"
            placeholder="Buscar por placa ou nome do cliente..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-4 py-3 rounded-md shadow text-black"
          />

          <button className="bg-gray-800 text-white px-4 rounded-md shadow">
            <Search size={18} />
          </button>
        </div>

        {results.length > 0 && (
          <div className="bg-white border rounded-md shadow max-w-xl">
            {results.map((r) => (
              <button
                key={r.id}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b last:border-b-0"
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

        {/* VEÍCULO SELECIONADO */}
        {selectedVehicle && selectedClient && (
          <div className="bg-gray-50 border rounded-md p-4">
            <p className="font-medium text-black">
              {selectedVehicle.plate} — {selectedVehicle.model}
            </p>
            <p className="text-sm text-gray-600">
              Cliente: {selectedClient.name}
            </p>
          </div>
        )}

        {/* ITENS */}
        {/* ITENS DO ORÇAMENTO */}
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
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left text-gray-600">
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
                            value === "" ? 0 : Number(value),
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
                            value === "" ? 0 : Number(value),
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
                            value === "" ? 0 : Number(value),
                          );
                        }}
                        className="w-full px-2 py-1 border rounded text-black"
                      />
                    </td>

                    <td className="py-2 text-right font-medium text-black">
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

        {/* RESUMO */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-black mb-4">Resumo</h2>

          {/* Subtotal */}
          <div className="flex justify-between mb-2 text-black">
            <span>Subtotal</span>
            <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
          </div>

          {/* Desconto total */}
          <div className="flex justify-between mb-2 text-black">
            <span>Desconto total</span>
            <span className="font-medium">
              R$ {items.reduce((sum, i) => sum + i.discount, 0).toFixed(2)}
            </span>
          </div>

          {/* Total final */}
          <div className="flex justify-between mb-4 text-black">
            <span>Total final</span>
            <span className="font-semibold text-lg">
              R${" "}
              {(
                subtotal - items.reduce((sum, i) => sum + i.discount, 0)
              ).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-end gap-4">
            <button className="px-4 py-2 rounded-md bg-gray-200 text-black hover:bg-gray-300 cursor-pointer">
              Salvar rascunho
            </button>

            <button
              onClick={saveBudget}
              disabled={items.length === 0}
              className="px-4 py-2 rounded-md bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 cursor-pointer"
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
