import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qjivdcqpnyofyvqbkfoq.supabase.co'
const supabaseAnonKey = 'sb_publishable_oxZINjvXoJ-_-L5yGHZZBw_RkOAWrYb'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
