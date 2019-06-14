import { AnchorButton, Button, Divider, InputGroup, Position, Tooltip } from '@blueprintjs/core'
import _ from 'lodash'
import moment from 'moment'
import React, { Component, Fragment } from 'react'
import ReactTable from 'react-table'
import 'react-table/react-table.css'
import { Toolbar } from '~/components/Shared/Interface'

import withLanguage from '~/components/Util/withLanguage'

class ListView extends Component<Props, State> {
  private debouncedHandleSearch

  state = {
    searchTerm: '',
    checkedIds: [],
    allChecked: false,
    pageSize: 10,
    pages: 0,
    page: 0,
    filters: [],
    sortOrder: []
  }

  componentDidMount() {
    this.debouncedHandleSearch = _.debounce(() => this.launchSearch(), 1000)
  }

  handleCheckboxChanged(id) {
    const modified = this.state.checkedIds

    if (_.includes(this.state.checkedIds, id)) {
      _.pull(modified, id)
    } else {
      modified.push(id)
    }

    this.setState({
      checkedIds: modified
    })
  }

  handleAllCheckedChanged = () => {
    this.setState({ allChecked: !this.state.allChecked })

    setImmediate(() => {
      const ids = []

      if (this.state.allChecked) {
        _.forEach(this.props.contentItems, ({ id }) => {
          ids.push(id)
        })
      }

      this.setState({ checkedIds: ids })
    })
  }

  handleDeleteSelected = () => {
    if (window.confirm(`Do you really want to delete ${this.state.checkedIds.length} items?`)) {
      this.props.handleDeleteSelected(this.state.checkedIds)
      this.setState({ checkedIds: [], allChecked: false })
    }
  }

  handleCloneSelected = () => {
    this.props.handleClone(this.state.checkedIds)
    this.setState({ checkedIds: [], allChecked: false })
  }

  handleSearchChanged = event => {
    this.setState({ searchTerm: event.target.value })
    this.debouncedHandleSearch && this.debouncedHandleSearch()
  }

  launchSearch = () => {
    const searchQuery: SearchQuery = {
      from: this.state.page * this.state.pageSize,
      count: this.state.pageSize,
      sortOrder: this.state.sortOrder,
      filters: this.state.filters,
      searchTerm: this.state.searchTerm
    }

    this.props.handleSearch(searchQuery)
  }

  fetchData = state => {
    const filters = state.filtered.map(filter => {
      return { column: filter.id, value: filter.value }
    })
    const sortOrder = state.sorted.map(sort => {
      return { column: sort.id, desc: sort.desc }
    })
    const hasTextChanged = !_.isEqual(this.state.filters, filters)

    this.setState(
      {
        pageSize: state.pageSize,
        page: state.page,
        sortOrder,
        filters
      },
      () => {
        hasTextChanged ? this.debouncedHandleSearch && this.debouncedHandleSearch() : this.launchSearch()
      }
    )
  }

  renderFilterPlaceholder = placeholder => ({ filter, onChange }) => (
    <input
      type="text"
      placeholder={placeholder}
      value={filter ? filter.value : ''}
      style={{ width: '100%' }}
      onChange={event => onChange(event.target.value)}
    />
  )

  onRowClick = (state, rowInfo, column, instance) => {
    return {
      onClick: (e, handleOriginal) => {
        if (column.id !== 'checkbox' && !this.props.readOnly && rowInfo) {
          const { id, contentType } = rowInfo.original
          this.props.handleEdit(id, contentType)
        }

        if (handleOriginal) {
          handleOriginal()
        }
      }
    }
  }

