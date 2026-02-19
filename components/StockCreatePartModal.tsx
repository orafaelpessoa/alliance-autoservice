"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (partId: string) => void;
};

export default function StockCreatePartModal({
  open,
  onClose,
  onSuccess,
}: Props) {

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleCreate() {
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("parts")
      .insert({ name })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        setError("Esta peça já está cadastrada.");
      } else {
        setError("Erro ao cadastrar peça.");
      }
      setLoading(false);
      return;
    }

    onSuccess(data.id);
    setName("");
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4 text-black">
          Nova peça
        </h2>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da peça"
          className="w-full border px-3 py-2 rounded-md mb-2 text-black"
        />

        {error && (
          <p className="text-sm text-red-600 mb-2">{error}</p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-red-500 text-white cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-yellow-400 text-black cursor-pointer hover:bg-yellow-300"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
