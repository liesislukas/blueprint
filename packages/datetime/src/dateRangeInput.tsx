/*
 * Copyright 2016 Palantir Technologies, Inc. All rights reserved.
 * Licensed under the BSD-3 License as modified (the “License”); you may obtain a copy
 * of the license at https://github.com/palantir/blueprint/blob/master/LICENSE
 * and https://github.com/palantir/blueprint/blob/master/PATENTS
 */

import * as classNames from "classnames";
import * as moment from "moment";
import * as React from "react";

import {
    AbstractComponent,
    Button,
    Classes,
    InputGroup,
    Intent,
    IProps,
    Keys,
    Popover,
    Position,
    // Utils,
} from "@blueprintjs/core";

import * as DateClasses from "./common/classes";
import {
    areSameDay,
    DateRange,
    DateRangeBoundary,
    fromDateRangeToMomentArray,
    fromDateToMoment,
    fromMomentToDate,
    toDateRange,
    toFormattedDateString,
} from "./common/dateUtils";
import {
    getDefaultMaxDate,
    getDefaultMinDate,
    IDatePickerBaseProps,
} from "./datePickerCore";
import { DateRangePicker, IDateRangeShortcut } from "./dateRangePicker";

export interface IDateRangeInputProps extends IDatePickerBaseProps, IProps {
    /**
     * Whether the start and end dates of the range can be the same day.
     * If `true`, clicking a selected date will create a one-day range.
     * If `false`, clicking a selected date will clear the selection.
     * @default false
     */
    allowSingleDayRange?: boolean;

    /**
     * Whether to change placeholder text to reflect an unbounded date range
     * when only one of the start date or end date is selected.
     */
    allowUnboundedDateRange?: boolean;

    /**
     * Whether the calendar popover should close when a date range is selected.
     * @default true
     */
    closeOnSelection?: boolean;

    /**
     * Whether the component should be enabled or disabled.
     * @default false
     */
    disabled?: boolean;

    /**
     * Initial DateRange the calendar will display as selected.
     * This should not be set if `value` is set.
     */
    defaultValue?: DateRange;

    /**
     * The format of the date. See options
     * here: http://momentjs.com/docs/#/displaying/format/
     * @default "YYYY-MM-DD"
     */
    format?: string;

    /**
     * The error message to display when the selected date is invalid.
     * @default "Invalid date"
     */
    invalidDateMessage?: string;

    /**
     * The error message to display when the selected end date is invalid.
     * @default "Invalid date"
     */
    invalidEndDateMessage?: string;

    /**
     * Called when the user selects a day.
     * If no days are selected, it will pass `[null, null]`.
     * If a start date is selected but not an end date, it will pass `[selectedDate, null]`.
     * If both a start and end date are selected, it will pass `[startDate, endDate]`.
     */
    onChange?: (selectedDates: DateRange) => void;

    /**
     * Called when the user finishes typing in a new date and the date causes an error state.
     * If the date is invalid, `new Date(undefined)` will be returned. If the date is out of range,
     * the out of range date will be returned (`onChange` is not called in this case).
     */
    onError?: (errorDate: Date) => void;

    /**
     * If true, the Popover will open when the user clicks on the input. If false, the Popover will only
     * open when the calendar icon is clicked.
     * @default true
     */
    openOnFocus?: boolean;

    /**
     * The error message to display when the date selected is out of range.
     * @default "Out of range"
     */
    outOfRangeMessage?: string;

    /**
     * The position the date popover should appear in relative to the input box.
     * @default Position.BOTTOM
     */
    popoverPosition?: Position;

    /**
     * Whether all the text in each input should be selected on focus.
     * @default false
     */
    selectAllOnFocus?: boolean;

    /**
     * Whether shortcuts to quickly select a range of dates are displayed or not.
     * If `true`, preset shortcuts will be displayed.
     * If `false`, no shortcuts will be displayed.
     * If an array, the custom shortcuts provided will be displayed.
     * @default true
     */
    shortcuts?: boolean | IDateRangeShortcut[];

    /**
     * Whether to show the icon button.
     * @default true
     */
    showIcon?: boolean;

    /**
     * The currently selected DateRange.
     * If this prop is present, the component acts in a controlled manner.
     */
    value?: DateRange;
}

export interface IDateRangeInputState {
    isOpen?: boolean;

