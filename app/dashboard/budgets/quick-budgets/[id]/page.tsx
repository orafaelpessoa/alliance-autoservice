"use client";

import AppHeader from "@/components/AppHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import PartPickerModal from "@/components/PartPickerModal";
import { createBudgetPdfBlob } from "@/lib/pdf/createBudgetPdf";

export default function QuickBudgetDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [budget, setBudget] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [showPartModal, setShowPartModal] = useState(false);
  const [parts, setParts] = useState<any[]>([]);

  useEffect(() => {
    const loadBudget = async () => {
      const { data: budgetData } = await supabase
        .from("quick_budgets")
        .select("*")
        .eq("id", id)
        .single();

      setBudget(budgetData);

      const { data: itemsData } = await supabase
        .from("quick_budget_items")
        .select("*")
        .eq("quick_budget_id", id);

      setItems(itemsData || []);

      const { data: partsData } = await supabase
        .from("stock_current")
        .select("id, name, sale_price, quantity")
        .order("name");

      setParts(partsData || []);
    };

    if (id) loadBudget();
  }, [id]);

  const handleDelete = async () => {
  if (!confirm("Deseja realmente deletar este orçamento?")) return;

  const { error } = await supabase
    .from("quick_budgets")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  router.push("/dashboard/budgets/quick-budgets");
};

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from("quick_budgets")
        .update({
          customer_name: budget.customer_name,
          vehicle_label: budget.vehicle_label,
        })
        .eq("id", id);

      if (error) throw error;

      for (const item of items) {
        if (item.id) {
          await supabase
            .from("quick_budget_items")
            .update({
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
            })
            .eq("id", item.id);
        } else {
          await supabase.from("quick_budget_items").insert({
            quick_budget_id: id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
          });
        }
      }

      setEditing(false);
    } catch (err: any) {
      alert(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!budget) return;

    setDownloading(true);

    try {
      const total = items.reduce(
        (sum, i) => sum + i.quantity * i.unit_price,
        0
      );

      const adaptedBudget = {
        id: budget.id,
        created_at: budget.created_at,

        client: {
          name: budget.customer_name,
        },

        vehicle: {
          plate: budget.vehicle_label || "—",
          model: "",
        },

        budget_items: items.map((i) => {
          const totalItem = i.quantity * i.unit_price;

          return {
            id: i.id || crypto.randomUUID(),
            type: i.part_id ? "part" : "service",
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
            discount: 0,
            total: totalItem,
          };
        }),

        subtotal: total,
        discount_total: 0,
        total: total,
      };

      const blob = await createBudgetPdfBlob(adaptedBudget);

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `orcamento-${budget.id}.pdf`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erro ao gerar PDF");
    } finally {
      setDownloading(false);
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const removeItem = async (index: number) => {
    const item = items[index];

    if (item.id) {
      const { error } = await supabase
        .from("quick_budget_items")
        .delete()
        .eq("id", item.id);

      if (error) {
        alert("Erro ao remover item");
        return;
      }
    }

    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addService = () => {
    setItems((prev) => [
      ...prev,
      {
        description: "",
        quantity: 1,
        unit_price: 0,
      },
    ]);
  };

  const addPart = (part: any) => {
    if (part.quantity <= 0) {
      alert("Peça sem estoque");
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        part_id: part.id,
        description: part.name,
        quantity: 1,
        unit_price: part.sale_price,
      },
    ]);

    setShowPartModal(false);
  };

  if (!budget) {
    return <p className="p-6">Carregando...</p>;
  }

  const total = items.reduce(
    (sum, i) => sum + i.quantity * i.unit_price,
    0
  );

  return (
    <main className="min-h-screen bg-gray-100">
      <AppHeader />

      <section className="max-w-4xl mx-auto px-4 mt-10 space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-black">
            Orçamento rápido
          </h1>

          <div className="flex gap-2">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-blue-600 cursor-pointer text-white rounded-md"
              >
                Editar
              </button>
            )}

            {editing && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-green-600 cursor-pointer text-white rounded-md"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            )}

            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-4 py-2 bg-black cursor-pointer text-white rounded-md"
            >
              {downloading ? "Gerando PDF..." : "Baixar PDF"}
            </button>

            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 cursor-pointer text-white rounded-md"
            >
              Deletar
            </button>
          </div>
        </div>

        {/* INFO */}
        <div className="bg-white p-6 rounded shadow space-y-2 text-black">
          <div>
            <strong>Cliente:</strong>{" "}
            {editing ? (
              <input
                value={budget.customer_name}
                onChange={(e) =>
                  setBudget({
                    ...budget,
                    customer_name: e.target.value,
                  })
                }
                className="border px-2 py-1 rounded ml-2"
              />
            ) : (
              budget.customer_name
            )}
          </div>

          <div>
            <strong>Veículo:</strong>{" "}
            {editing ? (
              <input
                value={budget.vehicle_label || ""}
                onChange={(e) =>
                  setBudget({
                    ...budget,
                    vehicle_label: e.target.value,
                  })
                }
                className="border px-2 py-1 rounded ml-2"
              />
            ) : (
              budget.vehicle_label || "-"
            )}
          </div>
        </div>

        {/* ITENS */}
        <div className="bg-white p-6 rounded shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-black">Itens</h2>

            {editing && (
              <div className="flex gap-2">
                <button
                  onClick={addService}
                  className="px-3 py-1 text-black cursor-pointer bg-gray-200 rounded"
                >
                  + Serviço
                </button>

                <button
                  onClick={() => setShowPartModal(true)}
                  className="px-3 py-1 text-black cursor-pointer bg-gray-200 rounded"
                >
                  + Peça
                </button>
              </div>
            )}
          </div>

          <table className="w-full text-sm text-black">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Descrição</th>
                <th className="py-2">Qtd</th>
                <th className="py-2">Preço</th>
                <th className="py-2 text-right">Total</th>
                {editing && <th className="py-2 w-10"></th>}
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2">
                    {editing ? (
                      <input
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, "description", e.target.value)
                        }
                        className="border px-2 py-1 rounded w-full"
                      />
                    ) : (
                      item.description
                    )}
                  </td>

                  <td className="py-2">
                    {editing ? (
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", Number(e.target.value))
                        }
                        className="border px-2 py-1 rounded w-20"
                      />
                    ) : (
                      item.quantity
                    )}
                  </td>

                  <td className="py-2">
                    {editing ? (
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "unit_price",
                            Number(e.target.value)
                          )
                        }
                        className="border px-2 py-1 rounded w-28"
                      />
                    ) : (
                      `R$ ${item.unit_price.toFixed(2)}`
                    )}
                  </td>

                  <td className="py-2 text-right">
                    R$ {(item.quantity * item.unit_price).toFixed(2)}
                  </td>

                  {editing && (
                    <td className="text-right">
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTAL */}
        <div className="bg-white p-6 rounded shadow text-black">
          <div className="flex justify-between text-xl font-semibold">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
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