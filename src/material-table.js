/* eslint-disable no-unused-vars */
import { Table, TableFooter, TableRow, LinearProgress } from '@material-ui/core';
import DoubleScrollbar from "react-double-scrollbar";
import * as React from 'react';
import { MTablePagination, MTableSteppedPagination } from './components';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import DataManager from './utils/data-manager';
import { debounce } from 'debounce';
import { useWindowSize } from './utils/use-window-size';
/* eslint-enable no-unused-vars */

let tableCounter = 1;

export default class MaterialTable extends React.Component {
  dataManager = new DataManager();
  constructor(props) {
    super(props);

    this.id = `m_table_${tableCounter++}`;

    const calculatedProps = this.getProps(props);
    this.setDataManagerFields(calculatedProps);
    const renderState = this.dataManager.getRenderState();

    this.state = {
      data: [],
      ...renderState,
      query: {
        filters: renderState.columns
          .filter(a => a.tableData.filterValue)
          .map(a => ({
            column: a,
            operator: "=",
            value: a.tableData.filterValue
          })),
        orderBy: renderState.columns.find(a => a.tableData.id === renderState.orderBy),
        orderDirection: renderState.orderDirection,
        page: 0,
        pageSize: calculatedProps.options.pageSize,
        search: renderState.searchText,

        totalCount: 0
      },
      showAddRow: false,
      isDragged: false,
      tableBodyVersion: 0,
    };
  }

  componentDidMount() {
    this.setState(this.dataManager.getRenderState(), () => {
      if (this.isRemoteData()) {
        this.onQueryChange(this.state.query);
      }
    });
  }

  setDataManagerFields(props, prevProps) {
    let defaultSortColumnIndex = -1;
    let defaultSortDirection = '';
    if (props) {
      defaultSortColumnIndex = props.columns.findIndex(a => a.defaultSort);
      defaultSortDirection = defaultSortColumnIndex > -1 ? props.columns[defaultSortColumnIndex].defaultSort : '';
    }

    this.dataManager.setColumns(props.columns);
    this.dataManager.setDefaultExpanded(props.options.defaultExpanded);
    this.dataManager.setAggregateChilds(props.options.aggregateChilds);
    this.dataManager.setFilterChilds(props.options.filterChilds);
    this.dataManager.setSortChilds(props.options.sortChilds);

    if (this.isRemoteData(props)) {
      this.dataManager.changeApplySearch(false);
      this.dataManager.changeApplyFilters(false);
    }
    else {
      this.dataManager.changeApplySearch(true);
      this.dataManager.changeApplyFilters(true);
      this.dataManager.setData(props.data);
    }
    const isInit = !prevProps || prevProps.name !== props.name;

    isInit && this.dataManager.changeOrder(defaultSortColumnIndex, defaultSortDirection);
    isInit && this.dataManager.changeCurrentPage(props.options.initialPage ? props.options.initialPage : 0);
    isInit && this.dataManager.changePageSize(props.options.pageSize);
    isInit && this.dataManager.changePaging(props.options.paging);
    isInit && this.dataManager.changeParentFunc(props.parentChildData);
    this.dataManager.changeDetailPanelType(props.options.detailPanelType);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const props = this.getProps(nextProps);
    this.setDataManagerFields(props, this.getProps());
    this.setState({ ...this.dataManager.getRenderState(), tableBodyVersion: this.state.tableBodyVersion + 1 });
  }

