import { tags } from "typia";

export namespace IHrmPlatformProjectWeeklySummary {
  /**
   * Weekly time tracking summary for a project, aggregating all non-deleted timelogs into Monday-through-Sunday week buckets.
   *
   * Each record represents one calendar week of activity for a specific project, showing the total hours logged, number of timelog entries, and count of distinct employees who contributed time. This is a computed aggregation — not mapped to any database table.
   *
   * Primarily used for week-by-week project time reports, budget utilization trend analysis, and organizational productivity dashboards.
   */
  export type ISummary = {
    /**
     * The Monday timestamp marking the beginning of the week for which this summary is calculated. Used as the primary key for week boundaries.
     *
     * Derived by truncating the timelog date to ISO week start (Monday). All timelogs falling within this Monday-through-Sunday range are aggregated into this single summary record.
     *
         * @x-autobe-specification Computed as the Monday timestamp for each
         *   week bucket. Derived by truncating the timelog's date column
         *   (hrm_platform_timelogs.date) to the start of the ISO week (Monday).
         *   Used as the GROUP BY key and the start of the week range.
     */
    week_start: string & tags.Format<"date-time">;

    /**
     * The Sunday timestamp marking the end of the week for which this summary is calculated.
     *
     * Calculated by adding 6 days to week_start, ensuring the week spans Monday through Sunday. This forms the temporal boundary of the aggregated period.
     *
         * @x-autobe-specification Computed as week_start + 6 days. Represents
         *   the Sunday timestamp ending the week. This follows the fixed
         *   Monday-to-Sunday weekly period defined in the timesheet domain
         *   model.
     */
    week_end: string & tags.Format<"date-time">;

    /**
     * The total number of hours logged across all timelogs for the project during this week.
     *
     * Calculated by summing all duration_minutes values from non-deleted timelogs associated with the project and dividing by 60. Includes both billable and non-billable work.
     *
         * @x-autobe-specification Computed as SUM(duration_minutes) / 60 from
         *   hrm_platform_timelogs.duration_minutes, filtered to timelogs within
         *   this week. Rounded to the nearest minute precision. Sum includes
         *   all non-deleted timelogs for the specified project within the week
         *   boundaries.
     */
    total_hours: number;

    /**
     * The total number of individual timelog entries recorded for the project during this week.
     *
     * Counts all non-deleted timelog rows associated with the project within this week's date range, regardless of which employee logged them or whether they are billable.
     *
         * @x-autobe-specification Computed as COUNT(*) of non-deleted timelogs
         *   (deleted_at IS NULL) for the specified project within this week.
         *   Represents the number of individual timelog entries aggregated into
         *   this summary.
     */
    timelogs_count: number & tags.Type<"int32">;

    /**
     * The number of distinct employees who logged at least one timelog for the project during this week.
     *
     * Calculated by counting unique hrm_platform_employee_id values among all non-deleted timelogs within the week. Multiple timelogs from the same employee count as one.
     *
         * @x-autobe-specification Computed as COUNT(DISTINCT
         *   hrm_platform_employee_id) from non-deleted timelogs for the
         *   specified project within this week. Counts unique employees who
         *   logged time, using the hrm_platform_employee_id column as the
         *   distinctivity key.
     */
    employee_count: number & tags.Type<"int32">;
  };
}
