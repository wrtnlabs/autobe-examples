import { tags } from "typia";

export namespace IWeeklySummaryReport {
  /**
   * Weekly summary report entry representing aggregated time tracking statistics for a single ISO week (Monday-Sunday period). This DTO is used in paginated responses to provide management oversight and resource planning insights across the organization. Each entry includes the week's start date, total hours logged by all employees, count of time entries, and number of unique employees who logged time during that week. The report helps identify workload patterns, employee engagement levels, and resource allocation trends for organizational planning.
   */
  export type ISummary = {
    /**
     * Monday date of the ISO week in YYYY-MM-DDT00:00:00Z format. Represents the start of the weekly reporting period (Monday-Sunday).
     *
     * @x-autobe-specification Computed from timelog date range. Extract Monday date of ISO week (YYYY-MM-DDT00:00:00Z format) for the week period containing timelogs. Implementation: DATE_TRUNC('week', timelog.date) in PostgreSQL or equivalent ISO week calculation.
     */
    week_start_date: string & tags.Format<"date-time">;

    /**
     * Total hours logged by all employees during this week. Calculated as the sum of all timelog durations divided by 60 (converting minutes to hours).
     *
     * @x-autobe-specification Computed as SUM(timelogs.duration_minutes) / 60. Aggregates all timelog duration_minutes values for the week, converted from minutes to hours as a decimal number.
     */
    total_hours: number;

    /**
     * Total number of time entries (timelogs) recorded during this week. Represents the count of individual work sessions logged by employees.
     *
     * @x-autobe-specification Computed as COUNT(*) on timelogs table filtered by organization and week date range. Counts all time entries (timelogs) recorded during the ISO week period.
     */
    timelog_count: number & tags.Type<"int32">;

    /**
     * Number of unique employees who logged time during this week. Counts distinct employee_id values from timelogs, representing active time-tracking participation.
     *
     * @x-autobe-specification Computed as COUNT(DISTINCT timelogs.employee_id) on timelogs table filtered by organization and week date range. Counts unique employees who logged at least one timelog during the ISO week period.
     */
    employee_count: number & tags.Type<"int32">;
  };

  /**
   * Request parameters for filtering and paginating the weekly summary report. The report shows time tracking statistics aggregated by week (Monday-Sunday periods) across the organization, including total hours logged, number of time entries, and count of employees who logged time during each week. Designed for management oversight and resource planning to identify workload patterns and resource allocation trends.
   */
  export type IRequest = {
    /**
     * Start date of the report period (inclusive, ISO 8601 date format YYYY-MM-DD)
     *
     * @x-autobe-specification Filter parameter defining the start date of the report period (inclusive). ISO 8601 date format YYYY-MM-DD. Used to filter timelogs where date >= start_date.
     */
    start_date?: (string & tags.Format<"date">) | undefined;

    /**
     * End date of the report period (inclusive, ISO 8601 date format YYYY-MM-DD)
     *
     * @x-autobe-specification Filter parameter defining the end date of the report period (inclusive). ISO 8601 date format YYYY-MM-DD. Used to filter timelogs where date <= end_date.
     */
    end_date?: (string & tags.Format<"date">) | undefined;

    /**
     * Optional project identifier to filter the report to a specific project (UUID format)
     *
     * @x-autobe-specification Optional filter parameter to scope the report to a specific project. UUID format. When provided, only timelogs associated with this project are included in the aggregation. If omitted, includes all projects in the organization.
     */
    project_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Page number for pagination (1-based, minimum 1, defaults to 1)
     *
     * @x-autobe-specification 1-based page number for pagination. Minimum value is 1. Defaults to 1 if not provided. Used with page_size to determine offset for query results.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of records per page (minimum 1, maximum 100, defaults to 20)
     *
     * @x-autobe-specification Number of records per page. Minimum 1, maximum 100. Defaults to 20 if not provided. Combined with page parameter to control result set size.
     */
    page_size?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Field to sort results by: 'week_start_date', 'total_hours', or 'employee_count'
     *
     * @x-autobe-specification Sorting field for results. Accepts enum values: 'week_start_date' (sort by week Monday date), 'total_hours' (sort by aggregated hours descending), or 'employee_count' (sort by unique employee count descending). Default is 'week_start_date' if not specified.
     */
    order_by?: "week_start_date" | "total_hours" | "employee_count" | undefined;

    /**
     * Maximum number of records per page (defaults to 100 if not provided)
     *
     * @x-autobe-specification Maximum number of records to return per page. Integer >= 0, or null. If omitted, null, or undefined, defaults to 100 records per page. The server may enforce upper bounds to prevent excessive resource consumption.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
