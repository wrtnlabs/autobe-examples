import { tags } from "typia";

export namespace IHrmPlatformWeeklySummaryReport {
  /**
   * Request parameters for querying weekly time tracking summary reports. Specifies the date range for aggregation, optional project filter, and pagination controls for retrieving paginated weekly statistics.
   */
  export type IRequest = {
    /**
     * Start date of the reporting period (inclusive). ISO 8601 date format (YYYY-MM-DD). Defines the beginning of the date range for weekly aggregation.
     *
     * @x-autobe-specification ISO date string (YYYY-MM-DD) defining the inclusive start boundary of the reporting period. Backend filters hrm_platform_timelogs WHERE work_date >= startDate. Used to determine the first week to include in aggregation.
     */
    startDate: string & tags.Format<"date">;

    /**
     * End date of the reporting period (inclusive). ISO 8601 date format (YYYY-MM-DD). Defines the end of the date range for weekly aggregation.
     *
     * @x-autobe-specification ISO date string (YYYY-MM-DD) defining the inclusive end boundary of the reporting period. Backend filters hrm_platform_timelogs WHERE work_date <= endDate. Used to determine the last week to include in aggregation.
     */
    endDate: string & tags.Format<"date">;

    /**
     * Optional project code filter. When provided, limits results to timelogs associated with the specified project. Uses project code (not UUID) for human-readable filtering.
     *
     * @x-autobe-specification Optional project code string for filtering results to a specific project. Backend looks up project_id from hrm_platform_projects WHERE code = projectCode, then filters timelogs WHERE project_id = matched_id. If omitted, includes all projects in the organization.
     */
    projectCode?: string | undefined;

    /**
     * Page number for pagination (1-indexed). Minimum value is 1. Determines which page of weekly summary results to retrieve.
     *
     * @x-autobe-specification 1-indexed page number for pagination. Backend calculates OFFSET = (page - 1) * limit. Minimum value is 1. Defaults to 1 if not provided. Controls which page of weekly results to return.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of weekly summaries per page. Must be between 1 and 100. Controls the page size for paginated results.
     *
     * @x-autobe-specification Number of records per page. Backend uses as LIMIT clause. Constrained between 1 and 100. Controls the maximum number of weekly summaries returned in one response.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Weekly summary statistics for time tracking reports. Contains aggregated hours logged, timelog entry count, and unique employee count for a specific week period (Monday to Sunday). Used in organization-level time reports to show weekly activity trends.
   */
  export type ISummary = {
    /**
     * Start date of the week period (Monday at 00:00:00).
     *
     * @x-autobe-specification Computed: First day of the ISO week period (Monday 00:00:00). Derived by grouping timelog entries by ISO week and extracting the week start boundary. Format: ISO 8601 date-time.
     */
    weekStart: string & tags.Format<"date-time">;

    /**
     * End date of the week period (Sunday at 23:59:59).
     *
     * @x-autobe-specification Computed: Last day of the ISO week period (Sunday 23:59:59). Derived by grouping timelog entries by ISO week and extracting the week end boundary. Format: ISO 8601 date-time.
     */
    weekEnd: string & tags.Format<"date-time">;

    /**
     * Total hours logged by all employees during the week period.
     *
     * @x-autobe-specification Computed: SUM(duration_minutes) / 60 from hrm_platform_timelogs for all entries within the week period. Result is a decimal number representing total hours logged.
     */
    totalHours: number;

    /**
     * Number of individual time entry records logged during the week period.
     *
     * @x-autobe-specification Computed: COUNT(*) of hrm_platform_timelogs entries within the week period. Integer value representing the number of individual time entries.
     */
    timelogCount: number & tags.Type<"int32">;

    /**
     * Number of unique employees who logged time during the week period.
     *
     * @x-autobe-specification Computed: COUNT(DISTINCT employee_id) from hrm_platform_timelogs JOIN hrm_platform_employees for entries within the week period. Integer value representing unique employees who logged time.
     */
    employeeCount: number & tags.Type<"int32">;
  };
}