    mostRecentlyFocusedField?: DateRangeBoundary;

    isStartDateInputFocused?: boolean;
    startDateHoverValueString?: string;
    startDateValue?: moment.Moment;
    startDateValueString?: string;

    isEndDateInputFocused?: boolean;
    endDateHoverValueString?: string;
    endDateValue?: moment.Moment;
    endDateValueString?: string;

    boundaryToModify?: DateRangeBoundary;
    wasLastFocusChangeDueToHover?: boolean;
}

export class DateRangeInput extends AbstractComponent<IDateRangeInputProps, IDateRangeInputState> {
    public static defaultProps: IDateRangeInputProps = {
        allowSingleDayRange: false,
        allowUnboundedDateRange: false,
        closeOnSelection: false,
        disabled: false,
        format: "YYYY-MM-DD",
        invalidDateMessage: "Invalid date",
        invalidEndDateMessage: "Invalid end date",
        maxDate: getDefaultMaxDate(),
        minDate: getDefaultMinDate(),
        openOnFocus: true,
        outOfRangeMessage: "Out of range",
        popoverPosition: Position.BOTTOM_LEFT,
        selectAllOnFocus: true,
        shortcuts: true,
        showIcon: true,
    };

    public displayName = "Blueprint.DateRangeInput";

    private startDateInputRef: HTMLElement = null;
    private endDateInputRef: HTMLElement = null;

    public constructor(props: IDateRangeInputProps, context?: any) {
        super(props, context);

        const [defaultStartDateValue, defaultEndDateValue] = this.getDefaultDateRange();

        const startDateValue = (this.props.value !== undefined && this.props.value[0] != null)
            ? fromDateToMoment(this.props.value[0])
            : defaultStartDateValue;

        const endDateValue = (this.props.value !== undefined && this.props.value[1] != null)
            ? fromDateToMoment(this.props.value[1])
            : defaultEndDateValue;

        this.state = {
            endDateValue,
            endDateValueString: null,
            isEndDateInputFocused: false,
            isOpen: false,
            isStartDateInputFocused: false,
            startDateValue,
            startDateValueString: null,
            wasLastFocusChangeDueToHover: false,
        };
    }

    public componentDidUpdate() {
        if (this.state.isStartDateInputFocused && document.activeElement !== this.startDateInputRef) {
            this.startDateInputRef.focus();
        } else if (this.state.isEndDateInputFocused && document.activeElement !== this.endDateInputRef) {
            this.endDateInputRef.focus();
        }
    }

