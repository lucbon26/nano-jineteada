import { createClient } from "@supabase/supabase-js";
export function supaAnon(){ return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); }
export function supaService(){ return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); }
export const tables = {
  jinetes: process.env.DB_TABLE_JINETES || "jinetes",
  sedes: process.env.DB_TABLE_SEDES || "sedes",
  categorias: process.env.DB_TABLE_CATEGORIAS || "categorias",
  horsesCat: process.env.DB_TABLE_EVENT_HORSES_CAT || "event_horses_cat",
  sorteos: process.env.DB_TABLE_SORTEOS || "sorteos",
  emparejamientos: process.env.DB_TABLE_EMPAREJAMIENTOS || "emparejamientos",
};