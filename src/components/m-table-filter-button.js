/* eslint-disable no-unused-vars */
import * as React from 'react';
import {
    TextField, FormControl, Checkbox,
    ListItemText, InputAdornment, withStyles,
    Popover, List, ListItem, Divider, Link, Typography
} from '@material-ui/core';
import ClearIcon from '@material-ui/icons/Clear';
import IconButton from '@material-ui/core/IconButton';
import { MuiPickersUtilsProvider, TimePicker, DatePicker, DateTimePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import PropTypes from 'prop-types';
/* eslint-enable no-unused-vars */

class MTableFilterButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            anchorEl: null
        };
    }
    handleOpenPopoverButtonClick = (e) => {
        this.setState({
            anchorEl: e.currentTarget
        });
    }
    handlePopoverClose = () => {
        this.setState({
            anchorEl: null
        });
    }
    handleLookupCheckboxToggle = (columnDef, key) => {
        let filterValue = (columnDef.tableData.filterValue || []).slice();
        const elementIndex = filterValue.indexOf(key);
        if (elementIndex === -1) {
            filterValue.push(key);
        } else {
            filterValue.splice(elementIndex, 1);
        }
        if (filterValue.length === 0) filterValue = undefined;
        this.props.onFilterChanged(columnDef.tableData.id, filterValue);
    }
    handleCheckboxToggle = (columnDef) => {
        let val;
        if (columnDef.tableData.filterValue === undefined) {
            val = 'checked';
        } else if (columnDef.tableData.filterValue === 'checked') {
            val = 'unchecked';
        }
        this.props.onFilterChanged(columnDef.tableData.id, val);
    }
    handleFilterNumericChange = (columnDef, value, index) => {
        let filterValue = columnDef.tableData.filterValue;
        //if both value are undef => filterValue = undef
        if (!value && filterValue && !filterValue[Math.abs(index - 1)]) filterValue = undefined;
        else {
            if (filterValue === undefined) filterValue = [undefined, undefined];
            filterValue[index] = value;
        }
        this.props.onFilterChanged(columnDef.tableData.id, filterValue);
    }
    getFilterTitle() {
        const columnDef = this.props.columnDef;

        if (columnDef.field || columnDef.customFilterAndSearch) {
            if (columnDef.lookup) {
                const lookupResult = Object.keys(columnDef.lookup)
                    .filter(key => 
                        columnDef.tableData.filterValue && columnDef.tableData.filterValue.indexOf(key.toString()) > -1)
                    .map(key => columnDef.lookup[key])
                    .join(', ');
                return lookupResult;
            } else if(columnDef.tableData.filterValue) {
                if (columnDef.type === 'numeric') {
                    const isEmpty = (val) => {
                        return val === undefined || val === null || val === '';
                    };
                    if (isEmpty(columnDef.tableData.filterValue[0])) {
                        return `[..., ${columnDef.tableData.filterValue[1]}]`;
                    } else if (isEmpty(columnDef.tableData.filterValue[1])) {
                        return `[${columnDef.tableData.filterValue[0]}, ...]`;
                    } else {
                        return `[${columnDef.tableData.filterValue[0]}, ${columnDef.tableData.filterValue[1]}]`;
                    }
                }
            }
            return columnDef.tableData.filterValue;
        }
        return null;
    }
    renderFilterBody(columnDef) {
        if (columnDef.field || columnDef.customFilterAndSearch) {
            if (columnDef.lookup) {
                return this.renderLookupFilter(columnDef);
            } else if (columnDef.type === 'boolean') {
                return this.renderBooleanFilter(columnDef);
            } else if (['date', 'datetime', 'time'].includes(columnDef.type)) {
                return this.renderDateTypeFilter(columnDef);
            } else if (columnDef.type === 'numeric') {
                return this.renderNumericFilter(columnDef);
            } else {
                return this.renderDefaultFilter(columnDef);
            }
        }
        return null;
    }
    renderLookupFilter = (columnDef) => {
        const { classes } = this.props;
        const localization = { ...MTableFilterButton.defaultProps.localization, ...this.props.localization };
        return (
            <FormControl style={{ width: '100%' }}>
                    <List className={classes.filterList}>
                        {Object.keys(columnDef.lookup)
                            .sort((k1, k2) => (`${columnDef.lookup[k1]}`.localeCompare(`${columnDef.lookup[k2]}`)))
                            .map(key => (
                            <ListItem
                                className={classes.filterListItem}
                                key={key} role={undefined} dense button
                                onClick={() => this.handleLookupCheckboxToggle(columnDef, key)}
                            >
                                <Checkbox
                                    className={classes.filterCheckbox}
                                    checked={columnDef.tableData.filterValue ? columnDef.tableData.filterValue.indexOf(key.toString()) > -1 : false}
                                    tabIndex={-1}
                                    disableRipple
                                />
                                <ListItemText primary={columnDef.lookup[key]} className={classes.filterText} />
                            </ListItem>
                        ))}
                    </List>
                    <div className={classes.filterListFooter}>
                        <Divider />
                        {
                            !!columnDef.tableData.filterValue &&
                            <Link className={classes.filterListClearLink} onClick={() => this.props.onFilterChanged(columnDef.tableData.id, undefined)}>
                                {localization.clearFilter}
                            </Link>
                        }
                        {
                            !columnDef.tableData.filterValue &&
                            <Link className={classes.filterListClearLink} onClick={() => this.props.onFilterChanged(columnDef.tableData.id, Object.keys(columnDef.lookup))}>
                                {localization.selectAll}
                            </Link>
                        }
                    </div>
            </FormControl>
        );
    }
    renderBooleanFilter = (columnDef) => {
        const { classes } = this.props;
        return (
            <Checkbox
                className={classes.filterCheckbox}
                indeterminate={columnDef.tableData.filterValue === undefined}
                checked={columnDef.tableData.filterValue === 'checked'}
                onChange={() => this.handleCheckboxToggle(columnDef)}
            />
        );
    }
    renderNumericFilter = (columnDef) => {
        const { classes } = this.props;
        return (
            <>
                <TextField
                    autoFocus
                    type='number'
                    className={classes.filterNumericFrom}
                    value={(columnDef.tableData.filterValue && columnDef.tableData.filterValue[0]) || ''}
                    onChange={(event) => this.handleFilterNumericChange(columnDef, event.target.value, 0)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start" className={classes.startAdornment}>
                                [
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <>
                            {
                                ((columnDef.tableData.filterValue && columnDef.tableData.filterValue[0]) || '') !== '' &&
                                <InputAdornment position="end" className={classes.endAdornment}>
                                    <IconButton className={classes.clearIcon} onClick={() => this.handleFilterNumericChange(columnDef, '', 0)}>
                                        <ClearIcon />
                                    </IconButton>
                                </InputAdornment>
                            }
                            </>
                        )
                    }}
                />
                <span style={{display: 'inline-block', verticalAlign: 'bottom'}}>
                ,
                </span>
                <TextField
                    type='number'
                    className={classes.filterNumericTo}
                    value={(columnDef.tableData.filterValue && columnDef.tableData.filterValue[1]) || ''}
                    onChange={(event) => this.handleFilterNumericChange(columnDef, event.target.value, 1)}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end" className={classes.endAdornment}>
                            {
                                ((columnDef.tableData.filterValue && columnDef.tableData.filterValue[1]) || '') !== '' &&
                                <IconButton className={classes.clearIcon} onClick={() => this.handleFilterNumericChange(columnDef, '', 1)}>
                                    <ClearIcon />
                                </IconButton>
                            }
                                <Typography component="p" variant="body1" color="textSecondary" >
                                    ]
                                </Typography>
                            </InputAdornment>
                        )
                    }}
                />
            </>
        );
    }
    renderDefaultFilter = (columnDef) => {
        const { classes } = this.props;

        return (
            <TextField
                autoFocus
                style={columnDef.type === 'numeric' ? { float: 'right' } : {}}
                type={columnDef.type === 'numeric' ? 'number' : 'text'}
                value={columnDef.tableData.filterValue || ''}
                onChange={(event) => {
                    this.props.onFilterChanged(columnDef.tableData.id, event.target.value);
                }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <></>
                        </InputAdornment>
                    ),
                    endAdornment: (
                        <>
                        {
                            (columnDef.tableData.filterValue || '') !== '' &&
                            <InputAdornment position="end" className={classes.endAdornment}>
                                <IconButton className={classes.clearIcon} onClick={() => this.props.onFilterChanged(columnDef.tableData.id, '')}>
                                    <ClearIcon />
                                </IconButton>
                            </InputAdornment>
                        }
                        </>
                    )
                }}
            />
        );
    }
    renderDateTypeFilter = (columnDef) => {
        let dateInputElement = null;
        const onDateInputChange = date => this.props.onFilterChanged(columnDef.tableData.id, date);

        if (columnDef.type === 'date') {
            dateInputElement = (
                <DatePicker
                    value={columnDef.tableData.filterValue || null}
                    onChange={onDateInputChange}
                    clearable
                />
            );
        } else if (columnDef.type === 'datetime') {
            dateInputElement = (
                <DateTimePicker
                    value={columnDef.tableData.filterValue || null}
                    onChange={onDateInputChange}
                    clearable
                />
            );
        } else if (columnDef.type === 'time') {
            dateInputElement = (
                <TimePicker
                    value={columnDef.tableData.filterValue || null}
                    onChange={onDateInputChange}
                    clearable
                />
            );
        }

        return (
            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                {dateInputElement}
            </MuiPickersUtilsProvider>
        );
    }
    render() {
        const columnDef = this.props.columnDef;
        if (columnDef.filtering === false) return null;
        const { classes } = this.props;
        const popoverOpened = this.state.anchorEl !== null;
        return (
            <span title={this.getFilterTitle()} className={classes.filterIconWrapper}>
                <this.props.icons.Filter
                    className={(columnDef.tableData.filterValue
                        ? classes.filterIconFilled
                        : (popoverOpened ? '' : 'empty-header-filter-button ') + classes.filterIconEmpty)
                    }
                    aria-owns={popoverOpened ? 'filter-popover' : undefined}
                    aria-haspopup="true"
                    variant="contained"
                    onClick={e => this.handleOpenPopoverButtonClick(e)}
                />
                <Popover
                    id='filter-popover'
                    open={popoverOpened}
                    anchorEl={this.state.anchorEl}
                    onClose={this.handlePopoverClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'center',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'center',
                    }}
                >
                    <div className={classes.filterBody}>
                        {this.renderFilterBody(columnDef)}
                    </div>
                </Popover>
            </span>);
    }
}

