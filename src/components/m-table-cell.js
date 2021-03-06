/* eslint-disable no-unused-vars */
import * as React from 'react';
import { Icon, TableCell } from '@material-ui/core';
import PropTypes from 'prop-types';
/* eslint-enable no-unused-vars */

export default class MTableCell extends React.Component {
  getRenderValue() {
    if (this.props.columnDef.emptyValue !== undefined && (this.props.value === undefined || this.props.value === null)) {
      return this.getEmptyValue(this.props.columnDef.emptyValue);
    }
    if (this.props.columnDef.render && !this.props.isTotals) {
      if(this.props.rowData) {
        return this.props.columnDef.render(this.props.rowData, 'row');
      }
      else {
        return this.props.columnDef.render(this.props.value, 'group');
      }
      
    } else if (this.props.columnDef.type === 'boolean') {
      const style = { textAlign: 'left', verticalAlign: 'middle', width: 48 };
      if (this.props.value) {
        return <this.props.icons.Check style={style} />;
      } else {
        return <this.props.icons.ThirdStateCheck style={style} />;
      }
    } else if (this.props.columnDef.type === 'date') {
      if (this.props.value instanceof Date) {
        return this.props.value.toLocaleDateString(this.props.datetimeLocaleString);
      } else {
        return this.props.value;
      }
    } else if (this.props.columnDef.type === 'time') {
      if (this.props.value instanceof Date) {
        return this.props.value.toLocaleTimeString(this.props.datetimeLocaleString);
      } else {
        return this.props.value;
      }
    } else if (this.props.columnDef.type === 'datetime') {
      if (this.props.value instanceof Date) {
        return this.props.value.toLocaleString(this.props.datetimeLocaleString);
      } else {
        return this.props.value;
      }
    } else if (this.props.columnDef.type === 'currency') {
      return this.getCurrencyValue(this.props.columnDef.currencySetting, this.props.value);
    } else if (this.props.columnDef.type === 'numeric') {
      if (this.props.columnDef.digits !== undefined) {

        let normalizedValue = (this.props.value && this.props.value.toFixed)
          ? this.props.value
            .toFixed(this.props.columnDef.digits)
          : null;

        const strictDigits = (this.props.columnDef.strictDigits !== undefined)
          ? this.props.columnDef.strictDigits
          : this.props.strictDigits;

        if (normalizedValue
          && normalizedValue.indexOf('.') !== -1
          && !strictDigits) {
          normalizedValue = normalizedValue
            .replace(/[0]+$/, '')
            .replace(/[.]+$/, '');
        }

        return (normalizedValue === null) ? this.props.value : normalizedValue;
      }

      return this.props.value;
    }

    return this.props.value;
  }

  getEmptyValue(emptyValue) {
    if (typeof emptyValue === 'function') {
      return this.props.columnDef.emptyValue(this.props.rowData);
    } else {
      return emptyValue;
    }
  }

  getCurrencyValue(currencySetting, value) {
    if (currencySetting !== undefined) {
      return new Intl.NumberFormat((currencySetting.locale !== undefined) ? currencySetting.locale : 'en-US',
        {
          style: 'currency',
          currency: (currencySetting.currencyCode !== undefined) ? currencySetting.currencyCode : 'USD',
          minimumFractionDigits: (currencySetting.minimumFractionDigits !== undefined) ? currencySetting.minimumFractionDigits : 2,
          maximumFractionDigits: (currencySetting.maximumFractionDigits !== undefined) ? currencySetting.maximumFractionDigits : 2
        }).format((value !== undefined) ? value : 0);
    } else {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((value !== undefined) ? value : 0);
    }
  }

  handleClickCell = e => {
    if (this.props.columnDef.disableClick) {
      e.stopPropagation();
    }
  }

  getStyle = () => {
    let cellStyle = {};

    if (typeof this.props.columnDef.cellStyle === 'function') {
      cellStyle = { ...cellStyle, ...this.props.columnDef.cellStyle(this.props.value, this.props.rowData) };
    } else {
      cellStyle = { ...cellStyle, ...this.props.columnDef.cellStyle };
    }

    if (this.props.columnDef.disableClick) {
      cellStyle.cursor = 'default';
    }

    return { ...this.props.style, ...cellStyle };
  }

  getClassName = () => {
    let cellClassName = '';

    if (typeof this.props.columnDef.cellClassName === 'function') {
      cellClassName = this.props.columnDef.cellClassName(this.props.value, this.props.rowData);
    } else {
      cellClassName = this.props.columnDef.cellClassName;
    }

    return cellClassName || '';
  }

  render() {
    const { icons, columnDef, rowData, isFixed, value, sorting, headerFiltering, isTotals,
      datetimeLocaleString, strictDigits, ...cellProps } = this.props;
    let padding = 0;

    if (this.props.columnDef.type === 'numeric') {
      if (this.props.columnDef.sorting !== false && this.props.sorting) {
        padding += 26;
      }
      if (this.props.headerFiltering) {
        padding += 24;
      }
    }

    const className = this.getClassName();

    return (
      <TableCell
          {...cellProps}
          className={(isFixed ? 'cell-fixed ' : '') + className}
          style={this.getStyle()}
          align={['numeric'].indexOf(this.props.columnDef.type) !== -1 ? "right" : "left"}
          onClick={this.handleClickCell}
      >
        <span style={{paddingRight: `${padding}px`}}>
          {this.props.children}
          {this.getRenderValue()}
        </span>
      </TableCell>
    );
  }
}

MTableCell.defaultProps = {
  columnDef: {},
  value: undefined
};

MTableCell.propTypes = {
  columnDef: PropTypes.object.isRequired,
  value: PropTypes.any,
  rowData: PropTypes.object,
  isFixed: PropTypes.bool,
  sorting: PropTypes.bool.isRequired,
  strictDigits: PropTypes.bool,
  headerFiltering: PropTypes.bool.isRequired,
  isTotals: PropTypes.bool,
  datetimeLocaleString: PropTypes.string,
};