    public render() {
        const { allowSingleDayRange, format } = this.props;
        const {
            endDateHoverValueString,
            endDateValueString,
            isEndDateInputFocused,
            isStartDateInputFocused,
            startDateValueString,
            startDateHoverValueString,
        } = this.state;

        // Date values

        const startDateValue = (isStartDateInputFocused)
            ? moment(startDateValueString, format)
            : this.state.startDateValue;

        const endDateValue = (isEndDateInputFocused)
            ? moment(endDateValueString, format)
            : this.state.endDateValue;

        // Date strings

        let startDateString: string;
        let endDateString: string;

        if (startDateHoverValueString != null) {
            startDateString = startDateHoverValueString;
        } else {
            startDateString = (isStartDateInputFocused)
                ? startDateValueString
                : this.getDateStringForDisplay(this.state.startDateValue);
        }

        if (endDateHoverValueString != null) {
            endDateString = endDateHoverValueString;
        } else {
            endDateString = (isEndDateInputFocused)
                ? endDateValueString
                : (endDateValue.isBefore(startDateValue)
                    ? this.props.invalidEndDateMessage
                    : this.getDateStringForDisplay(this.state.endDateValue));
        }

        // Placeholders

        const startDatePlaceholder = this.getStartDateInputPlaceholder(startDateString, endDateString);
        const endDatePlaceholder = this.getEndDateInputPlaceholder(startDateString, endDateString);

        // Classes

        const isStartDateInputInErrorState = !(
            this.isDateValidAndInRange(startDateValue)
            || this.isNull(startDateValue)
            || startDateString === ""
            || startDateString === startDateHoverValueString
        );

        // maybe it makes more sense just to handle overlapping typed dates by null'ing the other date.
        // that would make it consistent with the clicking interactions.
        const isEndDaySameAsStartDay = areSameDay(startDateValue.toDate(), endDateValue.toDate());
        const isEndDateInputInErrorState =
            !(
                this.isDateValidAndInRange(endDateValue)
                || this.isNull(endDateValue)
                || endDateString === ""
                || endDateString === endDateHoverValueString
            )
            // TODO: ignore the lingering hour difference between these two dates.
            || (endDateValue.isBefore(startDateValue) && !isEndDaySameAsStartDay);

        const startDateInputClasses = classNames(DateClasses.DATERANGEINPUT_FIELD, {
            "pt-intent-danger": isStartDateInputInErrorState,
        });
        const endDateInputClasses = classNames(DateClasses.DATERANGEINPUT_FIELD, {
            "pt-intent-danger": isEndDateInputInErrorState,
        });

        // null isn't handled well for minDate and maxDate in DateRangePicker,
        // so coerce to undefined if necessary
        const popoverClasses = classNames({ [DateClasses.DATERANGEINPUT_ALLOWSINGLEDAYRANGE]: allowSingleDayRange });
        const popoverContent = (
            <DateRangePicker
                allowSingleDayRange={allowSingleDayRange}
                className={popoverClasses}
                maxDate={this.props.maxDate || undefined}
                minDate={this.props.minDate || undefined}
                boundaryToModify={this.state.boundaryToModify}
                onChange={this.handleDateRangeChange}
                onHoverChange={this.handleHoverChange}
                onDayMouseEnter={this.handleDayMouseEnter}
                shortcuts={this.props.shortcuts}
                value={this.getCurrentDateRange()}
            />
        );

        return (
            <Popover
                autoFocus={false}
                content={popoverContent}
                enforceFocus={false}
                inline={true}
                isOpen={this.state.isOpen}
                onClose={this.handleClosePopover}
                popoverClassName={DateClasses.DATERANGEINPUT_POPOVER}
                position={Position.BOTTOM_LEFT}
                useSmartArrowPositioning={false}
            >
                <div className={Classes.CONTROL_GROUP}>
                    <InputGroup
                        className={startDateInputClasses}
                        disabled={this.props.disabled}
                        inputRef={this.setStartDateInputRef}
                        onBlur={this.handleStartDateInputBlur}
                        onChange={this.handleStartDateInputChange}
                        onClick={this.handleGenericInputClick}
                        onFocus={this.handleStartDateInputFocus}
                        onKeyDown={this.handleGenericInputKeyDown}
                        placeholder={startDatePlaceholder}
                        type="text"
                        value={startDateString || ""}
                    />
                    <InputGroup
                        className={endDateInputClasses}
                        disabled={this.props.disabled}
                        inputRef={this.setEndDateInputRef}
                        onBlur={this.handleEndDateInputBlur}
                        onChange={this.handleEndDateInputChange}
                        onClick={this.handleGenericInputClick}
                        onFocus={this.handleEndDateInputFocus}
                        onKeyDown={this.handleGenericInputKeyDown}
                        placeholder={endDatePlaceholder}
                        type="text"
                        value={endDateString || ""}
                    />
                    {this.maybeRenderIcon()}
                </div>
            </Popover>
        );
    }

    private maybeRenderIcon() {
        if (!this.props.showIcon) {
            return undefined;
        }
        // the icon element contains a button that toggles the popover on
        // click. this button needs to be visually inside of the input group
        // along with the start- and end-date input fields, but at the same time
        // not contained within either input field. this means we can't use a
        // stock input group, so we have to get creative field.
        return (
            <div className={`${DateClasses.DATERANGEINPUT_TRIGGER} pt-input-group`}>
                <div className={classNames(Classes.INPUT, { [Classes.DISABLED]: (this.props.disabled) })}>
                    <Button
                        className="pt-minimal pt-icon-calendar"
                        disabled={this.props.disabled}
                        intent={Intent.PRIMARY}
                        onClick={this.handleIconClick}
                    />
                </div>
            </div>
        );
    }

    // Input refs

    private setStartDateInputRef = (el: HTMLElement) => {
        this.startDateInputRef = el;
    }

    private setEndDateInputRef = (el: HTMLElement) => {
        this.endDateInputRef = el;
    }

    // Getters

    private getDefaultDateRange = () => {
        const defaultDateRange = this.props.defaultValue;
        return (defaultDateRange != null)
            ? fromDateRangeToMomentArray(defaultDateRange)
            : fromDateRangeToMomentArray([null, null]);
    }