export const styles = theme => ({
    clearIcon: {
        width: '22px',
        height: '22px',
        padding: '4px',
        '& svg': {
            width: '16px',
            height: '16px'
        }

    },
    filterIconWrapper: {
        width: '24px',
        height: '24px'
    },
    filterIconFilled: {
        verticalAlign: 'middle',
        cursor: 'pointer',
        color: 'rgba(0, 0, 0, 1)'

    },
    filterIconEmpty: {
        verticalAlign: 'middle',
        cursor: 'pointer',
        color: 'rgba(0, 0, 0, 0.2)',
    },
    filterBody: {
        padding: '4px'
    },
    filterCheckbox: {
        padding: '12px'
    },
    filterList: {
        padding: '0'
    },
    filterListItem: {
        marginRight: '14px'
    },
    filterListFooter: {
        position: 'sticky',
        bottom: 0,
        backgroundColor: 'white'
    },
    filterListClearLink: {
        marginTop: '10px',
        marginBottom: '10px',
        cursor: 'pointer',
        display: 'block',
        textAlign: 'center',
        width: '100%',
    },
    filterText: {
        fontSize: '1rem',
        fontWeight: '400',
        lineHeight: '1.5em'
    },
    filterNumericFrom: {
        width: '80px',
        marginRight: '5px'
    },
    filterNumericTo: {
        width: '80px',
        marginLeft: '5px'
    },
    startAdornment: {
        marginRight: 0
    },
    endAdornment: {
        marginLeft: 0
    }
});

MTableFilterButton.defaultProps = {
    localization: {
        clearFilter: 'Clear',
        selectAll: 'Select all'
    }
  };

MTableFilterButton.propTypes = {
    icons: PropTypes.object.isRequired,
    columnDef: PropTypes.object.isRequired,
    onFilterChanged: PropTypes.func.isRequired,
    classes: PropTypes.object,
    localization: PropTypes.object,
};

export default withStyles(styles)(MTableFilterButton);