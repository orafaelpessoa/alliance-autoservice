"use client";

import { useState } from "react";

type Part = {
  id: string;
  name: string;
  sale_price: number;
  quantity: number;
};

type Props = {
  parts: Part[];
  onSelect: (part: Part) => void;
  onClose: () => void;
};

export default function PartPickerModal({ parts, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");

  const filtered = parts.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-lg shadow p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-black">Selecionar peça</h2>

          <button onClick={onClose} className="text-gray-500 cursor-pointer">
            ✕
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar peça..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-3 py-2 border rounded text-black"
        />

        <ul className="max-h-64 overflow-y-auto border rounded divide-y">
          {filtered.map((part) => {
            const isUnavailable = part.quantity <= 0;

            return (
              <li
                key={part.id}
                onClick={() => {
                  if (isUnavailable) return;
                  onSelect(part);
                  onClose();
                }}
                className={`px-4 py-3 text-black ${
                  isUnavailable
                    ? "cursor-not-allowed bg-gray-50 opacity-60"
                    : "cursor-pointer hover:bg-gray-100"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{part.name}</div>
                    <div className="text-sm text-gray-600">
                      R$ {part.sale_price.toFixed(2)}
                    </div>
                  </div>

                  <div className="text-sm text-gray-500 text-right">
                    {part.quantity > 0 ? (
                      <span>{part.quantity} disponíveis</span>
                    ) : (
                      <span className="italic">indisponível</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}

          {filtered.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-500">
              Nenhuma peça encontrada
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
