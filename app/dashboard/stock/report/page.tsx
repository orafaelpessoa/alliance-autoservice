"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Filter, Printer } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useRouter } from "next/navigation";

type ReportItem = {
  id: string;
  created_at: string;
  type: "in" | "out";
  quantity: number;
  reason: string;
  part_id: string;
  part_name: string;
  sale_price: number;
};

export default function StockReportPage() {
  const [data, setData] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [partName, setPartName] = useState("");

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

    let query = supabase
      .from("stock_movements")
      .select(`
        id,
        created_at,
        type,
        quantity,
        reason,
        part_id,
        parts!inner (
          name,
          sale_price
        )
      `)
      .order("created_at", { ascending: false });

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      query = query.lte("created_at", endDate + "T23:59:59");
    }

    if (type !== "all") {
      query = query.eq("type", type);
    }

    if (partName.trim() !== "") {
      query = query.ilike("parts.name", `%${partName}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao carregar relatório:", error);
    } else {
      setData(
        (data ?? []).map((row: any) => ({
          id: row.id,
          created_at: row.created_at,
          type: row.type,
          quantity: row.quantity,
          reason: row.reason,
          part_id: row.part_id,
          part_name: row.parts?.name ?? "—",
          sale_price: row.parts?.sale_price ?? 0,
        }))
      );
    }

    setLoading(false);
  }

  function handlePrint() {
    window.print();
  }

  useEffect(() => {
    loadReport();
  }, []);

  function formatPrice(value?: number) {
    if (!value || value <= 0) return "—";
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <main className="min-h-screen bg-gray-100 print:bg-white">
      {/* CSS de impressão */}
    <style>{`
  @media print {
    body {
      background: white;
      color: black;
      -webkit-print-color-adjust: exact;
    }

    /* Esconder elementos que não devem aparecer na impressão */
    .no-print {
      display: none !important;
    }

    /* Tabela */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      font-family: Arial, sans-serif;
      margin-top: 10px;
    }

    th, td {
      border: 1px solid #000;
      padding: 6px 8px;
    }

    thead {
      background-color: #f0f0f0 !important;
      font-weight: bold;
    }

    th {
      text-align: left;
    }

    td {
      text-align: left;
    }

    /* Colunas numéricas alinhadas à direita */
    td.text-right {
      text-align: right;
    }

    /* Cabeçalho da página e filtros escondidos */
    header, .filters, .actions {
      display: none !important;
    }

    /* Linha zebra opcional */
    tbody tr:nth-child(even) {
      background-color: #fafafa;
    }
  }
`}</style>

      <AppHeader>
        <button
          onClick={() => router.push("/dashboard/stock")}
          className="bg-black text-white px-4 py-2 rounded-md shadow hover:bg-gray-800 flex items-center gap-2 cursor-pointer no-print"
        >
          Voltar
        </button>
      </AppHeader>

      <h1 className="text-xl font-bold text-center py-7 text-black">
        Relatório de Estoque
      </h1>

      <section className="max-w-6xl mx-auto mt-10 px-4">
        {/* FILTROS */}
        <div className="bg-white p-4 rounded-md shadow mb-6 flex flex-wrap gap-4 items-end no-print">
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
              className="border px-3 py-2 rounded-md text-black cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="in">Entrada</option>
              <option value="out">Saída</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black">
              Nome da peça
            </label>
            <input
              type="text"
              placeholder="Ex: filtro de óleo"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              className="border px-3 py-2 rounded-md text-black"
            />
          </div>

          <button
            onClick={loadReport}
            className="bg-yellow-400 text-black px-4 py-2 cursor-pointer rounded-md shadow hover:bg-yellow-300 flex items-center gap-2"
          >
            <Filter size={16} />
            Filtrar
          </button>

          <button
            onClick={handlePrint}
            className="bg-gray-800 text-white px-4 py-2 cursor-pointer rounded-md shadow hover:bg-gray-700 flex items-center gap-2"
          >
            <Printer size={16} />
            Imprimir
          </button>
        </div>

        {/* TABELA */}
        <div className="bg-white rounded-md shadow overflow-x-auto print:shadow-none">
          {loading && <p className="p-4 text-sm text-black">Carregando relatório...</p>}

          {!loading && data.length === 0 && (
            <p className="p-4 text-sm text-black">Nenhum registro encontrado</p>
          )}

          {!loading && data.length > 0 && (
            <table className="w-full text-sm text-black">
              <thead className="bg-gray-100 text-black">
                <tr>
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-left">Peça</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-right">Qtd</th>
                  <th className="px-4 py-2 text-right">Preço</th>
                  <th className="px-4 py-2 text-left">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-2 font-medium uppercase">
                      {item.part_name}
                    </td>
                    <td className="px-4 py-2">
                      {item.type === "in" ? "Entrada" : "Saída"}
                    </td>
                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-right">
                      {item.sale_price > 0 ? item.sale_price.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }) : "—"}
                    </td>
                    <td className="px-4 py-2">{item.reason || "-"}</td>
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