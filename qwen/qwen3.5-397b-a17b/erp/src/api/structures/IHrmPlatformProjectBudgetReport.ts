import { tags } from "typia";

export namespace IHrmPlatformProjectBudgetReport {
  /**
   * Project budget report summary showing allocated budget hours, actual consumed hours, and utilization percentage for list display in organization reports.
   */
  export type ISummary = {
    /**
     * Unique identifier of the project.
     *
     * @x-autobe-specification Source: hrm_platform_projects.id. Retrieved via JOIN with timelogs aggregation on project_id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Name of the project.
     *
     * @x-autobe-specification Source: hrm_platform_projects.name. Retrieved via JOIN with timelogs aggregation on project_id.
     */
    name: string;

    /**
     * Color code for visual project identification in the UI.
     *
     * @x-autobe-specification Source: hrm_platform_projects.color_code. Hex color code for UI display, retrieved via JOIN.
     */
    color: string;

    /**
     * Current status of the project (active, archived, or completed).
     *
     * @x-autobe-specification Source: hrm_platform_projects.status. Enum values: active, archived, completed. Retrieved via JOIN.
     */
    status: "active" | "archived" | "completed";

    /**
     * Total budgeted hours allocated to the project.
     *
     * @x-autobe-specification Source: hrm_platform_projects.budget_hours. Filtered to non-null only in this report. Retrieved via JOIN.
     */
    budget_hours: number;

    /**
     * Total hours actually logged to the project within the report period.
     *
     * @x-autobe-specification Computed from hrm_platform_timelogs: SUM(duration_minutes) / 60 per project within the report's date range. Requires JOIN on project_id.
     */
    actual_hours: number;

    /**
     * Percentage of budget hours consumed (actual hours divided by budget hours, multiplied by 100).
     *
     * @x-autobe-specification Computed as (actual_hours / budget_hours) * 100. Represents percentage of budget consumed.
     */
    utilization_percentage: number;
  };

  /**
   * Query parameters for project budget report listing with filtering and pagination support. Allows clients to filter reports by date range, project status, and minimum utilization threshold, with configurable pagination and sorting options.
   */
  export type IRequest = {
    /**
     * Start date for filtering timelogs in ISO date format (YYYY-MM-DD). Only timelogs on or after this date are included in the budget calculation.
     *
     * @x-autobe-specification ISO date format (YYYY-MM-DD). Filters timelogs where date >= date_from. Used in WHERE clause: timelogs.date >= :date_from. Optional - if omitted, no lower bound on date range.
     */
    date_from?: (string & tags.Format<"date">) | undefined;

    /**
     * End date for filtering timelogs in ISO date format (YYYY-MM-DD). Only timelogs on or before this date are included in the budget calculation.
     *
     * @x-autobe-specification ISO date format (YYYY-MM-DD). Filters timelogs where date <= date_to. Used in WHERE clause: timelogs.date <= :date_to. Optional - if omitted, no upper bound on date range.
     */
    date_to?: (string & tags.Format<"date">) | undefined;

    /**
     * Filter projects by their current status. Only projects matching the specified status will be included in the report.
     *
     * @x-autobe-specification Enum filter: 'active', 'archived', or 'completed'. Filters projects by status field. Used in WHERE clause: projects.status = :project_status. Optional - if omitted, includes projects of all statuses.
     */
    project_status?: "active" | "archived" | "completed" | undefined;

    /**
     * Minimum budget utilization percentage threshold (0-100). Only projects with utilization at or above this percentage are included in the results.
     *
     * @x-autobe-specification Number 0-100 representing minimum budget utilization percentage. Filters projects where (actual_hours / budget_hours) * 100 >= min_utilization. Computed from aggregation of timelog durations. Optional - if omitted, no minimum utilization threshold applied.
     */
    min_utilization?:
      | (number & tags.Minimum<0> & tags.Maximum<100>)
      | undefined;

    /**
     * Page number for pagination (1-indexed). Specifies which page of results to retrieve, with the first page being page 1.
     *
     * @x-autobe-specification 1-indexed page number (minimum 1). Used with LIMIT/OFFSET: OFFSET = (page - 1) * limit, LIMIT = limit. Defaults to 1 if omitted. Controls which page of results to return.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records to return per page (1-100). Controls the page size for paginated results.
     *
     * @x-autobe-specification Number of records per page (1-100). Used in LIMIT clause. Defaults to application default if omitted. Maximum 100 records per page enforced for performance.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Field to sort results by. Choose 'utilization_percentage' to sort by budget utilization rate, or 'budget_consumption' to sort by actual hours consumed.
     *
     * @x-autobe-specification Enum: 'utilization_percentage' or 'budget_consumption'. Determines ORDER BY clause for query results. utilization_percentage: (actual_hours / budget_hours) * 100. budget_consumption: actual_hours. Optional - if omitted, uses default sort order.
     */
    sort?: "utilization_percentage" | "budget_consumption" | undefined;
  };
}
