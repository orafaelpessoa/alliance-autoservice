"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { maskPhone, maskPlate } from "@/lib/masks";

type Client = {
  id: string;
  name: string;
  phone: string | null;
};

type Vehicle = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: string;
  client: Client | null;
};

// ... (Tipos Budget e ServiceOrder permanecem iguais)
type BudgetItem = { id: string; description: string; };
type Budget = { id: string; created_at: string; total: number; status: string; budget_items: BudgetItem[]; };
type ServiceOrder = { id: string; created_at: string; budget_id: string; total: number; status: string; budgets: { total: number; budget_items: { id: string; description: string; }[]; } | null; };

export default function VehiclePage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [services, setServices] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBudgetsModal, setShowBudgetsModal] = useState(false);

  // ESTADOS PARA EDIÇÃO
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [editMode, setEditMode] = useState<"existing" | "new">("existing");
  
  const [editForm, setEditForm] = useState({
    plate: "",
    brand: "",
    model: "",
    year: "",
    selectedClientId: "", // Para modo 'existing'
    newClientName: "",    // Para modo 'new'
    newClientPhone: "",   // Para modo 'new'
  });

  useEffect(() => {
    if (!vehicleId) return;
    loadAll();
    loadAllClients();
  }, [vehicleId]);

  async function loadAllClients() {
    const { data } = await supabase.from("clients").select("*").order("name");
    if (data) setAllClients(data);
  }

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadVehicle(), loadBudgets(), loadServices()]);
    setLoading(false);
  }

  async function loadVehicle() {
    const { data } = await supabase
      .from("vehicles")
      .select(`id, plate, brand, model, year, client:clients ( id, name, phone )`)
      .eq("id", vehicleId)
      .single();

    if (!data) return;
    setVehicle({
      ...data,
      year: String(data.year),
      client: Array.isArray(data.client) ? data.client[0] : (data.client as any),
    });
  }

  // ... (Funções loadBudgets e loadServices permanecem as mesmas)
  async function loadBudgets() {
    const { data } = await supabase.from("budgets").select(`id, created_at, total, status, budget_items ( id, description )`).eq("vehicle_id", vehicleId).order("created_at", { ascending: false });
    if (data) setBudgets(data);
  }

  async function loadServices() {
    const { data } = await supabase.from("service_orders").select(`id, created_at, budget_id, total, status, budgets ( total, budget_items ( id, description ) )`).eq("vehicle_id", vehicleId).neq("status", "canceled").order("created_at", { ascending: false });
    if (data) setServices(data.map((item: any) => ({ ...item, budgets: Array.isArray(item.budgets) ? item.budgets[0] : item.budgets })));
  }

  function openEditModal() {
    if (!vehicle) return;
    setEditMode("existing");
    setEditForm({
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      selectedClientId: vehicle.client?.id || "",
      newClientName: "",
      newClientPhone: "",
    });
    setShowEditModal(true);
  }

  async function handleSaveEdit(e: FormEvent) {
  e.preventDefault();

  if (!vehicle) return;

  setSavingEdit(true);

  try {
    let finalClientId = editForm.selectedClientId;

    // 1. Se estiver criando um novo cliente
    if (editMode === "new") {
      if (!editForm.newClientName.trim()) {
        throw new Error("Nome do cliente é obrigatório");
      }

      const { data: newClient, error: newClientError } = await supabase
        .from("clients")
        .insert({
          name: editForm.newClientName.trim(),
          phone: editForm.newClientPhone.trim() || null,
        })
        .select("id")
        .single();

      if (newClientError) throw newClientError;

      finalClientId = newClient.id;
    }

    // 2. Atualiza o veículo com o client_id escolhido
   const { data, error } = await supabase
  .from("vehicles")
  .update({
    plate: editForm.plate.trim().toUpperCase(),
    brand: editForm.brand.trim(),
    model: editForm.model.trim(),
    year: String(editForm.year).trim(),
    client_id: finalClientId,
  })
  .eq("id", vehicle.id)
  .select();

if (error) throw error;

    // 3. Recarrega os dados completos do veículo.
    // IMPORTANTE: usamos loadVehicle(), que já trata corretamente
    // o relacionamento client:clients e normaliza Array -> objeto.
    await loadVehicle();

    // 4. Atualiza a lista de clientes caso um novo cliente tenha sido criado
    await loadAllClients();

    // 5. Fecha o modal
    setShowEditModal(false);

    // 6. Mensagem de sucesso
    alert("Alterações salvas com sucesso!");
  } catch (err: any) {
    console.error("Erro detalhado:", err);

    if (err.code === "23505") {
      alert("Já existe um cliente com esse nome.");
      return;
    }

    alert("Erro ao salvar: " + (err.message || "Verifique o console."));
  } finally {
    setSavingEdit(false);
  }
}

  // ... (Outras funções de deletar orçamento e formatar dinheiro)
  const handleDeleteBudget = async (id: string) => {
    if (!confirm("Deseja realmente deletar este orçamento?")) return;
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (!error) setBudgets((prev) => prev.filter((b) => b.id !== id));
  };
  function formatMoney(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
  async function handleRegisterService(bid: string) { /* ...mesma lógica de antes... */ }

  const usedBudgetIds = services.map((s) => s.budget_id);

  if (loading || !vehicle) return <div className="p-8 text-center text-black">Carregando...</div>;

  return (
    <main className="min-h-screen bg-gray-100 text-black">
      <AppHeader />
      
      {/* INFO DISPLAY */}
      <section className="max-w-5xl mx-auto mt-8 space-y-6 px-4 pb-10">
        <div className="bg-white p-6 rounded-md shadow">
          <h2 className="text-lg font-semibold mb-2">Informações do Veículo</h2>
          <p><strong>Placa:</strong> {vehicle.plate}</p>
          <p><strong>Modelo:</strong> {vehicle.brand} {vehicle.model}</p>
          <p><strong>Ano:</strong> {vehicle.year}</p>
        </div>

        <div className="bg-white p-6 rounded-md shadow">
          <h2 className="text-lg font-semibold mb-2">Cliente Vinculado</h2>
          {vehicle.client ? (
            <p><strong>Nome:</strong> {vehicle.client.name} <br/> <strong>Fone:</strong> {vehicle.client.phone || "N/A"}</p>
          ) : <p>Nenhum cliente.</p>}
        </div>

        <div className="flex gap-3 flex-wrap">
           <button onClick={() => router.push(`/dashboard/budgets/new?vehicleId=${vehicle.id}`)} className="bg-yellow-300 px-4 py-2 rounded-md hover:bg-yellow-400 font-medium cursor-pointer">Fazer Orçamento</button>
           <button onClick={() => setShowBudgetsModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium cursor-pointer">Ver Orçamentos</button>
           <button onClick={() => setShowModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium cursor-pointer">Registrar Serviço</button>
           <button onClick={openEditModal} className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-black font-medium cursor-pointer">Editar Informações</button>
        </div>

        {/* LISTA DE SERVIÇOS (mantida como o seu código anterior) */}
        <div className="bg-white p-6 rounded-md shadow">
           <h2 className="text-lg font-semibold mb-4">Serviços Executados</h2>
           {services.length === 0 && <p className="text-sm">Nenhum serviço.</p>}
           {services.map(s => s.budgets && (
             <div key={s.id} className="border-b py-4 flex justify-between items-center">
               <div>
                 <p className="font-bold text-blue-700">OS #{s.id.slice(0,8)}</p>
                 <p className="text-xs text-gray-500">{new Date(s.created_at).toLocaleDateString()}</p>
                 <p className="text-sm">{formatMoney(s.total)}</p>
               </div>
               <button onClick={() => router.push(`/dashboard/service-orders/${s.id}`)} className="text-sm border px-3 py-1 rounded hover:bg-gray-50 cursor-pointer">Ver OS</button>
             </div>
           ))}
        </div>
      </section>

      {/* MODAL EDIÇÃO INTEGRADO COM SUA LÓGICA DE CADASTRO */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 border-b pb-2">Editar Veículo e Cliente</h3>
            
            <form onSubmit={handleSaveEdit} className="space-y-6">
              {/* DADOS VEÍCULO */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold mb-1">Placa</label>
                  <input value={editForm.plate} onChange={e => setEditForm({...editForm, plate: maskPlate(e.target.value)})} className="w-full border p-2 rounded" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold mb-1">Ano</label>
                  <input value={editForm.year} onChange={e => setEditForm({...editForm, year: e.target.value})} className="w-full border p-2 rounded" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold mb-1">Marca</label>
                  <input value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} className="w-full border p-2 rounded" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold mb-1">Modelo</label>
                  <input value={editForm.model} onChange={e => setEditForm({...editForm, model: e.target.value})} className="w-full border p-2 rounded" />
                </div>
              </div>

              <hr />

              {/* SELEÇÃO DE CLIENTE (Lógica que você enviou) */}
              <div>
                <label className="block text-sm font-bold mb-3">Vínculo do Cliente</label>
                <div className="inline-flex rounded-md border overflow-hidden mb-4">
                  <button type="button" onClick={() => setEditMode("existing")} className={`px-4 py-2 transition ${editMode === "existing" ? "bg-yellow-300" : "bg-white"}`}>Existente</button>
                  <button type="button" onClick={() => setEditMode("new")} className={`px-4 py-2 transition ${editMode === "new" ? "bg-yellow-300" : "bg-white"}`}>Novo Cliente</button>
                </div>

                {editMode === "existing" ? (
                  <select 
                    value={editForm.selectedClientId} 
                    onChange={e => setEditForm({...editForm, selectedClientId: e.target.value})}
                    className="w-full border p-2 rounded"
                  >
                    <option value="">Selecione...</option>
                    {allClients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="Nome completo" value={editForm.newClientName} onChange={e => setEditForm({...editForm, newClientName: e.target.value})} className="w-full border p-2 rounded" />
                    <input placeholder="Telefone" value={editForm.newClientPhone} onChange={e => setEditForm({...editForm, newClientPhone: maskPhone(e.target.value)})} className="w-full border p-2 rounded" />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <button type="button" onClick={() => setShowEditModal(false)} className="bg-gray-100 px-6 py-2 rounded font-bold cursor-pointer">Cancelar</button>
                <button type="submit" disabled={savingEdit} className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 cursor-pointer disabled:opacity-50">
                  {savingEdit ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ORÇAMENTOS (Mesma lógica do seu b.id) */}
      {showBudgetsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl shadow-xl">
             <h3 className="text-lg font-bold mb-4">Orçamentos do Veículo</h3>
             <div className="max-h-96 overflow-y-auto space-y-2">
               {budgets.map(b => (
                 <div key={b.id} className="border p-3 flex justify-between items-center rounded bg-gray-50">
                   <div>
                     <p className="font-bold">#{b.id.slice(0,8)} - {formatMoney(b.total)}</p>
                     <p className="text-xs text-gray-500">{new Date(b.created_at).toLocaleDateString()}</p>
                   </div>
                   <div className="flex gap-2">
                    <button onClick={() => router.push(`/dashboard/budgets/${b.id}`)} className="bg-black text-white px-3 py-1 rounded text-sm cursor-pointer">Abrir</button>
                    <button 
                      disabled={usedBudgetIds.includes(b.id) || b.status === 'converted'} 
                      onClick={() => handleDeleteBudget(b.id)} 
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm disabled:opacity-30 cursor-pointer"
                    >
                      Excluir
                    </button>
                   </div>
                 </div>
               ))}
             </div>
             <button onClick={() => setShowBudgetsModal(false)} className="mt-4 w-full bg-gray-200 py-2 rounded font-bold cursor-pointer">Fechar</button>
          </div>
        </div>
      )}
    </main>
  );
}