  getTableColumns() {
    return [
      {
        Header: () => {
          return (
            <input
              type="checkbox"
              className="checkbox"
              checked={this.state.allChecked}
              onChange={() => this.handleAllCheckedChanged()}
            />
          )
        },
        Cell: ({ original }) => {
          const checked = _.includes(this.state.checkedIds, original.id)
          return (
            <input
              type="checkbox"
              className="checkbox"
              checked={checked}
              onChange={() => this.handleCheckboxChanged(original.id)}
            />
          )
        },
        id: 'checkbox',
        accessor: '',
        filterable: false,
        sortable: false,
        width: 35
      },
      {
        Header: 'ID',
        Cell: x => `#!${x.value}`,
        Filter: this.renderFilterPlaceholder('Filter'),
        accessor: 'id',
        width: 170
      },
      {
        Header: 'Content Type',
        Filter: this.renderFilterPlaceholder('Filter'),
        accessor: 'contentType',
        width: 150
      },
      {
        Header: 'Preview',
        accessor: 'previews',
        Filter: this.renderFilterPlaceholder('Filter'),
        Cell: x => x.original.previews && x.original.previews[this.props.contentLang]
      },
      {
        Header: 'Modified On',
        Cell: x => (x.original.modifiedOn ? moment(x.original.modifiedOn).format('MMM Do YYYY, h:mm') : 'Never'),
        accessor: 'modifiedOn',
        filterable: false,
        width: 150
      },
      {
        Header: 'Created On',
        Cell: x => (x.original.createdOn ? moment(x.original.createdOn).format('MMM Do YYYY, h:mm') : 'Never'),
        accessor: 'createdOn',
        filterable: false,
        width: 150
      },
      {
        Cell: !this.props.readOnly && <Button small={true} icon="edit" />,
        filterable: false,
        width: 45
      }
    ]
  }

  renderTable() {
    const pageCount = Math.ceil(this.props.count / this.state.pageSize)
    const noDataMessage = this.props.readOnly
      ? "There's no content here."
      : "There's no content yet. You can create some using the 'Add' button."

    return (
      <ReactTable
        columns={this.getTableColumns()}
        data={this.props.contentItems}
        onFetchData={this.fetchData}
        onPageSizeChange={(pageSize, page) => this.setState({ page, pageSize })}
        getTdProps={this.onRowClick}
        defaultPageSize={this.state.pageSize}
        defaultSorted={[{ id: 'modifiedOn', desc: true }]}
        noDataText={noDataMessage}
        className="-striped -highlight"
        pages={pageCount}
        manual
        filterable
      />
    )
  }

  render() {
    return (
      <div>
        <Toolbar>
          <Fragment>
            <Tooltip content="Refresh" position={Position.BOTTOM}>
              <AnchorButton icon="refresh" onClick={this.props.handleRefresh} />
            </Tooltip>

            <Divider />
            {!this.props.readOnly && (
              <Tooltip content="Delete selected elements" position={Position.BOTTOM}>
                <AnchorButton
                  icon="trash"
                  disabled={_.isEmpty(this.state.checkedIds)}
                  onClick={this.handleDeleteSelected}
                />
              </Tooltip>
            )}

            {!this.props.readOnly && (
              <Tooltip content="Clone selected elements" position={Position.BOTTOM}>
                <AnchorButton
                  icon="duplicate"
                  disabled={_.isEmpty(this.state.checkedIds)}
                  onClick={this.handleCloneSelected}
                />
              </Tooltip>
            )}
            <Divider />
            <InputGroup
              style={{ marginTop: 3, width: 250 }}
              placeholder="Search content"
              small={true}
              value={this.state.searchTerm}
              onChange={this.handleSearchChanged}
            />
          </Fragment>
        </Toolbar>
        <div style={{ padding: 5 }}>{this.renderTable()}</div>
      </div>
    )
  }
}
export default withLanguage(ListView)

interface Props {
  count: number
  contentItems: any
  readOnly: boolean
  contentLang: string
  handleSearch: (query: SearchQuery) => void
  handleDeleteSelected: (ids: string[]) => void
  handleClone: (ids: string[]) => void
  handleRefresh: () => void
  handleEdit: (id: string, contentType: any) => void
}

interface State {
  page: number
  pageSize: number
  allChecked: boolean
  checkedIds: string[]
  searchTerm: string
  sortOrder: any
  filters: any
}

interface SearchQuery {
  from: number
  count: number
  sortOrder: any
  filters: any
  searchTerm: string
}