  getProps(props) {
    const calculatedProps = { ...(props || this.props) };

    const localization = calculatedProps.localization.body;

    calculatedProps.actions = [...(calculatedProps.actions || [])];
    if (calculatedProps.editable) {
      if (calculatedProps.editable.onRowAdd) {
        calculatedProps.actions.push({
          icon: calculatedProps.icons.Add,
          tooltip: localization.addTooltip,
          isFreeAction: true,
          onClick: () => {
            if (this.props.onClickActionButton) {
              this.props.onClickActionButton('addStart');
            }
            this.dataManager.changeRowEditing();
            this.setState({
              ...this.dataManager.getRenderState(),
              showAddRow: !this.state.showAddRow
            });
          }
        });
      }
      if (calculatedProps.editable.onRowUpdate) {
        calculatedProps.actions.push(rowData => ({
          icon: calculatedProps.icons.Edit,
          tooltip: localization.editTooltip,
          disabled: calculatedProps.editable.isEditable && !calculatedProps.editable.isEditable(rowData),
          onClick: (e, rowData) => {
            if (this.dataManager.lastEditingRow) {
              return;
            }
            if (this.props.onClickActionButton) {
              this.props.onClickActionButton('updateStart', rowData);
            }
            this.dataManager.changeRowEditing(rowData, "update");
            this.setState({
              ...this.dataManager.getRenderState(),
              showAddRow: false
            });
          }
        }));
      }
      if (calculatedProps.editable.onRowDelete) {
        calculatedProps.actions.push(rowData => ({
          icon: calculatedProps.icons.Delete,
          tooltip: localization.deleteTooltip,
          disabled: calculatedProps.editable.isDeletable && !calculatedProps.editable.isDeletable(rowData),
          onClick: (e, rowData) => {
            if (this.dataManager.lastEditingRow) {
              return;
            }
            if (this.props.onClickActionButton) {
              this.props.onClickActionButton('deleteStart', rowData);
            }
            this.dataManager.changeRowEditing(rowData, "delete");
            this.setState({
              ...this.dataManager.getRenderState(),
              showAddRow: false
            });
          }
        }));
      }
    }

    calculatedProps.components = { ...MaterialTable.defaultProps.components, ...calculatedProps.components };
    calculatedProps.icons = { ...MaterialTable.defaultProps.icons, ...calculatedProps.icons };
    calculatedProps.options = { ...MaterialTable.defaultProps.options, ...calculatedProps.options };

    return calculatedProps;
  }

  isRemoteData = (props) => !Array.isArray((props || this.props).data)

  onAllSelected = (checked) => {
    this.dataManager.changeAllSelected(checked);
    this.setState({ ...this.dataManager.getRenderState(), tableBodyVersion: this.state.tableBodyVersion + 1 }, () => this.onSelectionChange());
  }

  onChangeColumnHidden = (columnId, hidden) => {
    this.dataManager.changeColumnHidden(columnId, hidden);
    this.setState({ ...this.dataManager.getRenderState(), tableBodyVersion: this.state.tableBodyVersion + 1 });

    if (this.props.onChangeColumnHidden) {
      this.props.onChangeColumnHidden(columnId, hidden, this.state.columns.sort((a, b) =>
        (a.tableData.columnOrder > b.tableData.columnOrder) ? 1 : -1));
    }
  }

  onChangeGroupOrder = (groupedColumn) => {
    const groupedResult = this.dataManager.changeGroupOrder(groupedColumn.tableData.id);
    this.setState({ ...this.dataManager.getRenderState(), tableBodyVersion: this.state.tableBodyVersion + 1 });

    if (groupedResult !== undefined && this.props.onChangeColumnGroups) {
      this.props.onChangeColumnGroups(groupedResult);
    }
  }

  onChangeOrder = (orderBy, orderDirection) => {
    this.dataManager.changeOrder(orderBy, orderDirection);

    if (this.isRemoteData()) {
      const query = { ...this.state.query };
      query.page = 0;
      query.orderBy = this.state.columns.find(a => a.tableData.id === orderBy);
      query.orderDirection = orderDirection;
      this.onQueryChange(query, () => {
        this.props.onOrderChange && this.props.onOrderChange(orderBy, orderDirection);
      });
    }
    else {
      this.setState({ ...this.dataManager.getRenderState(), tableBodyVersion: this.state.tableBodyVersion + 1 }, () => {
        this.props.onOrderChange && this.props.onOrderChange(orderBy, orderDirection);
      });
    }
  }

