/* eslint-disable no-unused-vars */
import ReactDOMServer from 'react-dom/server';
import { Checkbox, FormControlLabel, Icon, IconButton, InputAdornment, Menu, MenuItem, TextField,
  Toolbar, Tooltip, Typography, withStyles, Divider  } from '@material-ui/core';
import { lighten } from '@material-ui/core/styles/colorManipulator';
import classNames from 'classnames';
import { CsvBuilder } from 'filefy';
import PropTypes, { oneOf } from 'prop-types';
import * as React from 'react';
/* eslint-enable no-unused-vars */

export class MTableToolbar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      columnsButtonAnchorEl: null,
      exportButtonAnchorEl: null
    };
  }

  defaultExportCsv = () => {
    const columns = this.props.columns
      .filter(columnDef => {
        return !columnDef.hidden && columnDef.field && columnDef.export !== false;
      })
      .sort((a, b) => a.tableData.columnOrder - b.tableData.columnOrder);

    const dataToExport = this.props.exportAllData ? this.props.data : this.props.renderData;

    const data = dataToExport.map(rowData =>
      columns.map(columnDef => {
        let val = undefined;
        if (columnDef.render) {
          val = columnDef.render(rowData, 'export');
        }
        if (val !== undefined) {
          if (typeof val === 'object') {
            if (val instanceof Date) {
              if (columnDef.type === 'date') {
                val = val.toLocaleDateString(this.props.datetimeLocaleString);
              } else if (columnDef.type === 'time') {
                val = val.toLocaleTimeString(this.props.datetimeLocaleString);
              } else {
                val = val.toLocaleString(this.props.datetimeLocaleString);
              } 
            } else {
              val = ReactDOMServer.renderToStaticMarkup(val).replace(/<[^>]+>/g, '');
            }
          }
        } else {
          val = this.props.getFieldValue(rowData, columnDef);
        }
        if (columnDef.type === 'numeric' || typeof val === 'number') {
          if (columnDef.digits !== undefined) {
            let normalizedValue = (val && val.toFixed) ? val.toFixed(columnDef.digits) : null;

            if (normalizedValue && normalizedValue.indexOf('.') !== -1) {
              normalizedValue = normalizedValue.replace(/[0]+$/, '').replace(/[.]+$/, '');
            }

            val = (normalizedValue === null) ? val : normalizedValue;
          }
          

          if (this.props.exportNumericNullToZero
            && (val === null || val === undefined || val === '')) {
            val = 0;
          }
          if(this.props.exportNumericDecimalSeparator
          && this.props.exportNumericDecimalSeparator !== '.') {
            val = `${val}`.replace(/[.]/g, this.props.exportNumericDecimalSeparator);
          }
        } else if (columnDef.type === 'date') {
          val = val.toLocaleDateString(this.props.datetimeLocaleString);
        } else if (columnDef.type === 'datetime') {
          val = val.toLocaleString(this.props.datetimeLocaleString);
        } else if (columnDef.type === 'time') {
          val = val.toLocaleTimeString(this.props.datetimeLocaleString);
        } else {
          if (val && val.length && val.replace) {
            val = val.replace(/"$/,'""');
            if (val[0] === '+' || val[0] === '-') {
              val = '\u200D' + val;
            }
          }
        }
        return val;
      })
    );

    if (this.props.exportTotals && this.props.getAggregation) {
      const totalsRow = columns
      .map((columnDef, index) => {
        let value = this.props.getAggregation(dataToExport, columnDef, true, true);

        if (typeof value === 'object') {
          if (value instanceof Date) {
            if (columnDef.type === 'date') {
              value = value.toLocaleDateString(this.props.datetimeLocaleString);
            } else if (columnDef.type === 'time') {
              value = value.toLocaleTimeString(this.props.datetimeLocaleString);
            } else {
              value = value.toLocaleString(this.props.datetimeLocaleString);
            } 
          } else {
            value = ReactDOMServer.renderToStaticMarkup(value).replace(/<[^>]+>/g, '');
          }
        }

        if (columnDef.type === 'numeric') {
          if (columnDef.digits !== undefined) {
            let normalizedValue = (+value && (+value).toFixed) ? (+value).toFixed(columnDef.digits) : null;

            if (normalizedValue && normalizedValue.indexOf('.') !== -1) {
              normalizedValue = normalizedValue.replace(/[0]+$/, '').replace(/[.]+$/, '');
            }

            value = (normalizedValue === null) ? value : normalizedValue;
          }
          if(this.props.exportNumericDecimalSeparator
            && this.props.exportNumericDecimalSeparator !== '.') {
            value = `${value}`.replace(/[.]/g, this.props.exportNumericDecimalSeparator);
          }

          if (this.props.exportNumericNullToZero
            && (value === null || value === undefined || value === '')) {
            value = 0;
          }
        }

        if (value === null || value === undefined || value === 'null' || value === 'undefined') {
          value = '';
        }

        return value;
      });

      data.push(totalsRow);
    }

    const builder = new CsvBuilder((this.props.exportFileName || this.props.title || 'data') + '.csv');
    builder
      .setDelimeter(this.props.exportDelimiter)
      .setColumns(columns.map(columnDef => {
        let title = '';
        if (typeof columnDef.title === 'string') {
          title = columnDef.title;
        }
        title = ReactDOMServer.renderToStaticMarkup(columnDef.title).replace(/<[^>]+>/g, '');

        let rootTitle = null;
        if (columnDef.rootTitle) {
          if (typeof columnDef.rootTitle === 'string') {
            rootTitle = columnDef.rootTitle;
          }
          rootTitle = ReactDOMServer.renderToStaticMarkup(columnDef.rootTitle).replace(/<[^>]+>/g, '');
          return `${title} (${rootTitle})`;
        }

        return title;
      }))
      .addRows(data)
      .exportFile();
  }

  exportCsv = () => {
    if (this.props.exportCsv) {
      this.props.exportCsv(this.props.columns, this.props.data);
    } else {
      this.defaultExportCsv();
    }
    this.setState({ exportButtonAnchorEl: null });
  }

  renderSearch() {
    const localization = { ...MTableToolbar.defaultProps.localization, ...this.props.localization };
    if (this.props.search) {
      return (
        <TextField
          className={this.props.searchFieldAlignment === 'left' && this.props.showTitle === false ? null : this.props.classes.searchField}
          value={this.props.searchText}
          onChange={event => this.props.onSearchChanged(event.target.value)}
          placeholder={localization.searchPlaceholder}
          color="inherit"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Tooltip title={localization.searchTooltip}>
                  <this.props.icons.Search color="inherit" fontSize="small" />
                </Tooltip>
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  disabled={!this.props.searchText}
                  onClick={() => this.props.onSearchChanged("")}
                >
                  <this.props.icons.ResetSearch color="inherit" fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
            style: this.props.searchFieldStyle
          }}
        />
      );
    }
    else {
      return null;
    }
  }

  renderDefaultActions() {
    const localization = { ...MTableToolbar.defaultProps.localization, ...this.props.localization };

    const menuItems = [];
    this.props.columns.forEach((col, index, arr) => {
      if (index > 0 && arr[index - 1].rootTitle !== col.rootTitle) {
        menuItems.push(<Divider key={`devider_for_${col.tableData.id}`} />);
      }
      if (!!col.rootTitle && (index === 0 || arr[index - 1].rootTitle !== col.rootTitle)) {
        let rootTitle = null;
        if (col.rootTitle) {
          if (typeof col.rootTitle === 'string') {
            rootTitle = col.rootTitle;
          }
          rootTitle = ReactDOMServer.renderToStaticMarkup(col.rootTitle).replace(/<[^>]+>/g, '');
        }
        menuItems.push(
        <MenuItem key={`root_for_${col.tableData.id}`} disabled={true}>
          {rootTitle}
        </MenuItem>
        );
      }
      let title = null;
        if (col.title) {
          if (typeof col.title === 'string') {
            title = col.title;
          }
          title = ReactDOMServer.renderToStaticMarkup(col.title).replace(/<[^>]+>/g, '');
        }
      menuItems.push(
        <MenuItem key={col.tableData.id} disabled={col.removable === false}>
          <FormControlLabel
            label={title}
            control={
              <Checkbox
                checked={!col.hidden}
                onChange={(event, checked) => {
                  this.props.onColumnsChanged(col.tableData.id, !checked);
                }
                } />
            }
          />
        </MenuItem>
      );
    });

    return (
      <div>
        {this.props.columnsButton &&
          <span>
            <Tooltip title={localization.showColumnsTitle}>
              <IconButton
                color="inherit"
                onClick={event => this.setState({ columnsButtonAnchorEl: event.currentTarget })}
                aria-label={localization.showColumnsAriaLabel}>

                <this.props.icons.ViewColumn />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={this.state.columnsButtonAnchorEl}
              open={Boolean(this.state.columnsButtonAnchorEl)}
              onClose={() => this.setState({ columnsButtonAnchorEl: null })}>
              <MenuItem key={"text"} disabled style={{ opacity: 1, fontWeight: 600, fontSize: 12 }}>
                {localization.addRemoveColumns}
              </MenuItem>
              {
                menuItems.map(item => item)
              }
            </Menu>
          </span>
        }
        {this.props.exportButton &&
          <span>
            <Tooltip title={localization.exportTitle}>
              <IconButton
                color="inherit"
                onClick={this.exportCsv}
                // onClick={event => this.setState({ exportButtonAnchorEl: event.currentTarget })}
                aria-label={localization.exportAriaLabel}>
                <this.props.icons.Export />
              </IconButton>
            </Tooltip>
            {/* <Menu
              anchorEl={this.state.exportButtonAnchorEl}
              open={Boolean(this.state.exportButtonAnchorEl)}
              onClose={() => this.setState({ exportButtonAnchorEl: null })}
            >
              <MenuItem key="export-csv" onClick={this.exportCsv}>
                {localization.exportName}
              </MenuItem>
            </Menu> */}
          </span>

        }
        <this.props.components.Actions actions={this.props.actions && this.props.actions.filter(a => a.isFreeAction)} components={this.props.components} />
      </div>
    );
  }

  renderSelectedActions() {
    return (
      <React.Fragment>
        <this.props.components.Actions actions={this.props.actions.filter(a => !a.isFreeAction)} data={this.props.selectedRows} components={this.props.components} />
      </React.Fragment>
    );
  }

  renderActions() {
    const { classes } = this.props;

    return (
      <div className={classes.actions}>
        <div>
          {this.props.selectedRows && this.props.selectedRows.length > 0
            ? this.renderSelectedActions()
            : this.renderDefaultActions()
          }
        </div>
      </div>
    );
  }

  render() {
    const { classes } = this.props;
    const localization = { ...MTableToolbar.defaultProps.localization, ...this.props.localization };
    const title =this.props.showTextRowsSelected && this.props.selectedRows && this.props.selectedRows.length  > 0 ? localization.nRowsSelected.replace('{0}', this.props.selectedRows.length) : this.props.showTitle ? this.props.title : null;
    return (
      <Toolbar className={classNames(classes.root, { [classes.highlight]: this.props.showTextRowsSelected &&this.props.selectedRows && this.props.selectedRows.length > 0 })}>
        {title && <div className={classes.title}>
          <Typography variant="h6">{title}</Typography>
        </div>}
        {this.props.searchFieldAlignment === 'left' && this.renderSearch()}
        {this.props.toolbarButtonAlignment === 'left' && this.renderActions()}
        <div className={classes.spacer} />
        {this.props.searchFieldAlignment === 'right' && this.renderSearch()}
        {this.props.toolbarButtonAlignment === 'right' && this.renderActions()}
      </Toolbar >
    );
  }
}

