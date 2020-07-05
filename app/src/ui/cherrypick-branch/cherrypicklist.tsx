import * as React from 'react'

interface ICherryPickListProps {}

interface ICherryPickListState {}

export class CherryPickList extends React.Component<
  ICherryPickListProps,
  ICherryPickListState
> {
  public constructor(props: ICherryPickListProps) {
    super(props)
  }

  public render() {
    return (
      <div id="cherrypick-list">
        <h2>CHERRY-PICK LIST</h2>
      </div>
    )
  }
}
