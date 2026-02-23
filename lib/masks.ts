// src/lib/masks.ts

export function maskPhone(value: string) {
  return value
    .replace(/\D/g, '')               // remove tudo que não é número
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);                    // (99) 99999-9999
}

export function maskPlate(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^([A-Z]{3})(\d)/, '$1-$2')
    .slice(0, 8);                     // ABC-1234
}