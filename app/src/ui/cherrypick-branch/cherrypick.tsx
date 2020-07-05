import * as React from 'react'
import { Branch } from '../../models/branch'
import { Dispatcher } from '../dispatcher'
import { Repository } from '../../models/repository'
import { truncateWithEllipsis } from '../../lib/truncate-with-ellipsis'
import { CherryPickResult } from '../../models/cherrypick'
import { IMatches } from '../../lib/fuzzy-find'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  OkCancelButtonGroup,
} from '../dialog'

import { BranchList, IBranchListItem, renderDefaultBranch } from '../branches'

import { ComputedAction } from '../../models/computed-action'
// import { promiseWithMinimumTimeout } from '../../lib/promise'
// import { getAheadBehind, mergeTree } from '../../lib/git'
// import { revSymmetricDifference } from '../../lib/git'
import { ActionStatusIcon } from '../lib/action-status-icon'
import { CherryPickList } from './cherrypicklist'

interface ICherryPickProps {
  readonly dispatcher: Dispatcher
  readonly repository: Repository

  /**
   * See IBranchesState.defaultBranch
   */
  readonly defaultBranch: Branch | null

  /**
   * The currently checked out branch
   */
  readonly currentBranch: Branch

  /**
   * See IBranchesState.allBranches
   */
  readonly allBranches: ReadonlyArray<Branch>

  /**
   * See IBranchesState.recentBranches
   */
  readonly recentBranches: ReadonlyArray<Branch>

  /**
   * The branch to select when the merge dialog is opened
   */
  readonly initialBranch?: Branch

  /**
   * A function that's called when the dialog is dismissed by the user in the
   * ways described in the Dialog component's dismissable prop.
   */
  readonly onDismissed: () => void
}

interface ICherryPickState {
  /** The currently selected branch. */
  readonly selectedBranch: Branch | null

  /** The merge result of comparing the selected branch to the current branch */
  readonly mergeStatus: CherryPickResult | null

  /**
   * The number of commits that would be brought in by the merge.
   * undefined if no branch is selected or still calculating the
   * number of commits.
   */
  readonly commitCount?: number

  /** The filter text to use in the branch selector */
  readonly filterText: string
}

/** A component for Cherrypicking a branch into the current branch. */
export class CherryPick extends React.Component<
  ICherryPickProps,
  ICherryPickState