MTableToolbar.defaultProps = {
  actions: [],
  columns: [],
  columnsButton: false,
  localization: {
    addRemoveColumns: 'Add or remove columns',
    nRowsSelected: '{0} row(s) selected',
    showColumnsTitle: 'Show Columns',
    showColumnsAriaLabel: 'Show Columns',
    exportTitle: 'Export',
    exportAriaLabel: 'Export',
    exportName: 'Export as CSV',
    searchTooltip: 'Search',
    searchPlaceholder: 'Search'
  },
  search: true,
  showTitle: true,
  showTextRowsSelected:true,
  toolbarButtonAlignment: 'right',
  searchFieldAlignment: 'right',
  searchText: '',
  selectedRows: [],
  title: 'No Title!'
};

MTableToolbar.propTypes = {
  actions: PropTypes.array,
  columns: PropTypes.array,
  columnsButton: PropTypes.bool,
  components: PropTypes.object.isRequired,
  getFieldValue: PropTypes.func.isRequired,
  localization: PropTypes.object.isRequired,
  onColumnsChanged: PropTypes.func.isRequired,
  onSearchChanged: PropTypes.func.isRequired,
  search: PropTypes.bool.isRequired,
  searchFieldStyle: PropTypes.object,
  searchText: PropTypes.string.isRequired,
  selectedRows: PropTypes.array,
  title: PropTypes.oneOfType([PropTypes.element, PropTypes.string]),
  showTitle: PropTypes.bool.isRequired,
  showTextRowsSelected:PropTypes.bool.isRequired,
  toolbarButtonAlignment: PropTypes.string.isRequired,
  searchFieldAlignment: PropTypes.string.isRequired,
  renderData: PropTypes.array,
  data: PropTypes.array,
  exportAllData: PropTypes.bool,
  exportButton: PropTypes.bool,
  exportDelimiter: PropTypes.string,
  exportFileName: PropTypes.string,
  exportNumericDecimalSeparator: PropTypes.string,
  exportNumericNullToZero: PropTypes.bool,
  exportTotals: PropTypes.bool,
  getAggregation: PropTypes.func,
  exportCsv: PropTypes.func,
  classes: PropTypes.object,
  datetimeLocaleString: PropTypes.string,
};

export const styles = theme => ({
  root: {
    paddingRight: theme.spacing(1)
  },
  highlight:
    theme.palette.type === 'light'
      ? {
        color: theme.palette.secondary.main,
        backgroundColor: lighten(theme.palette.secondary.light, 0.85)
      }
      : {
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.secondary.dark
      },
  spacer: {
    flex: '1 1 10%'
  },
  actions: {
    color: theme.palette.text.secondary,
  },
  title: {
    flex: '0 0 auto'
  },
  searchField: {
    paddingLeft: theme.spacing(2)
  }
});

export default withStyles(styles)(MTableToolbar);
