import { tags } from "typia";

import { IHrmPlatformProject } from "./IHrmPlatformProject";

export namespace IHrmPlatformProjectBudgetReport {
  /**
   * Search criteria for project budget utilization report.
   *
   * This request type defines filter parameters for querying project budget consumption data. Filters can be combined to narrow results by time period, specific projects, project status, and billable classification.
   *
   * Date range filtering uses inclusive boundaries on timelog dates. Project status filtering applies to the project entity state. Billable filtering separates client work from internal activities.
   */
  export type IRequest = {
    /**
     * Start date for filtering timelogs.
     *
     * Filters the report to include only timelogs on or after this date. Uses inclusive boundary comparison against the timelog date field.
     *
     * Format: ISO 8601 date-time (e.g., 2024-01-01T00:00:00Z). Optional - if omitted, no lower date bound is applied.
     *
         * @x-autobe-specification Filters timelogs where date >= date_from
         *   (inclusive). Maps to timelog.date column comparison. ISO 8601
         *   date-time format.
     */
    date_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for filtering timelogs.
     *
     * Filters the report to include only timelogs on or before this date. Uses inclusive boundary comparison against the timelog date field.
     *
     * Format: ISO 8601 date-time (e.g., 2024-12-31T23:59:59Z). Optional - if omitted, no upper date bound is applied.
     *
         * @x-autobe-specification Filters timelogs where date <= date_to
         *   (inclusive). Maps to timelog.date column comparison. ISO 8601
         *   date-time format.
     */
    date_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter by specific project.
     *
     * Restricts the report to a single project identified by its UUID. When provided, only timelogs associated with this project are included in the budget calculation.
     *
     * Format: UUID string. Optional - if omitted, all projects with budget hours are included.
     *
         * @x-autobe-specification Filters by specific project UUID. Maps to
         *   hrm_platform_projects.id column. When provided, only timelogs for
         *   this project are included.
     */
    project_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by project status.
     *
     * Restricts the report to projects with the specified lifecycle status. Active projects are currently accepting work, archived projects are preserved for reference, and completed projects indicate finished initiatives.
     *
     * Allowed values: active, archived, completed. Optional - if omitted, projects of all statuses are included.
     *
         * @x-autobe-specification Filters projects by status enum. Maps to
         *   hrm_platform_projects.status column. Accepts: active, archived,
         *   completed.
     */
    status?: "active" | "archived" | "completed" | undefined;

    /**
     * Filter by billable status.
     *
     * Separates client-billable work from internal non-billable activities. When set to true, only timelogs marked as billable are included. When set to false, only non-billable internal work is included.
     *
     * Type: boolean. Optional - if omitted, both billable and non-billable timelogs are included.
     *
         * @x-autobe-specification Filters timelogs by billable flag. Maps to
         *   hrm_platform_timelogs.billable column. When true, includes only
         *   client-billable work. When false, includes only internal
         *   non-billable work.
     */
    billable?: boolean | undefined;

    /**
     * Target page number to retrieve.
     *
     * Specifies which page of results to return in the paginated response. Page numbering starts from 1, so the first page is page 1.
     *
     * Type: integer (1-indexed). Optional - defaults to page 1 if omitted or null. Requesting a page beyond the available range returns an empty data array with valid pagination metadata.
     *
         * @x-autobe-specification Pagination parameter for result paging.
         *   1-indexed page number. Defaults to 1 if not provided. Not mapped to
         *   any database column.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records per page.
     *
     * Controls how many project budget records are included in each page of the response. The server may enforce upper bounds to prevent excessive resource consumption.
     *
     * Type: integer. Optional - defaults to 100 records per page if omitted or null. The actual number of records on the last page may be less than this value.
     *
         * @x-autobe-specification Pagination parameter controlling page size.
         *   Maximum records per page. Defaults to 100 if not provided. Not
         *   mapped to any database column.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Summary of project budget utilization showing budgeted hours versus actual hours logged.
   *
   * Each record represents a single project's budget consumption metrics. The project field provides project identity and context. The budget_hours shows the planned capacity, while actual_hours reflects time logged by employees. The remaining_hours indicates available budget capacity, and utilization_percentage shows the percentage of budget consumed.
   *
   * This type is used in paginated list responses for the project budget report. Projects without budget hours are excluded from results.
   */
  export type ISummary = {
    /**
     * The project being analyzed for budget utilization.
     *
     * Contains essential project identification including the project ID, name, color code for visual distinction, and current status. This reference allows users to identify which project the budget metrics belong to in the report.
     *
         * @x-autobe-specification Join from hrm_platform_projects via
         *   timelog.hrm_platform_project_id. Returns
         *   IHrmPlatformProject.ISummary with id, name, color, status, and
         *   timestamps. Data source: hrm_platform_projects table joined through
         *   timelog foreign key.
     */
    project: IHrmPlatformProject.ISummary;

    /**
     * The total budgeted hours allocated to the project.
     *
     * This value comes from the project's budget_hours field and represents the planned capacity for the project. Used as the baseline for calculating budget utilization. Only projects with defined budget hours appear in this report.
     *
         * @x-autobe-specification Direct value from
         *   hrm_platform_projects.budget_hours column. Nullable in DB but
         *   filtered to non-null in this report. Represents the total
         *   estimated/planned hours for the project.
     */
    budget_hours: number;

    /**
     * The total hours actually logged against the project.
     *
     * Calculated by summing the duration of all timelog entries associated with this project within the specified date range. Represents the real work effort expended. Used to compare against budgeted hours and calculate remaining capacity.
     *
         * @x-autobe-specification Computed by
         *   SUM(hrm_platform_timelogs.duration_minutes) / 60 from all timelogs
         *   associated with the project within the requested date range.
         *   Filters: timelog.deleted_at IS NULL. Aggregation groups by
         *   project_id.
     */
    actual_hours: number;

    /**
     * The remaining budget hours available for the project.
     *
     * Calculated by subtracting actual_hours from budget_hours. Positive values indicate remaining capacity, while negative values indicate the project has exceeded its budget. Helps identify projects at risk of overruns.
     *
         * @x-autobe-specification Computed as budget_hours - actual_hours. Can
         *   be negative if actual hours exceed budget. Represents the remaining
         *   budget capacity.
     */
    remaining_hours: number;

    /**
     * The percentage of budget hours that have been consumed.
     *
     * Calculated as (actual_hours divided by budget_hours) multiplied by 100. A value of 100% means the project has used its entire budget. Values over 100% indicate budget overrun. Results are sorted by this field descending to highlight high-utilization projects.
     *
         * @x-autobe-specification Computed as (actual_hours / budget_hours) *
         *   100. Returns percentage value. Can exceed 100% if actual hours
         *   exceed budget. Used for sorting results by utilization descending.
     */
    utilization_percentage: number;
  };
}