    private getCurrentDateRange = () => {
        const startDate = this.isDateValidAndInRange(this.state.startDateValue)
                ? fromMomentToDate(this.state.startDateValue)
                : null;
        const endDate = this.isDateValidAndInRange(this.state.endDateValue)
                ? fromMomentToDate(this.state.endDateValue)
                : null;
        if (endDate < startDate) {
            return toDateRange(startDate, null);
        } else {
            return toDateRange(startDate, endDate);
        }
    }

    private getDateStringForDisplay = (value: moment.Moment) => {
        if (this.isNull(value)) {
            return "";
        } else if (!value.isValid()) {
            return this.props.invalidDateMessage;
        } else if (!this.dateIsInRange(value)) {
            return this.props.outOfRangeMessage;
        } else {
            return value.format(this.props.format);
        }
    }

    private getStartDateInputPlaceholder = (startDateString: string, endDateString: string) => {
        const { minDate } = this.props;
        if (this.state.isStartDateInputFocused && minDate != null) {
            return toFormattedDateString(minDate, this.props.format);
        } else if (this.props.allowUnboundedDateRange && (startDateString || endDateString)) {
            return "All before";
        } else {
            return "Start date";
        }
    }

    private getEndDateInputPlaceholder = (startDateString: string, endDateString: string) => {
        const { maxDate } = this.props;
        if (this.state.isEndDateInputFocused && maxDate != null) {
            return toFormattedDateString(maxDate, this.props.format);
        } else if (this.props.allowUnboundedDateRange && (startDateString || endDateString)) {
            return "All after";
        } else {
            return "End date";
        }
    }

    // Boolean functions

    private isDateValidAndInRange(value: moment.Moment) {
        return value != null && value.isValid() && this.dateIsInRange(value);
    }

    private isNull(value: moment.Moment) {
        return value == null || value.parsingFlags().nullInput;
    }

    private dateIsInRange(value: moment.Moment) {
        const { minDate, maxDate } = this.props;
        if (minDate == null || maxDate == null) {
            return true;
        }
        return value != null && value.isBetween(minDate, maxDate, "day", "[]");
    }

    // Callback handlers

    private handleHoverChange = (hoveredRange: DateRange) => {
        if (hoveredRange == null) {
            this.setState({ startDateHoverValueString: null, endDateHoverValueString: null });
        } else {
            const [hoveredStart, hoveredEnd] = fromDateRangeToMomentArray(hoveredRange);
            const hoveredStartString = this.getDateStringForDisplay(hoveredStart);
            const hoveredEndString = this.getDateStringForDisplay(hoveredEnd);

            // assign to clearer variable names
            const selectedStart = this.state.startDateValue;
            const selectedEnd = this.state.endDateValue;

            const isStartNull = this.isNull(selectedStart);
            const isEndNull = this.isNull(selectedEnd);

            const isExactlyOneBoundarySelected = (!isStartNull && isEndNull) || (isStartNull && !isEndNull);

            if (isExactlyOneBoundarySelected) {
                if (isEndNull) {
                    // this means a start date is already selected
                    const doesHoverRangeStartOnSelectedStartDate = hoveredStart.diff(selectedStart, "days") === 0;
                    if (doesHoverRangeStartOnSelectedStartDate) {
                        // continue editing the end date
                        this.endDateInputRef.focus();
                    } else {
                        // the user is hovering over an end date that precedes
                        // the selected start date, so we flip the focus state
                        this.startDateInputRef.focus();
                    }
                } else {
                    // start is null
                    const doesHoverRangeEndOnSelectedEndDate = hoveredEnd.diff(selectedEnd, "days") === 0;
                    if (doesHoverRangeEndOnSelectedEndDate) {
                        // continue editing the start date
                        this.startDateInputRef.focus();
                    } else {
                        // the user is hovering over a start date that exceeds
                        // the selected end date, so we flip the focus state
                        this.endDateInputRef.focus();
                    }
                }
            }

            this.setState({
                endDateHoverValueString: hoveredEndString,
                startDateHoverValueString: hoveredStartString,
                wasLastFocusChangeDueToHover: true,
            });
        }
    }

