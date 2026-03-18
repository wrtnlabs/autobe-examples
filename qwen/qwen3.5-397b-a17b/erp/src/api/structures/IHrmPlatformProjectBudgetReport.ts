import { tags } from "typia";

import { IEHrmPlatformProjectStatus } from "./IEHrmPlatformProjectStatus";

export namespace IHrmPlatformProjectBudgetReport {
  /**
   * Request parameters for querying project budget utilization reports. Supports filtering by project name search, status, date range for timelog filtering, and budget utilization thresholds. Includes pagination and sorting options for navigating result sets. All parameters are optional to allow flexible report queries. Used by managers and owners with report:view permission to monitor project financial health.
   */
  export type IRequest = {
    /**
     * Search term for filtering projects by name. Performs case-insensitive partial matching on project names.
     *
     * @x-autobe-specification Filters projects by name using LIKE operator on hrm_platform_projects.name. Case-insensitive partial match. Applied before aggregation.
     */
    search?: string | undefined;

    /**
     * Filter projects by status. Accepts active, archived, or completed to focus on specific project states.
     *
     * @x-autobe-specification Filters by hrm_platform_projects.status enum values (active, archived, completed). Exact match filter applied to projects table before aggregation.
     */
    status?: string | undefined;

    /**
     * Start date for filtering timelogs (inclusive). Only timelogs on or after this date are included in actual hours calculation. Format: YYYY-MM-DD.
     *
     * @x-autobe-specification Filters hrm_platform_timelogs.date >= dateFrom (inclusive). Used to calculate actual_hours within the specified date range. ISO 8601 date format (YYYY-MM-DD).
     */
    dateFrom?: (string & tags.Format<"date">) | undefined;

    /**
     * End date for filtering timelogs (inclusive). Only timelogs on or before this date are included in actual hours calculation. Format: YYYY-MM-DD.
     *
     * @x-autobe-specification Filters hrm_platform_timelogs.date <= dateTo (inclusive). Used to calculate actual_hours within the specified date range. ISO 8601 date format (YYYY-MM-DD).
     */
    dateTo?: (string & tags.Format<"date">) | undefined;

    /**
     * Minimum budget utilization percentage to include in results. Filters projects that have consumed at least this percentage of their budget. Range: 0-100.
     *
     * @x-autobe-specification Filters results where calculated utilization_percentage >= minUtilization. utilization_percentage = (actual_hours / budget_hours) * 100. Applied after aggregation. Range: 0-100.
     */
    minUtilization?: (number & tags.Minimum<0> & tags.Maximum<100>) | undefined;

    /**
     * Maximum budget utilization percentage to include in results. Filters projects that have not exceeded this percentage of their budget. Range: 0-100.
     *
     * @x-autobe-specification Filters results where calculated utilization_percentage <= maxUtilization. utilization_percentage = (actual_hours / budget_hours) * 100. Applied after aggregation. Range: 0-100.
     */
    maxUtilization?: (number & tags.Minimum<0> & tags.Maximum<100>) | undefined;

    /**
     * Page number for pagination. Starts from 1 (first page). Used together with limit to control result set pagination.
     *
     * @x-autobe-specification Page number for offset-based pagination. Defaults to 1. Used with limit to calculate OFFSET: (page - 1) * limit. Minimum value: 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items to return per page. Minimum: 1, Maximum: 100. Default: 20. Controls the size of the paginated response.
     *
     * @x-autobe-specification Number of items per page. Defaults to 20, maximum 100. Used with page to calculate LIMIT and OFFSET for query. Controls response payload size.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Field to sort results by. Accepts: utilization_percentage, project_name, budget_hours, or actual_hours. Determines the ordering of projects in the response.
     *
     * @x-autobe-specification Field to sort results by. Valid values: utilization_percentage, project_name, budget_hours, actual_hours. Maps to ORDER BY clause. Default: utilization_percentage.
     */
    sort?: string | undefined;

    /**
     * Sort direction. Accepts asc for ascending order or desc for descending order. Applied to the field specified in the sort parameter.
     *
     * @x-autobe-specification Sort direction for the sort field. Values: asc (ascending) or desc (descending). Default: desc when sorting by utilization_percentage, asc for other fields. Applied to ORDER BY clause.
     */
    direction?: "asc" | "desc" | undefined;
  };

  /**
   * Summary representation of a project's budget utilization in the budget report. Displays essential project identification (name, color code, status) alongside budget tracking metrics including planned budget hours, actual logged hours from timelogs, and the percentage of budget consumed. Projects without budget_hours have null utilization_percentage but still show actual hours. Used in paginated budget report lists for managers and owners to monitor project financial health.
   */
  export type ISummary = {
    /**
     * Unique identifier of the project.
     *
     * @x-autobe-specification From hrm_platform_projects.id via JOIN. UUID format. Primary key identifying the project.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Project name for identification.
     *
     * @x-autobe-specification From hrm_platform_projects.name via JOIN. Project name for identification.
     */
    name: string;

    /**
     * Hex color code for visual identification in UI components.
     *
     * @x-autobe-specification From hrm_platform_projects.color_code via JOIN. Hex color code for UI display.
     */
    color_code: string;

    /**
     * Project lifecycle status: active, archived, or completed.
     *
     * @x-autobe-specification From hrm_platform_projects.status via JOIN. References IEHrmPlatformProjectStatus enum (active, archived, completed).
     */
    status: IEHrmPlatformProjectStatus;

    /**
     * Total estimated budget hours for tracking budget utilization percentage.
     *
     * @x-autobe-specification From hrm_platform_projects.budget_hours via JOIN. Nullable in DB but required in DTO (backend uses 0 when null).
     */
    budget_hours: number & tags.Minimum<0>;

    /**
     * Total actual hours logged by employees on this project, calculated from timelog entries.
     *
     * @x-autobe-specification Computed: SUM(timelogs.duration_minutes) WHERE timelogs.project_id = projects.id AND timelogs.deleted_at IS NULL, divided by 60 to convert minutes to hours. Filtered by date range if provided in request.
     */
    actual_hours: number & tags.Minimum<0>;

    /**
     * Percentage of budget hours consumed. Null when project has no budget_hours defined.
     *
     * @x-autobe-specification Computed: (actual_hours / budget_hours) * 100 when budget_hours is not null and > 0. Returns null when budget_hours is null. Clamped to 0-100 range.
     */
    utilization_percentage:
      | (number & tags.Minimum<0> & tags.Maximum<100>)
      | null;

    /**
     * Optional project start date for timeline tracking.
     *
     * @x-autobe-specification From hrm_platform_projects.started_at via JOIN. Convert DateTime to date format (YYYY-MM-DD). Nullable.
     */
    start_date?: (string & tags.Format<"date">) | null | undefined;

    /**
     * Optional project end date or actual completion date.
     *
     * @x-autobe-specification From hrm_platform_projects.ended_at via JOIN. Convert DateTime to date format (YYYY-MM-DD). Nullable.
     */
    end_date?: (string & tags.Format<"date">) | null | undefined;
  };
}
