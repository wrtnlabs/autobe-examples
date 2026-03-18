import { tags } from "typia";

export namespace IHrmPlatformProjectBudgetReport {
  /**
   * Request body containing filtering and pagination parameters for retrieving project budget utilization reports. All parameters are optional to allow flexible querying of budget data across projects within an organization.
   */
  export type IRequest = {
    /**
     * Start date of the report period. Only timelogs on or after this date will be included in budget calculations.
     *
     * @x-autobe-specification Query parameter for filtering timelogs by start date. ISO 8601 date-time format. Projects with timelogs within this range will be included in the report.
     */
    date_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date of the report period. Only timelogs on or before this date will be included in budget calculations.
     *
     * @x-autobe-specification Query parameter for filtering timelogs by end date. ISO 8601 date-time format. Projects with timelogs within this range will be included in the report.
     */
    date_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional array of project UUIDs to filter the report. When provided, only these projects will be included in the budget analysis.
     *
     * @x-autobe-specification Query parameter for filtering by specific project UUIDs. Array of UUID strings. If provided, only projects matching these IDs will be included in the report.
     */
    project_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional filter for project status. Limits results to projects with the specified status (active, archived, or completed).
     *
     * @x-autobe-specification Query parameter for filtering by project status. Valid values: active, archived, completed. If provided, only projects with matching status will be included.
     */
    status?: string | undefined;

    /**
     * Optional search term for filtering projects by name or description. Performs case-insensitive substring matching.
     *
     * @x-autobe-specification Query parameter for text search in project name and description fields. Case-insensitive substring matching. If provided, only projects matching the search term will be included.
     */
    search?: string | undefined;

    /**
     * Page number for pagination. Starts from 1. Default is 1. Use with limit parameter to control result set size.
     *
     * @x-autobe-specification Query parameter for pagination. Integer >= 1. Default value is 1. Indicates which page of results to retrieve. Used with limit parameter.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records per page. Range: 1-100. Default is 50. Use with page parameter to control result set size.
     *
     * @x-autobe-specification Query parameter for pagination. Integer between 1 and 100. Default value is 50. Maximum number of records per page. Used with page parameter.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Field to sort results by. Options: budget_percentage (budget consumption percentage), project_name (project name), actual_hours (total hours logged), budget_hours (allocated budget hours). Default is budget_percentage.
     *
     * @x-autobe-specification Query parameter for sorting results. Valid values: budget_percentage, project_name, actual_hours, budget_hours. Default is budget_percentage. Determines which field to sort by.
     */
    sort_by?: string | undefined;

    /**
     * Sort direction. Options: asc (ascending), desc (descending). Default is desc. Used with sort_by parameter to control result ordering.
     *
     * @x-autobe-specification Query parameter for sort direction. Valid values: asc, desc. Default is desc. Determines ascending or descending sort order.
     */
    sort_order?: string | undefined;
  };

  /**
   * Project budget utilization summary for financial reporting. Combines project metadata with aggregated time tracking data to display budget consumption metrics. Shows total hours logged against the project, breakdown of billable versus non-billable hours, and the percentage of allocated budget that has been consumed. Projects without a defined budget allocation are excluded from this report as meaningful utilization percentage cannot be calculated.
   */
  export type ISummary = {
    /**
     * Unique project identifier.
     *
     * @x-autobe-specification Direct mapping from hrm_platform_projects.id. UUID primary key from the projects table in the computed join.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Project name.
     *
     * @x-autobe-specification Direct mapping from hrm_platform_projects.name. Project name from the projects table in the computed join.
     */
    name: string;

    /**
     * Visual color code for project identification in user interface.
     *
     * @x-autobe-specification Direct mapping from hrm_platform_projects.color_code. Hex color string for UI identification from the projects table.
     */
    color_code: string;

    /**
     * Project lifecycle state.
     *
     * @x-autobe-specification Direct mapping from hrm_platform_projects.status. Values: 'active', 'archived', 'completed'. From the projects table.
     */
    status: string;

    /**
     * Allocated budget hours for the project.
     *
     * @x-autobe-specification Direct mapping from hrm_platform_projects.budget_hours. Nullable decimal value from the projects table. Projects with null or zero budget_hours are excluded from this report.
     */
    budget_hours?: number | null | undefined;

    /**
     * Planned or actual project start date.
     *
     * @x-autobe-specification Direct mapping from hrm_platform_projects.start_date. Nullable timestamp from the projects table.
     */
    start_date?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Planned or actual project end date.
     *
     * @x-autobe-specification Direct mapping from hrm_platform_projects.end_date. Nullable timestamp from the projects table.
     */
    end_date?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Total hours logged on the project within the report period.
     *
     * @x-autobe-specification Computed aggregation: SUM(hrm_platform_timelogs.duration_minutes / 60.0) for all timelogs associated with this project within the report date range. Converts minutes to hours. Always non-null and >= 0.
     */
    total_hours: number;

    /**
     * Total billable hours logged on the project within the report period.
     *
     * @x-autobe-specification Computed aggregation: SUM(CASE WHEN hrm_platform_timelogs.billable = true THEN hrm_platform_timelogs.duration_minutes / 60.0 ELSE 0 END). Sum of billable time entries only. Always non-null and >= 0.
     */
    billable_hours: number;

    /**
     * Total non-billable hours logged on the project within the report period.
     *
     * @x-autobe-specification Computed aggregation: SUM(CASE WHEN hrm_platform_timelogs.billable = false THEN hrm_platform_timelogs.duration_minutes / 60.0 ELSE 0 END). Sum of non-billable time entries only. Always non-null and >= 0.
     */
    non_billable_hours: number;

    /**
     * Percentage of allocated budget that has been consumed, calculated as (total_hours / budget_hours) * 100.
     *
     * @x-autobe-specification Computed calculation: (total_hours / budget_hours) * 100.0, rounded to 2 decimal places. Only calculated for projects where budget_hours > 0. Projects with null or zero budget_hours are excluded from the report entirely.
     */
    budget_percentage: number;
  };
}
