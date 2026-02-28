"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  open: boolean;
  part: {
    id: string;
    name: string;
    cost: number;
    sale_price: number;
  };
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditPartPriceModal({
  open,
  part,
  onClose,
  onSuccess,
}: Props) {
  const [cost, setCost] = useState<number | "">(part.cost);
  const [salePrice, setSalePrice] = useState<number | "">(part.sale_price);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCost(part.cost);
      setSalePrice(part.sale_price);
      setError(null);
      setLoading(false);
    }
  }, [open, part]);

  if (!open) return null;

  const hasMarginWarning =
    cost !== "" && salePrice !== "" && salePrice < cost;

  async function handleSave() {
    if (loading) return;

    if (cost === "" || salePrice === "") {
      setError("Preencha todos os campos.");
      return;
    }

    if (cost <= 0 || salePrice <= 0) {
      setError("Os valores devem ser maiores que zero.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase
      .from("parts")
      .update({
        cost,
        sale_price: salePrice,
      })
      .eq("id", part.id);

    if (error) {
      setError("Erro ao atualizar preços.");
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-1 text-black">
          Editar preços
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          {part.name}
        </p>

        {/* PREÇO DE CUSTO */}
        <div className="mb-3">
          <label className="text-sm font-medium text-black">
            Preço de custo (interno)
          </label>
          <input
            type="number"
            min={0.01}
            step="0.01"
            value={cost}
            onChange={(e) =>
              setCost(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-full border px-3 py-2 rounded-md mt-1 text-black"
          />
        </div>

        {/* PREÇO DE VENDA */}
        <div className="mb-2">
          <label className="text-sm font-medium text-black">
            Preço de venda (cliente)
          </label>
          <input
            type="number"
            min={0.01}
            step="0.01"
            value={salePrice}
            onChange={(e) =>
              setSalePrice(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-full border px-3 py-2 rounded-md mt-1 text-black"
          />
        </div>

        {hasMarginWarning && (
          <p className="text-sm text-yellow-700 mb-2">
            ⚠️ O preço de venda está menor que o custo.
          </p>
        )}

        <p className="text-xs text-gray-500 mb-4">
          Alterações de preço não afetam orçamentos já criados.
        </p>

        {error && (
          <p className="text-sm text-red-600 mb-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-red-500 text-white cursor-pointer disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-yellow-400 text-black cursor-pointer hover:bg-yellow-300 disabled:opacity-60"
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}