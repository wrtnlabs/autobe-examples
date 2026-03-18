import { tags } from "typia";

export namespace IHrmPlatformWeeklySummaryReport {
  /**
   * Search criteria for weekly summary report queries. Contains optional date range filters to narrow timelog entries by work period, optional project filter to focus on specific work initiatives, and pagination parameters for navigating historical weekly data. All parameters are optional to allow flexible querying across different time spans and project scopes.
   */
  export type IRequest = {
    /**
     * Start date for filtering timelog entries. Only timelogs with work date on or after this date are included in the weekly aggregation. Uses ISO 8601 date-time format.
     *
     * @x-autobe-specification Filters hrm_platform_timelogs where work_date >= from_date. ISO 8601 date-time format. Optional parameter - if omitted, no lower bound applied. Timezone conversion uses organization's timezone setting for accurate date boundary calculations.
     */
    from_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for filtering timelog entries. Only timelogs with work date on or before this date are included in the weekly aggregation. Uses ISO 8601 date-time format.
     *
     * @x-autobe-specification Filters hrm_platform_timelogs where work_date <= to_date. ISO 8601 date-time format. Optional parameter - if omitted, no upper bound applied. Timezone conversion uses organization's timezone setting for accurate date boundary calculations.
     */
    to_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional project filter to narrow results to a specific work initiative. Only timelogs associated with the specified project code are included in the weekly aggregation. Uses UUID format.
     *
     * @x-autobe-specification Filters results by joining hrm_platform_timelogs with hrm_platform_projects on project_id, then filtering where projects.code = project_code. UUID format. Optional parameter - if omitted, includes timelogs from all projects. Ensures organization context by joining through employees table.
     */
    project_code?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Page number for paginated results. Specifies which page of weekly summaries to retrieve, with page 1 being the first page. Used together with limit to control result set size.
     *
     * @x-autobe-specification Controls pagination offset for weekly summary results. 1-indexed page number (page 1 = first page). Used with limit to calculate SQL OFFSET: (page - 1) * limit. Minimum value is 1. Defaults to 1 if not provided.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of weekly summary records to return per page. Controls the page size for pagination, with a minimum of 1 and maximum of 100 records per page.
     *
     * @x-autobe-specification Controls maximum number of weekly summary records per page. Minimum value is 1, maximum is 100. Used with page to calculate SQL LIMIT clause. Defaults to organization's standard page size if not provided.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Weekly summary statistics for time tracking reports containing aggregated metrics for a specific week period: total hours worked, number of timelog entries, and count of unique employees who logged time.
   */
  export type ISummary = {
    /**
     * Start date of the week period (Monday 00:00 in organization timezone)
     *
     * @x-autobe-specification Computed from timelogs: MIN(date) truncated to Monday 00:00 in organization timezone.
     */
    weekStart: string & tags.Format<"date-time">;

    /**
     * End date of the week period (Sunday 23:59 in organization timezone)
     *
     * @x-autobe-specification Computed from timelogs: MAX(date) truncated to Sunday 23:59 in organization timezone.
     */
    weekEnd: string & tags.Format<"date-time">;

    /**
     * Total hours worked during the week (sum of all timelog durations converted from minutes)
     *
     * @x-autobe-specification Computed from timelogs: SUM(duration_minutes) / 60 to convert minutes to hours.
     */
    totalHours: number;

    /**
     * Total number of individual timelog entries recorded during the week
     *
     * @x-autobe-specification Computed from timelogs: COUNT(*) of all timelog entries in the week period.
     */
    timelogCount: number & tags.Type<"int32">;

    /**
     * Number of unique employees who logged time during the week
     *
     * @x-autobe-specification Computed from timelogs: COUNT(DISTINCT employee_id) of unique employees who logged time.
     */
    employeeCount: number & tags.Type<"int32">;
  };
}