    private handleDayMouseEnter = () => {
        const { mostRecentlyFocusedField } = this.state;

        const isNeitherInputFocused = !this.state.isStartDateInputFocused && !this.state.isEndDateInputFocused;

        if (isNeitherInputFocused && mostRecentlyFocusedField === DateRangeBoundary.START) {
            this.setState({ isStartDateInputFocused: true });
        } else if (isNeitherInputFocused && mostRecentlyFocusedField === DateRangeBoundary.END) {
            this.setState({ isEndDateInputFocused: true });
        }
    }

    private handleIconClick = (e: React.SyntheticEvent<HTMLElement>) => {
        if (this.state.isOpen) {
            if (this.startDateInputRef != null) {
                this.startDateInputRef.blur();
            }
            if (this.endDateInputRef != null) {
                this.endDateInputRef.blur();
            }
        } else {
            this.setState({ isOpen: true });
            e.stopPropagation();
            if (this.startDateInputRef != null) {
                this.startDateInputRef.focus();
            }
            if (this.endDateInputRef != null) {
                this.endDateInputRef.blur();
            }
        }
    }

    private handleStartDateInputFocus = (e: React.FormEvent<HTMLInputElement>) => {
        const value = this.state.startDateValue;
        const valueStringKey = "startDateValueString";
        const focusStateKey = "isStartDateInputFocused";
        const boundaryToModify = DateRangeBoundary.START;
        this.handleGenericInputFocus(e, value, valueStringKey, focusStateKey, boundaryToModify);
    }

    private handleEndDateInputFocus = (e: React.FormEvent<HTMLInputElement>) => {
        const value = this.state.endDateValue;
        const valueStringKey = "endDateValueString";
        const focusStateKey = "isEndDateInputFocused";
        const boundaryToModify = DateRangeBoundary.END;
        this.handleGenericInputFocus(e, value, valueStringKey, focusStateKey, boundaryToModify);
    }

    private handleStartDateInputBlur = () => {
        const valueString = this.state.startDateValueString;
        this.handleGenericInputBlur(valueString, "startDateValue", "startDateValueString", "isStartDateInputFocused");
    }

    private handleEndDateInputBlur = () => {
        const valueString = this.state.endDateValueString;
        this.handleGenericInputBlur(valueString, "endDateValue", "endDateValueString", "isEndDateInputFocused");
    }

