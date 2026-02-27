import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"

type BudgetPdfProps = {
  budget: any
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
  },
  title: {
    fontSize: 16,
    marginBottom: 10,
  },
  section: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1 solid #000",
    paddingBottom: 4,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 2,
  },
  colDesc: { width: "40%" },
  col: { width: "15%", textAlign: "right" },
})

/**
 * ⚠️ NÃO exportamos um componente React
 * Exportamos uma FUNÇÃO que retorna o Document
 */
export function createBudgetPdfDocument({ budget }: BudgetPdfProps) {
  const client = Array.isArray(budget.client)
    ? budget.client[0]
    : budget.client

  const vehicle = Array.isArray(budget.vehicle)
    ? budget.vehicle[0]
    : budget.vehicle

  const items = budget.budget_items ?? []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          Orçamento #{budget.id.slice(0, 8)}
        </Text>

        <View style={styles.section}>
          <Text>Cliente: {client?.name}</Text>
          <Text>
            Veículo: {vehicle?.plate} — {vehicle?.model}
          </Text>
          <Text>
            Data: {new Date(budget.created_at).toLocaleDateString("pt-BR")}
          </Text>
        </View>

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
              {item.unit_price.toFixed(2)}
            </Text>
            <Text style={styles.col}>
              {item.discount.toFixed(2)}
            </Text>
            <Text style={styles.col}>
              {item.total.toFixed(2)}
            </Text>
          </View>
        ))}

        <View style={{ marginTop: 20 }}>
          <Text>Subtotal: R$ {budget.subtotal.toFixed(2)}</Text>
          <Text>Descontos: R$ {budget.discount_total.toFixed(2)}</Text>
          <Text>Total: R$ {budget.total.toFixed(2)}</Text>
        </View>
      </Page>
    </Document>
  )
}