
import * as moment from "moment";

import * as DateUtils from "./common/dateUtils";

class DateRange {

    private start: Date | null;
    private end: Date | null;

    constructor(start?: Date, end?: Date) {
        this.start = start;
        this.end = end;
    }

    // do we need exclusive for each of these methods?
    // not crystal clear how it would behave for containsMonth and containsRange
    public containsDate(date: Date, exclusive = false) {
        if (date == null) {
            return false;
        }

        const day = DateUtils.clone(date);
        const start = DateUtils.clone(this.start);
        const end = DateUtils.clone(this.end);

        day.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        const isDayInRangeInclusive = start <= day && day <= end;
        const isDayInRangeExclusive = isDayInRangeInclusive
            && !DateUtils.areSameDay(start, day)
            && !DateUtils.areSameDay(day, end);

        return (exclusive) ? isDayInRangeExclusive : isDayInRangeInclusive;
    }

    public containsMonth(date: Date) {
        if (date == null) {
            return false;
        }

        const day = DateUtils.clone(date);
        const start = DateUtils.clone(this.start);
        const end = DateUtils.clone(this.end);

        day.setDate(1);
        start.setDate(1);
        end.setDate(1);

        day.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        return start <= day && day <= end;
    }

    public containsRange(innerRange: DateRange) {
        if (innerRange == null) {
            return false;
        }

        const [innerRangeStart, innerRangeEnd] = innerRange.toDateArray();

        const containsStartDate = innerRangeStart == null || this.containsDate(innerRangeStart);
        const containsEndDate = innerRangeEnd == null || this.containsDate(innerRangeEnd);

        return containsStartDate && containsEndDate;
    }

    public getMidpoint() {
        if (this.start == null || this.end == null) {
            return null;
        }

        const start = this.start.getTime();
        const end = this.end.getTime();
        const middle = start + (end - start) * 0.5;

        return new Date(middle);
    }

    public toString(format?: string) {
        const [startString, endString] = this.toDateStrings(format);
        return `${startString} - ${endString}`;
    }

    public toDateStrings(format?: string) {
        const startString = this.formatDate(this.start, format);
        const endString = this.formatDate(this.end, format);
        return [startString, endString];
    }

    public toDateArray() {
        const start = DateUtils.clone(this.start);
        const end = DateUtils.clone(this.end);
        return [start, end];
    }

    private formatDate(date: Date, format?: string) {
        return moment(date).format(format);
    }

    // public toMomentArray() => moment.Moment[]; // is this too much surface area for this class?

    // experimental methods to pull crazy-pants logic out of the date-range picker.
    // but these would assume that the start and end dates are mutable, which might
    // be more trouble than it's worth.
    // updateStartDate(date: Date);
    // updateEndDate(date: Date);
}
