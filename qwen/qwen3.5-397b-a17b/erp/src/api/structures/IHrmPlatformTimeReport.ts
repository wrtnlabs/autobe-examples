import { tags } from "typia";

import { IHrmPlatformEmployee } from "./IHrmPlatformEmployee";
import { IHrmPlatformProject } from "./IHrmPlatformProject";
import { IHrmPlatformTask } from "./IHrmPlatformTask";

export namespace IHrmPlatformTimeReport {
  /**
   * Aggregated time report summary showing hours breakdown for a single grouping dimension.
   *
   * This type represents one row in a time tracking report, aggregated by employee, project, or task. The report includes total time logged along with separate breakdowns for billable and non-billable hours.
   *
   * The employee, project, and task fields are conditionally populated based on the report's grouping dimension. When grouped by employee, only the employee field is populated. When grouped by project, only the project field is populated. When grouped by task, only the task field is populated.
   */
  export type ISummary = {
    /**
     * The employee associated with this time aggregation.
     *
     * Populated only when the report is grouped by employee. Contains the employee's summary information including their role, department, and employment details. Null when the report is grouped by project or task.
     *
         * @x-autobe-specification JOIN hrm_platform_employees when
         *   groupBy='employee'. Returns IHrmPlatformEmployee.ISummary with id,
         *   position, employment_type, status, member, role, department. Null
         *   when groupBy is 'project' or 'task'.
     */
    employee?: IHrmPlatformEmployee.ISummary | null | undefined;

    /**
     * The project associated with this time aggregation.
     *
     * Populated only when the report is grouped by project. Contains the project's summary information including name, color code for visual distinction, status, and budget hours. Null when the report is grouped by employee or task.
     *
         * @x-autobe-specification JOIN hrm_platform_projects when
         *   groupBy='project'. Returns IHrmPlatformProject.ISummary with id,
         *   name, color, status, budget_hours, dates. Null when groupBy is
         *   'employee' or 'task'.
     */
    project?: IHrmPlatformProject.ISummary | null | undefined;

    /**
     * The task associated with this time aggregation.
     *
     * Populated only when the report is grouped by task. Contains the task's summary information including title, status, priority, due date, and assigned employee. Null when the report is grouped by employee or project.
     *
         * @x-autobe-specification JOIN hrm_platform_tasks when groupBy='task'.
         *   Returns IHrmPlatformTask.ISummary with id, title, status, priority,
         *   due_date, estimated_hours, assignedEmployee. Null when groupBy is
         *   'employee' or 'project'.
     */
    task?: IHrmPlatformTask.ISummary | null | undefined;

    /**
     * Total time logged in minutes for this grouping dimension.
     *
     * Represents the sum of all timelog durations within the specified date range and filters. This includes both billable and non-billable time entries. The value is always zero or positive.
     *
         * @x-autobe-specification SUM(duration_minutes) from
         *   hrm_platform_timelogs for the grouping dimension. Includes both
         *   billable and non-billable time. Minimum value is 0.
     */
    total_minutes: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Billable time logged in minutes for this grouping dimension.
     *
     * Represents the sum of timelog durations where the billable flag is true. Billable time is typically charged to clients or projects for invoicing purposes. The value is always zero or positive.
     *
         * @x-autobe-specification SUM(CASE WHEN billable=true THEN
         *   duration_minutes ELSE 0 END) from hrm_platform_timelogs. Counts
         *   only timelogs marked as billable. Minimum value is 0.
     */
    billable_minutes: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Non-billable time logged in minutes for this grouping dimension.
     *
     * Represents the sum of timelog durations where the billable flag is false. Non-billable time includes internal work, training, administrative tasks, and other activities not charged to clients. The value is always zero or positive.
     *
         * @x-autobe-specification SUM(CASE WHEN billable=false THEN
         *   duration_minutes ELSE 0 END) from hrm_platform_timelogs. Counts
         *   only timelogs marked as non-billable. Minimum value is 0.
     */
    non_billable_minutes: number & tags.Type<"int32"> & tags.Minimum<0>;
  };