  onChangePage = (event, page) => {
    if (this.isRemoteData()) {
      const query = { ...this.state.query };
      query.page = page;
      this.onQueryChange(query, () => {
        this.props.onChangePage && this.props.onChangePage(page);
      });
    }
    else {
      this.dataManager.changeCurrentPage(page);
      this.setState({ ...this.dataManager.getRenderState(), tableBodyVersion: this.state.tableBodyVersion + 1 }, () => {
        this.props.onChangePage && this.props.onChangePage(page);
      });
    }
  }

  onChangeRowsPerPage = (event) => {
    const pageSize = event.target.value;

    this.dataManager.changePageSize(pageSize);

    if (this.isRemoteData()) {
      const query = { ...this.state.query };
      query.pageSize = event.target.value;
      query.page = 0;
      this.onQueryChange(query, () => {
        this.props.onChangeRowsPerPage && this.props.onChangeRowsPerPage(pageSize);
      });
    }
    else {
      this.dataManager.changeCurrentPage(0);
      this.setState({ ...this.dataManager.getRenderState(), tableBodyVersion: this.state.tableBodyVersion + 1 }, () => {
        this.props.onChangeRowsPerPage && this.props.onChangeRowsPerPage(pageSize);
      });
    }
  }

  onDragStart = () => {
    this.setState({
      isDragged: true,
    });

  }

  onDragEnd = result => {
    if (result && result.destination && result.destination.index < this.props.options.fixedColumns && result.destination.droppableId === "headers") {
      return;
    }

    const groupedResult = this.dataManager.changeByDrag(result);
    this.setState({ ...this.dataManager.getRenderState(), isDragged: false, tableBodyVersion: this.state.tableBodyVersion + 1 });

    if (result && result.destination && result.destination.droppableId === 'headers'
      && result.source && result.source.droppableId === result.destination.droppableId
      && this.props.onChangeColumnOrder) {
        this.props.onChangeColumnOrder(this.state.columns.sort((a, b) =>
          (a.tableData.columnOrder > b.tableData.columnOrder) ? 1 : -1));

    }

    if (groupedResult !== undefined && this.props.onChangeColumnGroups) {
      this.props.onChangeColumnGroups(groupedResult);
    }
  }

  onGroupExpandChanged = (path) => {
    this.dataManager.changeGroupExpand(path);
    this.setState({ ...this.dataManager.getRenderState(), tableBodyVersion: this.state.tableBodyVersion + 1 });
  }

  onGroupRemoved = (groupedColumn, index) => {
    const result = {
      combine: null,
      destination: { droppableId: "headers", index: 0 },
      draggableId: groupedColumn.tableData.id,
      mode: "FLUID",
      reason: "DROP",
      source: { index, droppableId: "groups" },
      type: "DEFAULT"
    };
    const groupedResult = this.dataManager.changeByDrag(result);
    this.setState({ ...this.dataManager.getRenderState(), tableBodyVersion: this.state.tableBodyVersion + 1 });
    if (groupedResult !== undefined && this.props.onChangeColumnGroups) {
      this.props.onChangeColumnGroups(groupedResult);
    }
  }

