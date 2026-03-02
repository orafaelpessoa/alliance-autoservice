"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X } from "lucide-react";

type BudgetItem = {
  id: string;
  description: string;
};

type Budget = {
  id: string;
  created_at: string;
  total: number;
  used_in_service: boolean | null;
  budget_items: BudgetItem[];
};

type BudgetsModalProps = {
  vehicleId: string;
  isOpen: boolean;
  onClose: () => void;
  onRegisterService: (budgetId: string) => void;
};

export default function BudgetsModal({
  vehicleId,
  isOpen,
  onClose,
  onRegisterService,
}: BudgetsModalProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadBudgets();
  }, [isOpen]);

  async function loadBudgets() {
    setLoading(true);

    const { data, error } = await supabase
      .from("budgets")
      .select(
        `
  id,
  created_at,
  total,
  used_in_service,
  budget_items (
    id,
    description
  )
`,
      )
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar orçamentos:", error);
    } else {
      setBudgets(data || []);
    }

    setLoading(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white w-full max-w-2xl rounded-md shadow-lg p-6">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-black">
            Orçamentos do Veículo
          </h2>
          <button onClick={onClose} className="text-black">
            <X />
          </button>
        </div>

        {/* CONTEÚDO */}
        {loading && (
          <p className="text-black text-sm">Carregando orçamentos...</p>
        )}

        {!loading && budgets.length === 0 && (
          <p className="text-black">Nenhum orçamento encontrado.</p>
        )}

        <div className="space-y-3">
          {budgets.map((budget) => {
            const usado = budget.used_in_service;

            return (
              <div
                key={budget.id}
                className="border rounded-md p-4 flex justify-between items-center"
              >
                <div className="text-black text-sm space-y-1">
                  <p>
                    <strong>Orçamento:</strong> #{budget.id.slice(0, 8)}
                  </p>

                  <p>
                    <strong>Data:</strong>{" "}
                    {new Date(budget.created_at).toLocaleDateString("pt-BR")}
                  </p>

                  <ul className="list-disc ml-4 text-xs">
                    {budget.budget_items.slice(0, 3).map((item) => (
                      <li key={item.id}>{item.description}</li>
                    ))}
                    {budget.budget_items.length > 3 && (
                      <li>+ {budget.budget_items.length - 3} itens</li>
                    )}
                  </ul>

                  <p className="font-semibold">
                    Total: R$ {budget.total.toFixed(2)}
                  </p>
                </div>

                <div>
                  {usado ? (
                    <button
                      disabled
                      className="px-3 py-2 text-sm rounded-md bg-gray-300 text-black cursor-not-allowed"
                    >
                      Já utilizado
                    </button>
                  ) : (
                    <button
                      onClick={() => onRegisterService(budget.id)}
                      className="px-3 py-2 text-sm cursor-pointer rounded-md bg-black text-white hover:bg-gray-800"
                    >
                      Registrar serviço
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
