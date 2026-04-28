import { tags } from "typia";

export namespace IWeeklySummaryReport {
  /**
   * Weekly time tracking summary report providing aggregated metrics for organizational reporting. Displays week boundaries in ISO calendar format (Monday through Sunday), total hours worked by all employees, count of individual timelog entries, and number of distinct employees who logged time. Only weeks containing at least one timelog entry appear in results.
   */
  export type ISummary = {
    /**
     * The Monday date marking the start of the reporting week. Uses ISO calendar definition where weeks begin on Monday and end on Sunday for consistent weekly boundaries.
     *
         * @x-autobe-specification Derived from hrm_platform_timelogs.date using
         *   ISO week grouping. Calculates the Monday start date for each
         *   calendar week by subtracting the day-of-week offset from individual
         *   timelog dates.
     */
    week_start: string & tags.Format<"date-time">;

    /**
     * The Sunday date marking the end of the reporting week. Always exactly 6 days after week_start to provide complete calendar week coverage.
     *
         * @x-autobe-specification Computed from week_start by adding a fixed
         *   6-day interval. Formula: week_end = week_start + interval '6 days'.
         *   Ensures week boundaries align exactly to Monday-Sunday periods.
     */
    week_end: string & tags.Format<"date-time">;

    /**
     * Total hours worked across all timelog entries during the week period. Sum of all tracked work durations converted from minutes to hours.
     *
         * @x-autobe-specification Computed by summing all duration_minutes from
         *   timelogs within the week boundaries, then dividing by 60. Formula:
         *   total_hours = sum(duration_minutes) / 60.0. Returns floating-point
         *   number representing total hours worked.
     */
    total_hours: number;

    /**
     * Total number of individual timelog entries created during the week period. Counts each discrete time tracking record regardless of employee or project.
     *
         * @x-autobe-specification Computed using COUNT(*) on
         *   hrm_platform_timelogs. Counts all timelog records whose date falls
         *   within the week boundaries (week_start inclusive to week_end
         *   inclusive).
     */
    timelog_count: number & tags.Type<"int32">;

    /**
     * Number of distinct employees who logged time during the week period. Only counts employees with at least one timelog entry in the reporting week.
     *
         * @x-autobe-specification Computed using COUNT(DISTINCT
         *   hrm_platform_employee_id). Counts unique employees who created at
         *   least one timelog entry within the week boundaries. Employees
         *   without any timelogs are excluded from this count.
     */
    employee_count: number & tags.Type<"int32">;
  };

  /**
   * Filter criteria and pagination settings for a weekly time tracking summary report.
   *
   * Retrieve organizational time tracking records aggregated by week (Monday through Sunday). Narrow results by providing a `project_id` to isolate a single project, or `dateRangeStart` and `dateRangeEnd` to restrict to a specific time window. Cursor-based pagination or offset-based page numbers allow navigation through historical weekly summaries.
   */
  export type IRequest = {
    /**
     * Filter to a specific project.
     *
     * Specify the UUID of a project to narrow the weekly summary report to timelogs recorded against that project only. If omitted, results aggregate time across all projects in the organization.
     *
         * @x-autobe-database-schema-property hrm_platform_project_id
         * @x-autobe-specification Direct filter on hrm_platform_project_id
         *   column. Validates that the UUID corresponds to an active project
         *   within the authenticated member's organization. Applied as WHERE
         *   hrm_platform_project_id = :project_id.
     */
    project_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Lower date boundary for the report period.
     *
     * Specify an ISO 8601 datetime to start the report period from this point forward, inclusive. Typically used with dateRangeEnd to define a specific time window.
     *
         * @x-autobe-database-schema-property date
         * @x-autobe-specification Lower date boundary. Applied as WHERE date >=
         *   :dateRangeStart. The datetime is converted using the organization's
         *   timezone setting to determine correct week boundaries.
     */
    dateRangeStart?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Upper date boundary for the report period.
     *
     * Specify an ISO 8601 datetime to end the report period at this point, inclusive. Typically used with dateRangeStart to define a specific time window.
     *
         * @x-autobe-database-schema-property date
         * @x-autobe-specification Upper date boundary. Applied as WHERE date <=
         *   :dateRangeEnd. The datetime is converted using the organization's
         *   timezone setting to determine correct week boundaries.
     */
    dateRangeEnd?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Pagination cursor.
     *
     * Pass the cursor value from a prior response to fetch the next page of weekly summaries. Enables efficient server-side navigation without loading all results at once.
     *
         * @x-autobe-specification Cursor-based pagination marker. The cursor
         *   value is the week_start datetime from the last record of the
         *   previous page. Applied as WHERE week_start < :cursor (descending)
         *   or WHERE week_start > :cursor (ascending) depending on sort
         *   direction.
     */
    cursor?: string | undefined;

    /**
     * Maximum number of weekly summary records to return per page.
     *
     * Defaults to 20. Minimum 1, maximum 100.
     *
         * @x-autobe-specification Sets page size for the result set. Defaults
         *   to 20 when omitted. Validates minimum 1, maximum 100. Applied as
         *   LIMIT :limit in the SQL query.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Sort direction for weekly summaries.
     *
     * Use 'asc' for oldest week first, 'desc' for most recent week first. Defaults to 'desc'.
     *
         * @x-autobe-specification Sort direction. Accepts 'asc' (oldest week
         *   first) or 'desc' (newest week first). Defaults to 'desc'. Applied
         *   as ORDER BY week_start ASC or DESC.
     */
    sort?: string | undefined;

    /**
     * Target page number for offset-based pagination.
     *
     * 1-indexed, defaults to 1 if omitted or null. Requesting a page beyond the available range returns an empty data array.
     *
         * @x-autobe-specification Offset-based pagination page number,
         *   1-indexed. Null or omitted defaults to 1. Applied as OFFSET =
         *   (:page - 1) * :limit in the SQL query.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
