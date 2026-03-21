import { tags } from "typia";

export namespace IErpHrmWeeklySummary {
  /**
   * Weekly summary aggregation showing time tracking metrics for a specific week (Monday to Sunday). Provides managers and administrators with a consolidated view of organization-wide time tracking activity, including total hours worked, the number of time entries logged, and how many employees recorded time during the week.
   */
  export type ISummary = {
    /**
     * The start date of the week (Monday) in ISO 8601 date format (YYYY-MM-DD).
     */
    week_start_date: string & tags.Format<"date">;

    /**
     * The end date of the week (Sunday) in ISO 8601 date format (YYYY-MM-DD).
     */
    week_end_date: string & tags.Format<"date">;

    /**
     * Total hours logged during this week across all employees. Calculated as the sum of all timelog durations in minutes divided by 60.
     */
    total_hours: number & tags.Minimum<0>;

    /**
     * The number of individual time entries (timelogs) recorded during this week.
     */
    timelog_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * The number of unique employees who logged time during this week.
     */
    employee_count: number & tags.Type<"int32"> & tags.Minimum<0>;
  };

  /**
   * Request parameters for generating a weekly summary report. Provides filtering by date range and optional project, with pagination support for large date ranges. Returns aggregated time tracking metrics organized by calendar week (Monday to Sunday).
   */
  export type IRequest = {
    /**
     * Start date for the report period (inclusive). Only weeks containing dates from this point forward are included in the summary.
     *
     * @x-autobe-specification Date range filter parameter applied to erp_hrm_timelogs.start_at column. Used in WHERE clause: start_at >= :from. Combined with 'to' parameter to define the report period. Week boundaries are calculated from this date - the earliest week included starts on the Monday of the week containing this date.
     */
    from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for the report period (inclusive). Only weeks containing dates up to this point are included in the summary.
     *
     * @x-autobe-specification Date range filter parameter applied to erp_hrm_timelogs.start_at column. Used in WHERE clause: start_at <= :to. Combined with 'from' parameter to define the report period. Week boundaries are calculated from this date - the latest week included ends on the Sunday of the week containing this date.
     */
    to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter results to a specific project. When provided, only time entries for this project are included in the weekly aggregations.
     *
     * @x-autobe-specification Optional project filter. When provided, filters erp_hrm_timelogs by project_id foreign key column: WHERE timelogs.project_id = :project_id. Must reference an existing project within the organization context. When null, aggregates all timelogs across all projects for the organization.
     */
    project_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Page number for paginated results. Use with limit to navigate through large date ranges.
     *
     * @x-autobe-specification Pagination offset parameter. Calculates OFFSET as (page - 1) * limit. Default value: 1. Used in pagination clause: OFFSET :offset LIMIT :limit. Must be >= 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of weeks to return per page. Use with page to paginate through results.
     *
     * @x-autobe-specification Pagination size parameter. Controls maximum number of weekly summary records returned per page. Used in LIMIT clause. Default: 20. Maximum: 100. Applied as LIMIT :limit in SQL query. Lower values improve response time for large date ranges.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