  onEditingApproved = (mode, newData, oldData) => {
    if (this.props.onClickActionButton) {
      this.props.onClickActionButton(mode + 'Approved', newData, oldData);
    }
    if (mode === "add") {
      this.setState({ isLoading: true, tableBodyVersion: this.state.tableBodyVersion + 1 }, () => {
        this.props.editable.onRowAdd(newData)
          .then(result => {
            if (this.props.onClickActionButton) {
              this.props.onClickActionButton(mode + 'End', newData);
            }
            this.setState({ isLoading: false, showAddRow: false, tableBodyVersion: this.state.tableBodyVersion + 1 }, () => {
              if (this.isRemoteData()) {
                this.onQueryChange(this.state.query);
              }
            });
          })
          .catch(reason => {
            this.setState({ isLoading: false, tableBodyVersion: this.state.tableBodyVersion + 1 });
          });
      });
    }
    else if (mode === "update") {
      this.setState({ isLoading: true, tableBodyVersion: this.state.tableBodyVersion + 1 }, () => {
        this.props.editable.onRowUpdate(newData, oldData)
          .then(result => {
            if (this.props.onClickActionButton) {
              this.props.onClickActionButton(mode + 'End', newData, oldData);
            }
            this.dataManager.changeRowEditing(oldData);
            this.setState({
              isLoading: false,
              tableBodyVersion: this.state.tableBodyVersion + 1,
              ...this.dataManager.getRenderState()
            }, () => {
              if (this.isRemoteData()) {
                this.onQueryChange(this.state.query);
              }
            });
          })
          .catch(reason => {
            this.setState({ isLoading: false, tableBodyVersion: this.state.tableBodyVersion + 1 });
          });
      });

    }
    else if (mode === "delete") {
      this.setState({ isLoading: true, tableBodyVersion: this.state.tableBodyVersion + 1 }, () => {
        this.props.editable.onRowDelete(oldData)
          .then(result => {
            if (this.props.onClickActionButton) {
              this.props.onClickActionButton(mode + 'End', oldData);
            }
            this.dataManager.changeRowEditing(oldData);
            this.setState({
              isLoading: false,
              tableBodyVersion: this.state.tableBodyVersion + 1,
              ...this.dataManager.getRenderState()
            }, () => {
              if (this.isRemoteData()) {
                this.onQueryChange(this.state.query);
              }
            });
          })
          .catch(reason => {
            this.setState({ isLoading: false, tableBodyVersion: this.state.tableBodyVersion + 1 });
          });
      });
    }
  }

  onEditingCanceled = (mode, rowData) => {
    if (this.props.onClickActionButton) {
      this.props.onClickActionButton(mode + 'Cancel', rowData);
    }
    if (mode === "add") {
      this.setState({ showAddRow: false, tableBodyVersion: this.state.tableBodyVersion + 1 });
    }
    else if (mode === "update" || mode === "delete") {
      this.dataManager.changeRowEditing(rowData);
      this.setState({ ...this.dataManager.getRenderState(), tableBodyVersion: this.state.tableBodyVersion + 1 });
    }
  }

  onQueryChange = (query, callback) => {
    query = { ...this.state.query, ...query };

    this.setState({ isLoading: true, tableBodyVersion: this.state.tableBodyVersion + 1 }, () => {
      this.props.data(query).then((result) => {
        query.totalCount = result.totalCount;
        query.page = result.page;
        this.dataManager.setData(result.data);
        this.setState({
          isLoading: false,
          tableBodyVersion: this.state.tableBodyVersion + 1,
          ...this.dataManager.getRenderState(),
          query
        }, () => {
          callback && callback();
        });
      });
    });
  }

  onRowSelected = (event, path, dataClicked) => {
    this.dataManager.changeRowSelected(event.target.checked, path);
    this.setState({ ...this.dataManager.getRenderState(), tableBodyVersion: this.state.tableBodyVersion + 1 }, () => this.onSelectionChange(dataClicked));
  }

  onSelectionChange = (dataClicked) => {
    if (this.props.onSelectionChange) {
      const selectedRows = [];

      const findSelecteds = list => {
        list.forEach(row => {
          if (row.tableData.checked) {
            selectedRows.push(row);
          }

          row.tableData.childRows && findSelecteds(row.tableData.childRows);
        });
      };

      findSelecteds(this.state.originalData);
      this.props.onSelectionChange(selectedRows, dataClicked);
    }
  }

  onSearchChange = searchText => this.setState({ searchText }, this.onSearchChangeDebounce)

  onSearchChangeDebounce = debounce(() => {
    this.dataManager.changeSearchText(this.state.searchText);

    if (this.isRemoteData()) {
      const query = { ...this.state.query };
      query.page = 0;
      query.search = this.state.searchText;

      this.onQueryChange(query);
    }
    else {
      this.setState({ ...this.dataManager.getRenderState(), tableBodyVersion: this.state.tableBodyVersion + 1 });
    }
  }, this.props.options.debounceInterval)

  onFilterChange = (columnId, value) => {
    this.dataManager.changeFilterValue(columnId, value);
    this.setState({}, this.onFilterChangeDebounce);
  }

