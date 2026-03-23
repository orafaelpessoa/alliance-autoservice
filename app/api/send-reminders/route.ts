import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function GET() {
  try {
    // 1. Buscar lembretes pendentes via função RPC
    const { data: reminders, error } = await supabaseAdmin.rpc("get_pending_reminders");
    if (error) throw error;

    if (!reminders || reminders.length === 0) {
      return NextResponse.json({ message: "Nenhum lembrete pendente" });
    }

    const agora = new Date();

    for (const reminder of reminders) {
      // Ajusta para considerar apenas a data (sem hora) para cálculo de dias
      const hoje = new Date(agora);
      hoje.setHours(0, 0, 0, 0);

      const dataServico = new Date(reminder.service_date);
      dataServico.setHours(0, 0, 0, 0);

      const diasPassados = Math.floor((hoje.getTime() - dataServico.getTime()) / (1000 * 60 * 60 * 24));

      // 2. Enviar email
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: reminder.user_email,
        subject: "Lembrete de revisão",
        html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #000;">
  <p style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">SISTEMA INTERNO ALLIANCE</p>
  <h2 style="margin-bottom: 15px;">Aviso de Revisão Preventiva Recomendada</h2>
  <p style="margin-bottom: 20px;">Já se passaram <strong>${diasPassados} dias</strong> desde a última troca de óleo.</p>
  <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
    <p><strong>Cliente:</strong> ${reminder.client_name}</p>
    <p><strong>Telefone:</strong> ${reminder.client_phone ?? "Não informado"}</p>
    <p><strong>Veículo:</strong> ${reminder.plate} - ${reminder.brand} ${reminder.model}</p>
    <p><strong>Data da última troca de óleo:</strong> ${new Date(reminder.service_date).toLocaleDateString("pt-BR")}</p>
  </div>
</div>
        `,
      });

      // 3. Marcar lembrete como notificado
      await supabaseAdmin
        .from("service_reminders")
        .update({ notified: true, notified_at: new Date().toISOString() })
        .eq("id", reminder.id);
    }

    return NextResponse.json({ success: true, total: reminders.length });
  } catch (err: any) {
    console.error("Erro ao enviar lembretes:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}