  /**
   * Time report search criteria for generating aggregated time tracking reports.
   *
   * Defines filtering parameters including date range, entity filters (employees, projects, tasks), billable status, and grouping dimension. All filters are optional except date range which is required to bound the query. Results are grouped by the specified dimension and paginated.
   *
   * The groupBy field determines the aggregation level: 'employee' shows hours per employee, 'project' shows hours per project, and 'task' shows hours per task. When grouping by task, taskIds filter is most relevant. Employee and project filters enforce organization membership at query time.
   */
  export type IRequest = {
    /**
     * Start date for the time report date range filter.
     *
     * Filters timelogs to include only entries on or after this date. The date is inclusive, meaning timelogs from the start date itself are included in the report.
     *
     * Format: ISO 8601 date string (YYYY-MM-DD). Example: 2024-01-01. This field is required along with dateTo to define the report period.
     *
         * @x-autobe-specification Filter condition: timelog.date >= dateFrom.
         *   Applied to hrm_platform_timelogs table date field. ISO 8601 date
         *   format (YYYY-MM-DD).
     */
    dateFrom: string & tags.Format<"date">;

    /**
     * End date for the time report date range filter.
     *
     * Filters timelogs to include only entries on or before this date. The date is inclusive, meaning timelogs from the end date itself are included in the report.
     *
     * Format: ISO 8601 date string (YYYY-MM-DD). Example: 2024-12-31. This field is required along with dateFrom to define the report period.
     *
         * @x-autobe-specification Filter condition: timelog.date <= dateTo.
         *   Applied to hrm_platform_timelogs table date field. ISO 8601 date
         *   format (YYYY-MM-DD).
     */
    dateTo: string & tags.Format<"date">;

    /**
     * Optional filter to include only timelogs from specific employees.
     *
     * When provided, the report includes only timelogs belonging to employees whose IDs are in this array. Each employee ID must belong to the current organization for multi-tenancy data isolation.
     *
     * Format: Array of UUID strings. Example: ["550e8400-e29b-41d4-a716-446655440000"]. If omitted, includes all employees in the organization.
     *
         * @x-autobe-specification Filter condition: timelog.employee_id IN
         *   employeeIds. JOIN hrm_platform_employees to verify organization
         *   membership. Array of UUID strings.
     */
    employeeIds?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional filter to include only timelogs from specific projects.
     *
     * When provided, the report includes only timelogs belonging to projects whose IDs are in this array. Each project ID must belong to the current organization for multi-tenancy data isolation.
     *
     * Format: Array of UUID strings. Example: ["550e8400-e29b-41d4-a716-446655440001"]. If omitted, includes all projects in the organization.
     *
         * @x-autobe-specification Filter condition: timelog.project_id IN
         *   projectIds. JOIN hrm_platform_projects to verify organization
         *   membership. Array of UUID strings.
     */
    projectIds?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional filter to include only timelogs from specific tasks.
     *
     * When provided, the report includes only timelogs belonging to tasks whose IDs are in this array. Each task must belong to a project in the current organization. Most relevant when groupBy is set to 'task'.
     *
     * Format: Array of UUID strings. Example: ["550e8400-e29b-41d4-a716-446655440002"]. If omitted, includes all tasks in the filtered projects.
     *
         * @x-autobe-specification Filter condition: timelog.task_id IN taskIds.
         *   JOIN hrm_platform_tasks to verify task belongs to filtered
         *   projects. Array of UUID strings.
     */
    taskIds?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional filter to include only billable or non-billable timelogs.
     *
     * When set to true, includes only timelogs marked as billable (client-chargeable work). When set to false, includes only non-billable timelogs (internal work, training, etc.). If omitted, includes both billable and non-billable timelogs.
     *
     * This filter is useful for generating separate reports for client billing versus internal cost analysis.
     *
         * @x-autobe-specification Filter condition: timelog.billable = billable
         *   (if provided). Applied to hrm_platform_timelogs billable boolean
         *   field.
     */
    billable?: boolean | undefined;

    /**
     * Aggregation dimension for the time report grouping.
     *
     * Determines how the time data is grouped in the response. Three options available:
     *
     * - 'employee': Groups timelogs by employee, showing total hours per employee. The employee field is populated in each result row.
     * - 'project': Groups timelogs by project, showing total hours per project. The project field is populated in each result row.
     * - 'task': Groups timelogs by task, showing total hours per task. The task field is populated in each result row.
     *
         * @x-autobe-specification Determines SQL GROUP BY clause: 'employee'
         *   groups by employee_id, 'project' groups by project_id, 'task'
         *   groups by task_id. Affects which entity reference is populated in
         *   response.
     */
    groupBy?: "employee" | "project" | "task" | undefined;

    /**
     * Page number for paginated report results.
     *
     * Specifies which page of grouped results to return. Page numbering starts at 1 (first page). Used in combination with limit to control result set size.
     *
     * Minimum value: 1. Example: page=1 returns the first page, page=2 returns the second page, and so on.
     *
         * @x-autobe-specification Pagination offset calculation: offset = (page
         *   - 1) * limit. Applied to grouped result set. Minimum value is 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of grouped result rows per page.
     *
     * Controls the page size for paginated report results. Limits the number of aggregation groups returned in a single response.
     *
     * Range: 1 to 100. Example: limit=10 returns up to 10 grouped rows per page. If omitted, uses the system default page size.
     *
         * @x-autobe-specification Pagination limit: maximum number of grouped
         *   result rows to return. Applied to grouped result set. Range: 1 to
         *   100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
