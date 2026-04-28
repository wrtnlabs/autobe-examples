import { tags } from "typia";

export namespace IHrmPlatformWeeklySummaryReport {
  /**
   * Search criteria for weekly summary report including date range filter, optional project filter, and pagination parameters.
   *
   * This request type defines the filtering and pagination options for retrieving weekly time tracking summaries. The date range filters allow focusing on specific periods, while the project filter enables analysis of project-specific weekly patterns. Pagination parameters control the result set size for efficient data retrieval.
   *
   * All fields are optional. Omitting date filters returns all available weeks. Omitting project filter includes all projects. Default pagination returns the first page with up to 100 items.
   */
  export type IRequest = {
    /**
     * Start of the date range for filtering weekly summaries.
     *
     * Filters the results to include only weeks where the week start date (Monday) is greater than or equal to this value. Uses ISO 8601 date-time format.
     *
     * Optional parameter. When omitted, the query includes all available weeks from the earliest recorded data.
     *
         * @x-autobe-specification Filters timelogs where week_start_date >=
         *   from. ISO 8601 date-time format. Optional - omitting returns all
         *   weeks from earliest available.
     */
    from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End of the date range for filtering weekly summaries.
     *
     * Filters the results to include only weeks where the week end date (Sunday) is less than or equal to this value. Uses ISO 8601 date-time format.
     *
     * Optional parameter. When omitted, the query includes all available weeks up to the most recent data.
     *
         * @x-autobe-specification Filters timelogs where week_end_date <= to.
         *   ISO 8601 date-time format. Optional - omitting returns all weeks up
         *   to latest.
     */
    to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional project filter to analyze project-specific weekly patterns.
     *
     * When provided, filters the weekly summaries to include only timelogs associated with the specified project. The value must be a valid project UUID from the organization.
     *
     * Optional parameter. When omitted, the query aggregates timelogs across all projects in the organization.
     *
         * @x-autobe-specification Filters timelogs by hrm_platform_project_id
         *   when provided. UUID format. Optional - omitting includes all
         *   projects.
     */
    project_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Page number for pagination (1-indexed).
     *
     * Specifies which page of results to retrieve. Page numbering starts from 1, so the first page is page 1.
     *
     * Optional parameter. Defaults to 1 when omitted. Used in conjunction with limit to implement cursor-based pagination sorted by week_start_date DESC.
     *
         * @x-autobe-specification Page number for cursor-based pagination using
         *   week_start_date. Minimum 1, defaults to 1. Used with limit to
         *   control result window.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records per page.
     *
     * Defines the upper bound on how many weekly summary records are returned in a single response. Must be between 1 and 100 inclusive.
     *
     * Optional parameter. Defaults to 100 when omitted. The actual number of records returned may be less on the final page or when total weeks are fewer than the limit.
     *
         * @x-autobe-specification Maximum records per page. Minimum 1, maximum
         *   100, defaults to 100. Controls result set size for efficient
         *   retrieval.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Weekly summary record showing aggregated time tracking metrics for a specific ISO week.
   *
   * This type represents a single week's time tracking activity within an organization. It includes the week's date range and three key metrics: total hours logged across all employees, the count of individual timelog entries, and the number of distinct employees who recorded time during that week.
   *
   * The week_start_date represents Monday of the ISO week, and week_end_date represents the following Sunday. All metrics are calculated from timelogs within the organization context and respect any applied filters (date range, project).
   */
  export type ISummary = {
    /**
     * The start date of the ISO week (Monday).
     *
     * This property represents the first day of the ISO week period for which the summary metrics are calculated. The date is computed from the timelog entries by determining the Monday of each ISO week. All timelogs falling within this week (Monday through Sunday) are aggregated into this summary record.
     *
         * @x-autobe-specification Computed as Monday 00:00:00 of each ISO week
         *   from timelog dates. Use ISO 8601 week date calculation where week
         *   starts on Monday. Group timelogs by this computed week boundary.
     */
    week_start_date: string & tags.Format<"date">;

    /**
     * The end date of the ISO week (Sunday).
     *
     * This property represents the last day of the ISO week period for which the summary metrics are calculated. The date is computed as exactly 6 days after the week_start_date, representing the Sunday of the same ISO week. All timelogs falling within this week (Monday through Sunday) are aggregated into this summary record.
     *
         * @x-autobe-specification Computed as Sunday 23:59:59 of each ISO week
         *   from timelog dates. Use ISO 8601 week date calculation where week
         *   ends on Sunday. This is exactly 6 days after week_start_date.
     */
    week_end_date: string & tags.Format<"date">;

    /**
     * The total number of hours logged across all employees during the week.
     *
     * This property represents the sum of all time entries recorded within the ISO week period. The value is calculated by summing the duration_minutes from all timelog entries and converting to hours (dividing by 60). The result is rounded to 2 decimal places for precision. This metric provides an overview of total work effort expended by the organization during the week.
     *
         * @x-autobe-specification Computed as SUM(duration_minutes) / 60 from
         *   all timelogs in the ISO week. Round to 2 decimal places. Filter by
         *   organization_id from session context. Optional filters: date range,
         *   project_id.
     */
    total_hours: number;

    /**
     * The total number of individual timelog entries recorded during the week.
     *
     * This property represents the count of all time tracking entries submitted within the ISO week period. Each timelog entry is counted once, regardless of duration. This metric indicates the granularity of time tracking activity - a higher count suggests more frequent time entries, while a lower count may indicate fewer but longer work sessions.
     *
         * @x-autobe-specification Computed as COUNT(*) of all timelog entries
         *   in the ISO week. Filter by organization_id from session context.
         *   Optional filters: date range, project_id.
     */
    timelog_count: number & tags.Type<"int32">;

    /**
     * The number of distinct employees who logged time during the week.
     *
     * This property represents the count of unique employees who recorded at least one timelog entry within the ISO week period. The count is calculated using COUNT(DISTINCT employee_id) to ensure each employee is counted only once, regardless of how many timelogs they submitted. This metric provides insight into workforce participation and engagement levels during the week.
     *
         * @x-autobe-specification Computed as COUNT(DISTINCT
         *   hrm_platform_employee_id) from all timelogs in the ISO week. Filter
         *   by organization_id from session context. Optional filters: date
         *   range, project_id.
     */
    employee_count: number & tags.Type<"int32">;
  };
}
