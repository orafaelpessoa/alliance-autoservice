"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  open: boolean;
  partId: string;
  type: "in" | "out";
  onClose: () => void;
  onSuccess: () => void;
};

export default function StockMovementModal({
  open,
  partId,
  type,
  onClose,
  onSuccess,
}: Props) {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleMove() {
    if (quantity < 1) return;

    setLoading(true);

    const { error } = await supabase.rpc("move_stock", {
      p_part_id: partId,
      p_quantity: quantity,
      p_reason: reason || (type === "in" ? "Entrada inicial" : "Saída"),
      p_type: type,
    });

    if (!error) {
      onSuccess();
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4 text-black">
          {type === "in" ? "Entrada de estoque" : "Saída de estoque"}
        </h2>

        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full border px-3 py-2 rounded-md mb-3 text-black"
        />

        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (opcional)"
          className="w-full border px-3 py-2 rounded-md mb-4 text-black"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-red-500 text-white cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleMove}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-green-600 text-white cursor-pointer hover:bg-green-500"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
