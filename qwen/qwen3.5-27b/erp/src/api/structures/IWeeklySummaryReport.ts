import { tags } from "typia";

export namespace IWeeklySummaryReport {
  /**
   * Lightweight weekly summary report data for list views. Represents aggregated time tracking statistics for a single calendar week (Monday to Sunday).
   *
   * Each weekly summary includes the week boundaries, total hours logged across all employees, the number of time entries recorded, and the count of employees who logged time during that week. This summary type is optimized for display in paginated report lists, excluding detailed breakdowns that would be retrieved through separate endpoints.
   *
   * The data is scoped to the current organization context and can be filtered by specific projects when analyzing time allocation for particular initiatives.
   */
  export type ISummary = {
    /**
     * The Monday date marking the start of the week covered by this summary report.
     *
     * @x-autobe-specification Computed value representing the Monday date of the week. Calculated by truncating the week's start date to remove time component. Format: YYYY-MM-DD (date, not date-time). This is the first day of the 7-day period (Monday through Sunday) covered by this weekly summary.
     */
    week_start_date: string & tags.Format<"date">;

    /**
     * The Sunday date marking the end of the week covered by this summary report.
     *
     * @x-autobe-specification Computed value representing the Sunday date of the week. Calculated as week_start_date + 6 days. Format: YYYY-MM-DD (date, not date-time). This is the last day of the 7-day period (Monday through Sunday) covered by this weekly summary.
     */
    week_end_date: string & tags.Format<"date">;

    /**
     * Total hours worked during the week, calculated by summing all time entries and converting from minutes to hours.
     *
     * @x-autobe-specification Computed aggregation: SUM(timelog.duration) / 60.0. Sums all timelog durations (in minutes) for the week and converts to hours as a decimal value. Example: 40.5 represents 40 hours and 30 minutes. Only includes timelogs where deleted_at IS NULL.
     */
    total_hours: number;

    /**
     * The total number of time entries (timelogs) recorded during this week.
     *
     * @x-autobe-specification Computed aggregation: COUNT(timelog.id). Counts the total number of individual timelog entries recorded during the week. Only includes timelogs where deleted_at IS NULL and belong to the current organization.
     */
    timelog_count: number & tags.Type<"int32">;

    /**
     * The number of unique employees who logged time during this week.
     *
     * @x-autobe-specification Computed aggregation: COUNT(DISTINCT timelog.hrm_platform_employee_id). Counts the number of unique employees who logged at least one time entry during the week. Only includes employees from the current organization.
     */
    employee_count: number & tags.Type<"int32">;
  };

  /**
   * Request parameters for retrieving weekly summary reports. This report aggregates time tracking data organized by calendar week, showing total hours logged, number of time entries, and employee participation for each week within the specified date range.
   *
   * Required parameters include the date range (start_date and end_date) defining the report period. Optional parameters allow filtering by specific project and pagination control.
   *
   * The report covers complete calendar weeks from Monday to Sunday, providing insights into work patterns and productivity trends over time. Results are sorted with the most recent week first.
   */
  export type IRequest = {
    /**
     * Start date of the report period in ISO date format (YYYY-MM-DD). Defines the beginning boundary for weekly summary aggregation.
     *
     * @x-autobe-specification Query parameter defining the beginning of the report period. ISO date format (YYYY-MM-DD). Used to calculate the first calendar week (Monday-Sunday) to include in the aggregated results. Must be before or equal to end_date.
     */
    start_date: string & tags.Format<"date">;

    /**
     * End date of the report period in ISO date format (YYYY-MM-DD). Defines the ending boundary for weekly summary aggregation.
     *
     * @x-autobe-specification Query parameter defining the end of the report period. ISO date format (YYYY-MM-DD). Used to calculate the last calendar week (Monday-Sunday) to include in the aggregated results. Must be after or equal to start_date.
     */
    end_date: string & tags.Format<"date">;

    /**
     * Optional project filter UUID. When provided, limits the weekly summary to show only time tracking data for the specified project.
     *
     * @x-autobe-specification Optional filter parameter to scope the weekly summary report to a specific project. UUID format. When provided, the aggregation JOINs with hrm_platform_timelogs to filter by this project_id, showing only time entries for that project across all weeks in the date range.
     */
    project_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Page number for pagination (1-indexed). Defaults to 1 if not specified.
     *
     * @x-autobe-specification Pagination page number for the weekly summary results. Integer, minimum value 1 (1-indexed). Used to calculate the offset when querying aggregated weekly data. Default is 1 if not provided.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of weekly summary records per page. Minimum 1, maximum 100.
     *
     * @x-autobe-specification Maximum number of weekly summary records to return per page. Integer, minimum 1, maximum 100. Controls the page size for paginated results. Default is typically 20 if not provided.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
