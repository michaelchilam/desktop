import { ComputedAction } from './computed-action'

interface IBlobResult {
  readonly mode: string
  readonly sha: string
  readonly path: string
}

export interface ICherryPickEntry {
  readonly context: string
  readonly base?: IBlobResult
  readonly result?: IBlobResult
  readonly our?: IBlobResult
  readonly their?: IBlobResult
  readonly diff: string
  readonly hasConflicts?: boolean
}

export type CherryPickSuccess = {
  readonly kind: ComputedAction.Clean
  readonly entries: ReadonlyArray<ICherryPickEntry>
}

export type CherryPickError = {
  readonly kind: ComputedAction.Conflicts
  readonly conflictedFiles: number
}

export type CherryPickUnsupported = {
  readonly kind: ComputedAction.Invalid
}

export type CherryPickLoading = {
  readonly kind: ComputedAction.Loading
}

export type CherryPickResult =
  | CherryPickSuccess
  | CherryPickError
  | CherryPickUnsupported
  | CherryPickLoading