    private handleStartDateInputChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
        const valueString = (e.target as HTMLInputElement).value;
        this.handleGenericInputChange(valueString, "startDateValue", "startDateValueString", "startDateHoverValueString");
    }

    private handleEndDateInputChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
        const valueString = (e.target as HTMLInputElement).value;
        this.handleGenericInputChange(valueString, "endDateValue", "endDateValueString", "endDateHoverValueString");
    }

    private handleGenericInputFocus =
        (e: React.FormEvent<HTMLInputElement>,
         value: moment.Moment,
         valueStringKey: string,
         focusStateKey: string,
         boundaryToModify: DateRangeBoundary) => {

        if (this.props.selectAllOnFocus) {
            e.currentTarget.select();
        }

        const valueString = this.isNull(value)
            ? ""
            : value.format(this.props.format);

        const sanitizedBoundaryToModify = (this.state.wasLastFocusChangeDueToHover)
            ? this.state.boundaryToModify
            : boundaryToModify;

        if (this.props.openOnFocus) {
            this.setState({
                [focusStateKey]: true,
                [valueStringKey]: valueString,
                boundaryToModify: sanitizedBoundaryToModify,
                isOpen: true,
                mostRecentlyFocusedField: boundaryToModify,
                wasLastFocusChangeDueToHover: false,
            });
        } else {
            this.setState({ [focusStateKey]: true,
                [valueStringKey]: valueString,
                boundaryToModify: sanitizedBoundaryToModify,
                mostRecentlyFocusedField: boundaryToModify,
                wasLastFocusChangeDueToHover: false,
            });
        }
    }

    private handleGenericInputBlur =
        (valueString: string, valueKey: string, valueStringKey: string, focusStatusKey: string) => {

        const value = moment(valueString, this.props.format);

        const isValueInvalid = !value.isValid();
        const isValueOutOfRange = !this.dateIsInRange(value);
        const isValueStringOutOfSync = valueString !== this.getDateStringForDisplay(this.state.startDateValue);

        const isInputEmpty = valueString == null || valueString.length === 0;
        const didInputChangeToInvalidState =
            !isInputEmpty && isValueStringOutOfSync && (isValueInvalid || isValueOutOfRange);

        if (isInputEmpty) {
            this.setState({
                [focusStatusKey]: false,
                [valueKey]: moment(null),
                [valueStringKey]: null,
            });
        } else if (didInputChangeToInvalidState) {
            if (this.props.value === undefined) {
                this.setState({ [focusStatusKey]: false, [valueKey]: value, [valueStringKey]: null });
            } else {
                this.setState({ [focusStatusKey]: false });
            }

            if (isValueInvalid) {
                // TODO: Call onError with an empty date
            } else if (isValueOutOfRange) {
                // TODO: Call onError with value
            } else {
                // TODO: Call onChange with value
            }
        } else {
            this.setState({ [focusStatusKey]: false });
        }
    }

    private handleGenericInputChange =
        (valueString: string, valueKey: string, valueStringKey: string, hoverValueStringKey: string) => {

        const value = moment(valueString, this.props.format);

        if (valueString.length === 0) {
            // show an empty field for clarity, at least until the mouse moves over a different date
            this.setState({ [valueKey]: null, [valueStringKey]: "", [hoverValueStringKey]: null });
        } else if (value.isValid() && this.dateIsInRange(value)) {
            if (this.props.value === undefined) {
                this.setState({ [valueKey]: value, [valueStringKey]: valueString });
            } else {
                this.setState({ [valueStringKey]: valueString });
            }
            // TODO: Utils.safeInvoke(this.props.onChange, fromMomentToDate(value));
        } else {
            this.setState({ [valueKey]: value, [valueStringKey]: valueString });
        }
    }

    private handleGenericInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const isTabPressed = e.keyCode === Keys.TAB;
        const isShiftPressed = e.shiftKey;

        const willMoveFocusFromStartToEndField = this.state.isStartDateInputFocused && isTabPressed;
        const willMoveFocusFromEndToStartField = this.state.isEndDateInputFocused && isTabPressed && isShiftPressed;
        const willChangeFocusedField = willMoveFocusFromStartToEndField || willMoveFocusFromEndToStartField;

        if (willChangeFocusedField) {
            // this keystroke could have happened in between mouse-hover
            // movements, so we need to explicitly override this flag
            this.setState({ wasLastFocusChangeDueToHover: false });
        }
    }

    private handleGenericInputClick = (e: React.SyntheticEvent<HTMLInputElement>) => {
        e.stopPropagation();
    }

    private handleClosePopover = () => {
        this.setState({ isOpen: false });
    }

    private handleDateRangeChange = (dateRange: DateRange) => {
        const { format } = this.props;
        const [startDate, endDate] = dateRange;

        const startDateValue = fromDateToMoment(startDate);
        const endDateValue = fromDateToMoment(endDate);

        const startDateValueString = (startDate) ? startDateValue.format(format) : "";
        const endDateValueString = (endDate) ? endDateValue.format(format) : "";

        let isStartDateInputFocused: boolean;
        let isEndDateInputFocused: boolean;

        let isOpen = true;
        let startDateHoverValueString: string;
        let endDateHoverValueString: string;

        if (startDate == null) {
            isStartDateInputFocused = true;
            isEndDateInputFocused = false;

            // show an empty field for clarity, at least until the mouse moves over a different date
            startDateHoverValueString = null;
        } else if (endDate == null) {
            isStartDateInputFocused = false;
            isEndDateInputFocused = true;

            // show an empty field for clarity, at least until the mouse moves over a different date
            endDateHoverValueString = null;
        } else {
            isStartDateInputFocused = false;
            isEndDateInputFocused = false;

            if (this.props.closeOnSelection) {
                isOpen = false;
            } else {
                // keep the same field focused to avoid confusing the user
                if (this.state.mostRecentlyFocusedField === DateRangeBoundary.START) {
                    isStartDateInputFocused = true;
                } else {
                    isEndDateInputFocused = true;
                }
            }
        }

        this.setState({
            wasLastFocusChangeDueToHover: false,
            endDateHoverValueString,
            endDateValue,
            endDateValueString,
            isEndDateInputFocused,
            isOpen,
            isStartDateInputFocused,
            startDateHoverValueString,
            startDateValue,
            startDateValueString,
        });
    }
}
