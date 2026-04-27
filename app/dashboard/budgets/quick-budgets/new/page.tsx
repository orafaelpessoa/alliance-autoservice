"use client";

import AppHeader from "@/components/AppHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PartPickerModal from "@/components/PartPickerModal";
import { useRouter } from "next/navigation";

/* ======================
    TYPES
====================== */

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

export default function QuickBudgetPage() {
    const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [vehicleLabel, setVehicleLabel] = useState("");

  const [parts, setParts] = useState<Part[]>([]);
  const [items, setItems] = useState<BudgetItem[]>([]);

  const [showPartModal, setShowPartModal] = useState(false);

  /* ======================
      LOAD PARTS
  ====================== */

  useEffect(() => {
    const loadParts = async () => {
      const { data } = await supabase
        .from("stock_current")
        .select("id, name, sale_price, quantity")
        .order("name");

      setParts(data || []);
    };

    loadParts();
  }, []);

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
      alert("Peça indisponível");
      return;
    }

    const existing = items.find((i) => i.part_id === part.id);
    const currentQty = existing?.quantity ?? 0;

    if (currentQty >= part.quantity) {
      alert("Estoque máximo atingido");
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

    const q = updated[index].quantity;
    const p = updated[index].unit_price;
    const d = updated[index].discount;

    updated[index].total = q * p - d;

    setItems(updated);
  };

  /* ======================
      SAVE QUICK BUDGET
  ====================== */

  const saveQuickBudget = async () => {
    if (!customerName) {
      alert("Informe o nome do cliente");
      return;
    }

    if (items.length === 0) {
      alert("Adicione pelo menos um item");
      return;
    }

    const total = items.reduce((sum, i) => sum + i.total, 0);
    const { data: budget, error } = await supabase
      .from("quick_budgets")
      .insert({
        customer_name: customerName,
        vehicle_label: vehicleLabel,
        total,
      })
      .select()
      .single();

    if (error || !budget) {
      alert("Erro ao salvar orçamento");
      return;
    }

    for (const item of items) {
      await supabase.from("quick_budget_items").insert({
        quick_budget_id: budget.id,
        part_id: item.part_id ?? null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      });
    }

    router.push(`/dashboard/budgets/quick-budgets/${budget.id}`);
  };

  /* ======================
      UI
  ====================== */

  return (
    <main className="min-h-screen bg-gray-100">
      <AppHeader />

      <section className="max-w-5xl mx-auto px-4 mt-10 space-y-8">
        <header>
          <h1 className="text-2xl font-semibold text-black">
            ⚡ Orçamento rápido
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Monte um orçamento em poucos segundos
          </p>
        </header>

        {/* Cliente */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <input
            type="text"
            placeholder="Nome do cliente"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-4 py-3 border rounded text-black"
          />

          <input
            type="text"
            placeholder="Veículo (opcional)"
            value={vehicleLabel}
            onChange={(e) => setVehicleLabel(e.target.value)}
            className="w-full px-4 py-3 border rounded text-black"
          />
        </div>

        {/* Itens */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-black">Itens</h2>

            <div className="flex gap-2">
              <button
                onClick={addService}
                className="px-3 py-2 bg-gray-200 cursor-pointer rounded text-black hover:bg-gray-300"
              >
                Serviço
              </button>

              <button
                onClick={() => setShowPartModal(true)}
                className="px-3 py-2 bg-gray-200 cursor-pointer rounded text-black hover:bg-gray-300"
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
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td>
                      <input
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, "description", e.target.value)
                        }
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>

                    <td>
                      <input
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", Number(e.target.value))
                        }
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>

                    <td>
                      <input
                        value={item.unit_price}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "unit_price",
                            Number(e.target.value)
                          )
                        }
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>

                    <td>
                      <input
                        value={item.discount}
                        onChange={(e) =>
                          updateItem(index, "discount", Number(e.target.value))
                        }
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>

                    <td className="text-right">
                      R$ {item.total.toFixed(2)}
                    </td>

                    <td>
                      <button
                        onClick={() =>
                          setItems(items.filter((_, i) => i !== index))
                        }
                        className="text-red-500"
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

        {/* Resumo */}
        <div className="bg-white rounded-lg shadow p-6 text-black">
          {(() => {
            const subtotal = items.reduce((s, i) => s + i.total, 0);

            return (
              <>
                <div className="flex justify-between font-semibold text-xl">
                  <span>Total</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
              </>
            );
          })()}

          <div className="flex justify-end mt-6">
            <button
              onClick={saveQuickBudget}
              className="px-6 py-3 bg-gray-800 cursor-pointer text-white rounded-md hover:bg-black"
            >
              Salvar orçamento
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