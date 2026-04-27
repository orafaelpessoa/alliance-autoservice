"use client";

import AppHeader from "@/components/AppHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function QuickBudgetsListPage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    const { data, error } = await supabase
      .from("quick_budgets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setBudgets(data || []);
    setLoading(false);
  };

  const handleOpen = (id: string) => {
    router.push(`/dashboard/budgets/quick-budgets/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente deletar este orçamento?")) return;

    const { error } = await supabase
      .from("quick_budgets")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Erro ao deletar");
      return;
    }

    // remove da tela sem precisar recarregar
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <main className="min-h-screen bg-gray-100">
      <AppHeader />

      <section className="max-w-5xl mx-auto px-4 mt-10">
        <h1 className="text-2xl font-semibold text-black mb-6">
          Orçamentos rápidos
        </h1>

        {loading ? (
          <p className="text-black">Carregando...</p>
        ) : budgets.length === 0 ? (
          <p className="text-black">Nenhum orçamento encontrado.</p>
        ) : (
          <div className="bg-white rounded shadow overflow-hidden">
            <table className="w-full text-sm text-black">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Veículo</th>
                  <th className="p-3">Data</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>

              <tbody>
                {budgets.map((b) => (
                  <tr key={b.id} className="border-b">
                    <td className="p-3">{b.customer_name}</td>
                    <td className="p-3">{b.vehicle_label || "-"}</td>
                    <td className="p-3">
                      {new Date(b.created_at).toLocaleDateString("pt-BR")}
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpen(b.id)}
                          className="px-3 py-1 bg-blue-600 cursor-pointer text-white rounded"
                        >
                          Abrir
                        </button>

                        <button
                          onClick={() => handleDelete(b.id)}
                          className="px-3 py-1 bg-red-600 cursor-pointer text-white rounded"
                        >
                          Deletar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}