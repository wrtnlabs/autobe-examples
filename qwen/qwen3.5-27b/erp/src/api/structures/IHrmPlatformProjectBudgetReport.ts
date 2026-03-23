import { tags } from "typia";

export namespace IHrmPlatformProjectBudgetReport {
  /**
   * Request body for retrieving project budget reports with filtering and pagination options.
   *
   * This type defines the query parameters for the project budget reports endpoint. It allows administrators to filter budget reports by project status and date range, search for specific projects by name, and control pagination and sorting of results.
   *
   * The organization context is automatically determined from the authenticated admin's session, so organization_id should not be included in the request body. All fields are optional, with sensible defaults applied when not specified.
   *
   * Use this type when calling PATCH /hrmPlatform/admin/project-budget-reports to retrieve paginated budget analysis data for projects with defined budget hours.
   */
  export type IRequest = {
    /**
     * Page number to retrieve (1-indexed). Defaults to 1 if not specified.
     *
     * @x-autobe-specification Page number for pagination (1-indexed). Default is 1. Used to calculate offset in database query: offset = (page - 1) * limit.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Maximum number of records per page. Defaults to 20, range 1-100.
     *
     * @x-autobe-specification Maximum number of records to return per page. Default is 20, minimum 1, maximum 100. Used as LIMIT clause in database query.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;

    /**
     * Filter projects by status. Valid values: 'active', 'completed', 'archived'.
     *
     * @x-autobe-specification Filter projects by status. Matches hrm_platform_projects.status column. Valid values: 'active', 'completed', 'archived'. Applied as WHERE clause: hrm_platform_projects.status = project_status.
     */
    project_status?: "active" | "completed" | "archived" | undefined;

    /**
     * Start date for filtering time entries. Format: YYYY-MM-DD. Optional.
     *
     * @x-autobe-specification Start date for filtering timelogs. Filters hrm_platform_timelogs where date >= this value. Format: ISO 8601 date (YYYY-MM-DD). Nullable - if not provided, no start date filter is applied.
     */
    date_range_start?: (string & tags.Format<"date">) | null | undefined;

    /**
     * End date for filtering time entries. Format: YYYY-MM-DD. Optional.
     *
     * @x-autobe-specification End date for filtering timelogs. Filters hrm_platform_timelogs where date <= this value. Format: ISO 8601 date (YYYY-MM-DD). Nullable - if not provided, no end date filter is applied.
     */
    date_range_end?: (string & tags.Format<"date">) | null | undefined;

    /**
     * Search term to filter projects by name. Optional.
     *
     * @x-autobe-specification Search term for project name. Applied as LIKE query on hrm_platform_projects.name: WHERE name ILIKE '%' || search || '%'. Nullable - if not provided, no search filter is applied.
     */
    search?: string | undefined;

    /**
     * Field to sort results by. Default: 'budget_consumption_percentage'.
     *
     * @x-autobe-specification Field name for sorting results. Default is 'budget_consumption_percentage'. Valid fields: 'id', 'name', 'status', 'budget_hours', 'actual_hours', 'budget_consumption_percentage', 'timelog_count', 'created_at'. Used in ORDER BY clause.
     */
    sort?: string | undefined;

    /**
     * Sort order: 'asc' for ascending, 'desc' for descending. Defaults to 'desc'.
     *
     * @x-autobe-specification Sort direction. Valid values: 'asc' (ascending) or 'desc' (descending). Default is 'desc'. Used in ORDER BY clause: ORDER BY sort_field sortOrder.
     */
    sortOrder?: "asc" | "desc" | undefined;
  };

  /**
   * Lightweight summary of project budget tracking data for administrative reporting. This type provides a consolidated view of project budget consumption by combining project metadata with aggregated time tracking metrics. Each entry shows the budgeted hours versus actual hours logged, the percentage of budget consumed, and the total number of time entries.
   *
   * Used in paginated list responses for the project budget reports endpoint, this summary type enables administrators to quickly identify projects that are approaching or exceeding their allocated effort estimates. The data is computed in real-time from the underlying projects and timelogs tables, ensuring accuracy while maintaining performance through efficient aggregation queries.
   */
  export type ISummary = {
    /**
     * Unique identifier of the project.
     *
     * @x-autobe-specification Project primary key selected from hrm_platform_projects.id in computed aggregation query. Unique identifier for the project in the budget report.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Name of the project.
     *
     * @x-autobe-specification Project name selected from hrm_platform_projects.name in computed aggregation query. Unique within organization.
     */
    name: string;

    /**
     * Current lifecycle status of the project.
     *
     * @x-autobe-specification Project status selected from hrm_platform_projects.status in computed aggregation query. Valid values: 'active', 'completed', 'archived'.
     */
    status: string;

    /**
     * Color code for visual identification of the project.
     *
     * @x-autobe-specification Color code selected from hrm_platform_projects.color_code in computed aggregation query. Used for visual identification in UI.
     */
    color_code: string;

    /**
     * Total budgeted hours allocated for the project.
     *
     * @x-autobe-specification Budget hours selected from hrm_platform_projects.budget_hours in computed aggregation query. Total estimated effort in hours. Only projects with budget_hours not null are included in reports.
     */
    budget_hours: number;

    /**
     * Total actual hours logged against the project, calculated from all time entries.
     *
     * @x-autobe-specification Computed aggregation: SUM(hrm_platform_timelogs.duration) / 60.0 WHERE hrm_platform_timelogs.hrm_platform_project_id = project.id AND hrm_platform_timelogs.deleted_at IS NULL. Defaults to 0.0 if no timelogs exist. Date range filter may be applied based on request parameters.
     */
    actual_hours: number;

    /**
     * Percentage of the project budget that has been consumed (actual hours divided by budget hours).
     *
     * @x-autobe-specification Computed value: (actual_hours / budget_hours) * 100.0. Defaults to 0.0 if budget_hours is 0 or null. Indicates the percentage of the project budget that has been consumed.
     */
    budget_consumption_percentage: number;

    /**
     * Total number of time entries logged against the project.
     *
     * @x-autobe-specification Computed aggregation: COUNT(hrm_platform_timelogs.id) WHERE hrm_platform_timelogs.hrm_platform_project_id = project.id AND hrm_platform_timelogs.deleted_at IS NULL. Defaults to 0 if no timelogs exist. Date range filter may be applied based on request parameters.
     */
    timelog_count: number & tags.Type<"int32">;
  };
}
