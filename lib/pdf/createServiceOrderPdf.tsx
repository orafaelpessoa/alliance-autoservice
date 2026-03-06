import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer"
import React from "react"

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderBottom: "1 solid #000",
    paddingBottom: 10,
  },

  headerLogo: {
    width: 110,
    height: 60,
    marginRight: 12,
  },

  headerText: {
    flexGrow: 1,
  },

  companyName: {
    fontSize: 14,
    fontWeight: "bold",
  },

  companyInfo: {
    fontSize: 9,
    marginTop: 2,
  },

  watermark: {
    position: "absolute",
    top: "15%",
    left: "0%",
    width: 500,
    opacity: 0.07,
  },

  title: {
    fontSize: 14,
    marginBottom: 12,
    marginTop: 10,
    fontWeight: "bold",
  },

  section: {
    marginBottom: 12,
  },

  tableHeader: {
    flexDirection: "row",
    borderBottom: "1 solid #000",
    paddingBottom: 4,
    marginBottom: 4,
    marginTop: 10,
    fontWeight: "bold",
  },

  row: {
    flexDirection: "row",
    marginBottom: 2,
  },

  colDesc: {
    width: "40%",
  },

  col: {
    width: "15%",
    textAlign: "right",
  },

  summary: {
    marginTop: 20,
    paddingTop: 10,
    borderTop: "1 solid #000",
    alignItems: "flex-end",
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "45%",
    marginBottom: 2,
  },

  total: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
  },
})

function ServiceOrderPdfDocument({ serviceOrder }: { serviceOrder: any }) {
  const items = serviceOrder.service_order_items ?? []

  const totalParts = items
    .filter((i: any) => i.type === "part")
    .reduce((sum: number, i: any) => sum + i.total, 0)

  const totalLabor = items
    .filter((i: any) => i.type === "service")
    .reduce((sum: number, i: any) => sum + i.total, 0)

  const subtotal = totalParts + totalLabor

  const totalDiscount = items.reduce(
    (sum: number, i: any) => sum + (i.discount ?? 0),
    0
  )

  const totalFinal = subtotal - totalDiscount

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* WATERMARK */}
        <Image
          src="/assets/LOGO_ALLIANCE.png"
          style={styles.watermark}
        />

        {/* HEADER */}
        <View style={styles.header}>
          <Image
            src="/assets/LOGO_ALLIANCE.png"
            style={styles.headerLogo}
          />

          <View style={styles.headerText}>
            <Text style={styles.companyName}>
              Alliance Auto Service Oficina Mecânica
            </Text>
            <Text style={styles.companyInfo}>
              Rua Josias Barbosa Ferreira, 35
            </Text>
            <Text style={styles.companyInfo}>
              Telefone / WhatsApp: (83) 98818-2412
            </Text>
          </View>
        </View>

        {/* TITLE */}
        <Text style={styles.title}>
          Ordem de Serviço #{serviceOrder.id.slice(0, 8)}
        </Text>

        {/* CLIENT / VEHICLE */}
        <View style={styles.section}>
          <Text>Cliente: {serviceOrder.client.name}</Text>
          <Text>
            Veículo: {serviceOrder.vehicle.plate} —{" "}
            {serviceOrder.vehicle.model}
          </Text>
          <Text>
            Data:{" "}
            {new Date(serviceOrder.created_at).toLocaleDateString("pt-BR")}
          </Text>
        </View>

        {/* TABLE */}
        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Descrição</Text>
          <Text style={styles.col}>Qtd</Text>
          <Text style={styles.col}>Preço</Text>
          <Text style={styles.col}>Desc.</Text>
          <Text style={styles.col}>Total</Text>
        </View>

        {items.map((item: any) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.colDesc}>{item.description}</Text>
            <Text style={styles.col}>{item.quantity}</Text>
            <Text style={styles.col}>
              R$ {item.unit_price.toFixed(2)}
            </Text>
            <Text style={styles.col}>
              R$ {(item.discount ?? 0).toFixed(2)}
            </Text>
            <Text style={styles.col}>
              R$ {item.total.toFixed(2)}
            </Text>
          </View>
        ))}

        {/* SUMMARY */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text>Total Peças</Text>
            <Text>R$ {totalParts.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text>Total Mão de Obra</Text>
            <Text>R$ {totalLabor.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text>Subtotal</Text>
            <Text>R$ {subtotal.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text>Descontos</Text>
            <Text>R$ {totalDiscount.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.total}>Total</Text>
            <Text style={styles.total}>
              R$ {totalFinal.toFixed(2)}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

/**
 * Função usada pelo client
 */
export async function createServiceOrderPdfBlob(
  serviceOrder: any
): Promise<Blob> {
  const doc = <ServiceOrderPdfDocument serviceOrder={serviceOrder} />
  return await pdf(doc).toBlob()
}