  onFilterChangeDebounce = debounce(() => {
    if (this.isRemoteData()) {
      const query = { ...this.state.query };
      query.filters = this.state.columns
        .filter(a => a.tableData.filterValue)
        .map(a => ({
          column: a,
          operator: "=",
          value: a.tableData.filterValue
        }));

      this.onQueryChange(query);
    }
    else {
      this.setState({ ...this.dataManager.getRenderState(), tableBodyVersion: this.state.tableBodyVersion + 1 });
    }

    if (this.props.onChangeFilter) {
      this.props.onChangeFilter(this.state.columns
        .filter(item => item.tableData.filterValue !== null && item.tableData.filterValue !== undefined)
        .map(item => ({
          field: item.field,
          filterValue: item.tableData.filterValue,
        })));
    }
  }, this.props.options.debounceInterval)

  onTreeExpandChanged = (path, data) => {
    this.dataManager.changeTreeExpand(path);
    this.setState({ ...this.dataManager.getRenderState(), tableBodyVersion: this.state.tableBodyVersion + 1 }, () => {
      this.props.onTreeExpandChange && this.props.onTreeExpandChange(data, data.tableData.isTreeExpanded);
    });
  }

  onToggleDetailPanel = (path, render) => {
    this.dataManager.changeDetailPanelVisibility(path, render);
    this.setState({ ...this.dataManager.getRenderState(), tableBodyVersion: this.state.tableBodyVersion + 1 });
  }

