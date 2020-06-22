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
    console.log(props.allBranches.length)

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
        id="cherrypick"
        onDismissed={this.props.onDismissed}
        onSubmit={this.cherryPick}
        title={
          <>
            Cherrypick into <strong>{currentBranchName}</strong>
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
        </DialogContent>
        <DialogFooter>
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
