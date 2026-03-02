"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X } from "lucide-react";

type Budget = {
  id: string;
  created_at: string;
  total: number;
  used_in_service: boolean | null;
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
      .select("id, created_at, total, used_in_service")
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
                <div className="text-black text-sm">
                  <p>
                    <strong>Data:</strong>{" "}
                    {new Date(budget.created_at).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Total:</strong> R$ {budget.total.toFixed(2)}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    {usado ? "Serviço já executado" : "Em aberto"}
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