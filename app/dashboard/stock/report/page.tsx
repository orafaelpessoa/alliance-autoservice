"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Filter } from "lucide-react";

type ReportItem = {
  id: string;
  created_at: string;
  type: "in" | "out";
  quantity: number;
  reason: string;
  part_id: string;
  part_name: string;
};

export default function StockReportPage() {
  const [data, setData] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });

  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [type, setType] = useState<"all" | "in" | "out">("all");

  async function loadReport() {
    setLoading(true);

    const { data, error } = await supabase.rpc("stock_report_filtered", {
      p_start_date: startDate,
      p_end_date: endDate,
      p_type: type === "all" ? null : type,
      p_part_id: null,
    });

    if (!error && data) {
      setData(data as ReportItem[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-yellow-400 px-6 py-4 shadow">
        <h1 className="text-xl font-bold text-center text-black">
          Relatório de Estoque
        </h1>
      </header>

      <section className="max-w-6xl mx-auto mt-10 px-4">
        {/* FILTROS */}
        <div className="bg-white p-4 rounded-md shadow mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-black">
              Data inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border px-3 py-2 rounded-md text-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black">
              Data final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border px-3 py-2 rounded-md text-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black">
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="border px-3 py-2 rounded-md text-black"
            >
              <option value="all">Todos</option>
              <option value="in">Entrada</option>
              <option value="out">Saída</option>
            </select>
          </div>

          <button
            onClick={loadReport}
            className="bg-yellow-400 text-black px-4 py-2 rounded-md shadow hover:bg-yellow-300 flex items-center gap-2 cursor-pointer"
          >
            <Filter size={16} />
            Filtrar
          </button>
        </div>

        {/* TABELA */}
        <div className="bg-white rounded-md shadow overflow-x-auto">
          {loading && (
            <p className="p-4 text-sm text-black">Carregando relatório...</p>
          )}

          {!loading && data.length === 0 && (
            <p className="p-4 text-sm text-black">
              Nenhum registro encontrado
            </p>
          )}

          {!loading && data.length > 0 && (
            <table className="w-full text-sm text-black">
              <thead className="bg-gray-100 text-black">
                <tr>
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-left">Peça</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-right">Qtd</th>
                  <th className="px-4 py-2 text-left">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 font-medium uppercase">
                      {item.part_name}
                    </td>
                    <td className="px-4 py-2">
                      {item.type === "in" ? "Entrada" : "Saída"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-2">
                      {item.reason || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
