import { tags } from "typia";

export namespace IErpHrmWeeklySummary {
  /**
   * Request parameters for the weekly summary report including date range and optional project filter.
   */
  export type IRequest = {
    /**
     * Start date of the report date range (inclusive). Format: YYYY-MM-DD.
     *
         * @x-autobe-specification Start date for filtering
         *   erp_hrm_timelogs.date (inclusive). Used to define the beginning of
         *   the date range for the weekly summary aggregation. Only complete
         *   weeks starting from this date are included.
     */
    startDate?: (string & tags.Format<"date">) | undefined;

    /**
     * End date of the report date range (inclusive). Format: YYYY-MM-DD.
     *
         * @x-autobe-specification End date for filtering erp_hrm_timelogs.date
         *   (inclusive). Used to define the end of the date range for the
         *   weekly summary aggregation. Only complete weeks ending by this date
         *   are included.
     */
    endDate?: (string & tags.Format<"date">) | undefined;

    /**
     * Optional project UUID to filter the report to a specific project.
     *
         * @x-autobe-specification Optional project filter using
         *   erp_hrm_project_id from erp_hrm_timelogs. When provided, only
         *   timelogs belonging to this project are included in the aggregation.
         *   The project must belong to the current organization context.
     */
    projectId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Target page number to retrieve (0-indexed). Specifies which page of results to return. Page numbering starts from 0.
     *
         * @x-autobe-specification 1-indexed page number for pagination.
         *   Defaults to 1 if not provided or null. Controls which page of
         *   weekly summary results to return. Total pages calculated based on
         *   number of complete weeks in date range.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return per page. Controls how many records are included in each page response.
     *
         * @x-autobe-specification Maximum number of weekly summary records per
         *   page. Defaults to 100 if not provided or null. The server may
         *   enforce upper bounds to prevent excessive resource consumption.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Weekly summary containing aggregated time tracking metrics for a complete week (Monday through Sunday), including total hours logged, number of timelog entries, and count of distinct employees who logged time during that week.
   */
  export type ISummary = {
    /**
     * Start date of the week (Monday) for which time tracking metrics are aggregated.
     *
         * @x-autobe-specification Derived date boundary: trunc(timelog_date,
         *   'week') AS week_start. This is the Monday of the week containing
         *   the timelog, used as the grouping key for weekly aggregation.
         *   Excluded from partial weeks at range boundaries.
     */
    weekStartDate: string & tags.Format<"date">;

    /**
     * End date of the week (Sunday) for which time tracking metrics are aggregated.
     *
         * @x-autobe-specification Derived date boundary: week_start + 6 days =
         *   Sunday. This is the Sunday of the same week as weekStartDate,
         *   defining the complete 7-day week range. Paired with weekStartDate
         *   to represent the full week boundary.
     */
    weekEndDate: string & tags.Format<"date">;

    /**
     * Total hours logged by all employees during this week, calculated as the sum of all timelog durations divided by 60.
     *
         * @x-autobe-specification SUM(erp_hrm_timelogs.duration_minutes) /
         *   60.0. Aggregates duration_minutes column from all timelogs within
         *   the week. Result is a floating-point number representing total
         *   billable and non-billable hours combined.
     */
    totalHours: number;

    /**
     * Number of individual timelog entries recorded during this week.
     *
         * @x-autobe-specification COUNT(*) FROM erp_hrm_timelogs WHERE
         *   timelog_date >= weekStartDate AND timelog_date <= weekEndDate.
         *   Counts all individual timelog rows within the weekly boundary,
         *   including both billable and non-billable entries.
     */
    timelogsCount: number & tags.Type<"int32">;

    /**
     * Number of distinct employees who logged time during this week.
     *
         * @x-autobe-specification COUNT(DISTINCT
         *   erp_hrm_timelogs.erp_hrm_employee_id). Counts unique employee IDs
         *   among all timelogs within the week. A single employee who logs
         *   multiple entries in the same week counts as 1.
     */
    employeesCount: number & tags.Type<"int32">;
  };
}