  renderFooter() {
    const props = this.getProps();

    if (props.options.paging) {
      const localization = { ...MaterialTable.defaultProps.localization.pagination, ...this.props.localization.pagination };
      return (
        <Table>
          <TableFooter style={{ display: 'grid' }}>
            <TableRow>
              <props.components.Pagination
                classes={{
                  root: props.classes.paginationRoot,
                  toolbar: props.classes.paginationToolbar,
                  caption: props.classes.paginationCaption,
                  selectRoot: props.classes.paginationSelectRoot,
                }}
                style={{ float: props.theme.direction === "rtl" ? "" : "right", overflowX: 'auto', borderBottom: 'none', }}
                colSpan={3}
                count={this.isRemoteData() ? this.state.query.totalCount : this.state.data.length}
                icons={props.icons}
                rowsPerPage={this.state.pageSize}
                rowsPerPageOptions={props.options.pageSizeOptions}
                SelectProps={{
                  renderValue: value => <div style={{ padding: '0px 5px' }}>{value + ' ' + localization.labelRowsSelect + ' '}</div>
                }}
                page={this.isRemoteData() ? this.state.query.page : this.state.currentPage}
                onChangePage={this.onChangePage}
                onChangeRowsPerPage={this.onChangeRowsPerPage}
                ActionsComponent={(subProps) => props.options.paginationType === 'normal' ?
                  <MTablePagination {...subProps} icons={props.icons} localization={localization} showFirstLastPageButtons={props.options.showFirstLastPageButtons}/> :
                  <MTableSteppedPagination {...subProps} icons={props.icons} localization={localization} />}
                labelDisplayedRows={(row) => localization.labelDisplayedRows.replace('{from}', row.from).replace('{to}', row.to).replace('{count}', row.count)}
                labelRowsPerPage={localization.labelRowsPerPage}
              />
            </TableRow>
          </TableFooter>
        </Table>
      );
    }
  }
  renderTable() {
    const props = this.getProps();

    return <Table id={this.id}>
      {props.options.header &&
        <props.components.Header
          localization={{ ...MaterialTable.defaultProps.localization.header, ...this.props.localization.header, ...this.props.localization.filter }}
          columns={this.state.columns}
          draggableHeader={props.options.draggableHeader}
          hasSelection={props.options.selection}
          headerClassName={`${props.options.headerClassName || ''}${this.state.isDragged ? ' is-dragged' : ''}`}
          headerStyle={props.options.headerStyle}
          selectedCount={this.state.selectedCount}
          dataCount={props.parentChildData ? this.state.treefiedDataLength : this.state.data.length}
          hasDetailPanel={!!props.detailPanel}
          detailPanelColumnAlignment={props.options.detailPanelColumnAlignment}
          showActionsColumn={props.actions && props.actions.filter(a => !a.isFreeAction && !this.props.options.selection).length > 0}
          showSelectAllCheckbox={props.options.showSelectAllCheckbox}
          orderBy={this.state.orderBy}
          orderDirection={this.state.orderDirection}
          onAllSelected={this.onAllSelected}
          onOrderChange={this.onChangeOrder}
          actionsHeaderIndex={props.options.actionsColumnIndex}
          sorting={props.options.sorting}
          grouping={props.options.grouping}
          filtering={props.options.filtering}
          filterType={props.options.filterType}
          isTreeData={this.props.parentChildData !== undefined}
          icons={this.props.icons}
          onFilterChanged={this.onFilterChange}
          components={props.components}
          fixedColumns={props.options.fixedColumns}
        />
      }
      <props.components.Body
        actions={props.actions}
        components={props.components}
        icons={props.icons}
        renderData={this.state.renderData}
        currentPage={this.state.currentPage}
        initialFormData={props.initialFormData}
        pageSize={this.state.pageSize}
        columns={this.state.columns}
        detailPanel={props.detailPanel}
        options={props.options}
        getFieldValue={this.dataManager.getFieldValue}
        isTreeData={this.props.parentChildData !== undefined}
        onFilterChanged={this.onFilterChange}
        onRowSelected={this.onRowSelected}
        onToggleDetailPanel={this.onToggleDetailPanel}
        onGroupExpandChanged={this.onGroupExpandChanged}
        onTreeExpandChanged={this.onTreeExpandChanged}
        onEditingCanceled={this.onEditingCanceled}
        onEditingApproved={this.onEditingApproved}
        localization={{ ...MaterialTable.defaultProps.localization.body, ...this.props.localization.body }}
        onRowClick={this.props.onRowClick}
        showAddRow={this.state.showAddRow}
        hasAnyEditingRow={!!(this.state.lastEditingRow || this.state.showAddRow)}
        hasDetailPanel={!!props.detailPanel}
        treeDataMaxLevel={this.state.treeDataMaxLevel}
        version={this.state.tableBodyVersion}
      />
      {this.props.options.aggregation && !!this.dataManager.filteredData && !!this.dataManager.filteredData.length &&
        <TableFooter>
          <props.components.Totals
              components={props.components}
              icons={props.icons}
              renderData={this.dataManager.filteredData}
              options={props.options}
              getAggregation={this.dataManager.getAggregation}
              columns={props.columns}
              isTreeData={this.props.parentChildData !== undefined}
              detailPanel={props.detailPanel}
              actions={props.actions}
              hasAnyEditingRow={!!(this.state.lastEditingRow || this.state.showAddRow)}
          />
        </TableFooter>
      }
    </Table>;
  }
  render() {
    const props = this.getProps();

    return (
      <DragDropContext onDragEnd={this.onDragEnd} onDragStart={this.onDragStart}>
        <props.components.Container style={{ position: 'relative', ...props.style }}>
          {props.options.toolbar &&
            <props.components.Toolbar
              actions={props.actions}
              components={props.components}
              selectedRows={this.state.selectedCount > 0 ? this.state.originalData.filter(a => { return a.tableData.checked }) : []}
              columns={this.state.columns}
              columnsButton={props.options.columnsButton}
              icons={props.icons}
              datetimeLocaleString={props.options.datetimeLocaleString}
              exportAllData={props.options.exportAllData}
              exportButton={props.options.exportButton}
              exportDelimiter={props.options.exportDelimiter}
              exportFileName={props.options.exportFileName}
              exportNumericDecimalSeparator={props.options.exportNumericDecimalSeparator}
              exportNumericNullToZero={props.options.exportNumericNullToZero}
              exportTotals={props.options.exportTotals}
              getAggregation={this.props.options.aggregation
                ? this.dataManager.getAggregation
                : null}
              exportCsv={props.options.exportCsv}
              getFieldValue={this.dataManager.getFieldValue}
              data={this.state.data}
              renderData={this.state.renderData}
              search={props.options.search}
              showTitle={props.options.showTitle}
              showTextRowsSelected={props.options.showTextRowsSelected}
              toolbarButtonAlignment={props.options.toolbarButtonAlignment}
              searchFieldAlignment={props.options.searchFieldAlignment}
              searchText={this.state.searchText}
              searchFieldStyle={props.options.searchFieldStyle}
              title={props.title}
              onSearchChanged={this.onSearchChange}
              onColumnsChanged={this.onChangeColumnHidden}
              localization={{ ...MaterialTable.defaultProps.localization.toolbar, ...this.props.localization.toolbar }}
            />
          }
          {props.options.grouping &&
            <props.components.Groupbar
              icons={props.icons}
              localization={{ ...MaterialTable.defaultProps.localization.grouping, ...props.localization.grouping }}
              groupColumns={this.state.columns
                .filter(col => col.tableData.groupOrder > -1)
                .sort((col1, col2) => col1.tableData.groupOrder - col2.tableData.groupOrder)
              }
              onSortChanged={this.onChangeGroupOrder}
              onGroupRemoved={this.onGroupRemoved}
            />
          }
          <ScrollBar double={props.options.doubleHorizontalScroll} tableId={this.id} ownProps={this.props}>
            <Droppable droppableId="headers" direction="horizontal">
              {(provided, snapshot) => (
                <div ref={provided.innerRef}>
                  <div style={{ maxHeight: props.options.maxBodyHeight, overflowY: 'auto' }}>
                    {this.renderTable()}
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

          </ScrollBar>
          {(this.state.isLoading || props.isLoading) && props.options.loadingType === "linear" &&
            <div style={{ position: 'relative', width: '100%' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%' }}>
                <LinearProgress />
              </div>
            </div>
          }
          {this.renderFooter()}

          {(this.state.isLoading || props.isLoading) && props.options.loadingType === 'overlay' &&
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%', zIndex: 11 }}>
              <props.components.OverlayLoading theme={props.theme} />
            </div>
          }
        </props.components.Container>
        <style>{`.totals-row td.MuiTableCell-footer:before {
      content: '';
      position: absolute;
      left: 0;
      top: -1px;
      width: 100%;
      border-bottom: 1px solid rgba(224, 224, 224, 1);
    }
    tbody td.cell-fixed:after,  thead th.MuiTableCell-head:after {
      content: '';
      position: absolute;
      left: 0;
      bottom: -1px;
      width: 100%;
      border-bottom: 1px solid rgba(224, 224, 224, 1);
    }`}</style>
      </DragDropContext>
    );
  }
}

const ScrollBar = ({ double, children, tableId }) => {
  const [divRef, setDivRef] = React.useState(null);
  const [cellFixedStyle, setCellFixedStyle] = React.useState('');
  useWindowSize();

  const setRef = ref => setDivRef(ref
    && ref.children[0]
    && ref.children[0].children
    && ref.children[0].children[0]);

  if (divRef) {
      let left = 0;
      const headerRows = divRef.children[0].children[0].children.length;
      const firtRowChildren = divRef.children[0].children[0].children[headerRows - 1].children;

      let style = '';
      for(let i = 0; i < firtRowChildren.length; ++i) {
        const item = firtRowChildren[i];
        if (item.className.indexOf('cell-fixed') !== -1) {
          style += `#${tableId} .cell-fixed:nth-child(${i + 1}) { left: ${left}px; } `;
          left += item.offsetWidth;
        }
      }
      if (style !== '' && style !== cellFixedStyle) {
        setCellFixedStyle(style);
      }
  }

  if (double) {
    return (
      <DoubleScrollbar>
        {children}
      </DoubleScrollbar>
    );
  }
  else {
    return (
      <div ref={setRef} style={{ overflowX: 'auto' }} >
        {children}
        {
          cellFixedStyle !== '' &&
          <style>{cellFixedStyle}</style>
        }
      </div>
    );
  }
};
