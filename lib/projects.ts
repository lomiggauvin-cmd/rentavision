import { supabase } from './supabase'
import { AnalysisResult, PropertyInputs } from './taxCalculator'

export interface SavedProject {
  id: string
  user_id: string
  title: string
  inputs: PropertyInputs
  results: AnalysisResult
  created_at: string
  updated_at: string
}

export async function saveProject(
  userId: string,
  title: string,
  inputs: PropertyInputs,
  results: AnalysisResult
) {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      title,
      inputs,
      results,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  return { data, error }
}

export async function getUserProjects(userId: string): Promise<SavedProject[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function deleteProject(projectId: string, userId: string) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId)

  return { error }
}

export async function updateProjectTitle(projectId: string, userId: string, title: string) {
  const { data, error } = await supabase
    .from('projects')
    .update({ 
      title,
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .single()

  return { data, error }
}