> {
  public constructor(props: ICherryPickProps) {
    super(props)

    const selectedBranch = this.resolveSelectedBranch()

    this.state = {
      selectedBranch,
      commitCount: undefined,
      filterText: '',
      mergeStatus: null,
    }
  }

  public render() {
    const selectedBranch = this.state.selectedBranch
    const currentBranch = this.props.currentBranch

    const selectedBranchIsNotCurrentBranch =
      selectedBranch === null ||
      currentBranch === null ||
      currentBranch.name === selectedBranch.name

    const invalidBranchState =
      selectedBranchIsNotCurrentBranch || this.state.commitCount === 0

    const disabled = invalidBranchState

    // the amount of characters to allow before we truncate was chosen arbitrarily
    const currentBranchName = truncateWithEllipsis(
      this.props.currentBranch.name,
      40
    )

    return (
      <Dialog
        id="cherry-pick"
        onDismissed={this.props.onDismissed}
        onSubmit={this.cherryPick}
        title={
          <>
            Cherry-pick into <strong>{currentBranchName}</strong>
          </>
        }
      >
        <DialogContent>
          <BranchList
            allBranches={this.props.allBranches}
            currentBranch={currentBranch}
            defaultBranch={this.props.defaultBranch}
            recentBranches={this.props.recentBranches}
            filterText={this.state.filterText}
            onFilterTextChanged={this.onFilterTextChanged}
            selectedBranch={selectedBranch}
            onSelectionChanged={this.onSelectionChanged}
            canCreateNewBranch={false}
            renderBranch={this.renderBranch}
          />
          <CherryPickList />
        </DialogContent>
        <DialogFooter>
          {this.renderMergeInfo()}
          <OkCancelButtonGroup
            okButtonText={
              <>
                Cherry-pick{' '}
                <strong>{selectedBranch ? selectedBranch.name : ''}</strong>{' '}
                into <strong>{currentBranch ? currentBranch.name : ''}</strong>
              </>
            }
            okButtonDisabled={disabled}
            cancelButtonVisible={false}
          />
        </DialogFooter>
      </Dialog>
    )
  }

  private renderMergeInfo() {
    const { currentBranch } = this.props
    const { selectedBranch, mergeStatus, commitCount } = this.state

    if (
      mergeStatus == null ||
      currentBranch == null ||
      selectedBranch == null ||
      currentBranch.name === selectedBranch.name ||
      commitCount == null
    ) {
      return null
    }

    return (
      <div className="merge-status-component">
        <ActionStatusIcon
          status={this.state.mergeStatus}
          classNamePrefix="merge-status"
        />
        <p className="merge-info">
          {this.renderMergeStatusMessage(
            mergeStatus,
            selectedBranch,
            currentBranch,
            commitCount
          )}
        </p>
      </div>
    )
  }

  private renderMergeStatusMessage(
    mergeStatus: CherryPickResult,
    branch: Branch,
    currentBranch: Branch,
    commitCount: number
  ): JSX.Element {
    if (mergeStatus.kind === ComputedAction.Loading) {
      return this.renderLoadingMergeMessage()
    }

    if (mergeStatus.kind === ComputedAction.Clean) {
      return this.renderCleanMergeMessage(branch, currentBranch, commitCount)
    }

    if (mergeStatus.kind === ComputedAction.Invalid) {
      return this.renderInvalidMergeMessage()
    }

    return this.renderConflictedMergeMessage(
      branch,
      currentBranch,
      mergeStatus.conflictedFiles
    )
  }

  private renderLoadingMergeMessage() {
    return (
      <React.Fragment>
        Checking for ability to merge automatically...
      </React.Fragment>
    )
  }

  private renderCleanMergeMessage(
    branch: Branch,
    currentBranch: Branch,
    commitCount: number
  ) {
    if (commitCount === 0) {
      return (
        <React.Fragment>
          {`This branch is up to date with `}
          <strong>{branch.name}</strong>
        </React.Fragment>
      )
    }

    const pluralized = commitCount === 1 ? 'commit' : 'commits'
    return (
      <React.Fragment>
        This will merge
        <strong>{` ${commitCount} ${pluralized}`}</strong>
        {` from `}
        <strong>{branch.name}</strong>
        {` into `}
        <strong>{currentBranch.name}</strong>
      </React.Fragment>
    )
  }

  private renderInvalidMergeMessage() {
    return (
      <React.Fragment>
        Unable to merge unrelated histories in this repository
      </React.Fragment>
    )
  }

  private renderConflictedMergeMessage(
    branch: Branch,
    currentBranch: Branch,
    count: number
  ) {
    const pluralized = count === 1 ? 'file' : 'files'
    return (
      <React.Fragment>
        There will be
        <strong>{` ${count} conflicted ${pluralized}`}</strong>
        {` when merging `}
        <strong>{branch.name}</strong>
        {` into `}
        <strong>{currentBranch.name}</strong>
      </React.Fragment>
    )
  }

  /**
   * Returns the branch to use as the selected branch
   *
   * The initial branch is used if passed
   * otherwise, the default branch will be used iff it's
   * not the currently checked out branch
   */
  private resolveSelectedBranch() {
    const { currentBranch, defaultBranch, initialBranch } = this.props

    if (initialBranch !== undefined) {
      return initialBranch
    }

    return currentBranch === defaultBranch ? null : defaultBranch
  }

  private cherryPick = () => {
    // const branch = this.state.selectedBranch
    // if (!branch) {
    //   return
    // }
    // this.props.dispatcher.mergeBranch(
    //   this.props.repository,
    //   branch.name,
    //   this.state.mergeStatus
    // )
    this.props.dispatcher.closePopup()
  }

  private onFilterTextChanged = (filterText: string) => {
    this.setState({ filterText })
  }

  private onSelectionChanged = async (selectedBranch: Branch | null) => {
    if (selectedBranch != null) {
      this.setState({ selectedBranch })
      await this.updateMergeStatus(selectedBranch)
    } else {
      this.setState({ selectedBranch, commitCount: 0, mergeStatus: null })
    }
  }

  private renderBranch = (item: IBranchListItem, matches: IMatches) => {
    return renderDefaultBranch(item, matches, this.props.currentBranch)
  }

  private async updateMergeStatus(branch: Branch) {
    // this.setState({ mergeStatus: { kind: ComputedAction.Loading } })
    // const { currentBranch } = this.props
    // if (currentBranch != null) {
    //   const mergeStatus = await promiseWithMinimumTimeout(
    //     () => mergeTree(this.props.repository, currentBranch, branch),
    //     500
    //   )
    //   this.setState({ mergeStatus })
    // }
    // const range = revSymmetricDifference('', branch.name)
    // const aheadBehind = await getAheadBehind(this.props.repository, range)
    // const commitCount = aheadBehind ? aheadBehind.behind : 0
    // if (this.state.selectedBranch !== branch) {
    //   // The branch changed while we were waiting on the result of `getAheadBehind`.
    //   this.setState({ commitCount: undefined })
    // } else {
    //   this.setState({ commitCount })
    // }
  }
}
