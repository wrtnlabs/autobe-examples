import { tags } from "typia";

import { IHrmPlatformEmployee } from "./IHrmPlatformEmployee";
import { IHrmPlatformProject } from "./IHrmPlatformProject";
import { IHrmPlatformTask } from "./IHrmPlatformTask";

export namespace IHrmPlatformTimeReport {
  /**
   * Request body for time report query with date range, grouping dimension, and optional filters for employees, projects, tasks, and billable status. Supports pagination and sorting.
   */
  export type IRequest = {
    /**
     * Start date of the reporting period (inclusive). ISO 8601 date format.
     *
     * @x-autobe-specification Filter timelogs where work_date >= dateFrom. ISO date format (YYYY-MM-DD). Required parameter.
     */
    dateFrom: string & tags.Format<"date">;

    /**
     * End date of the reporting period (inclusive). ISO 8601 date format.
     *
     * @x-autobe-specification Filter timelogs where work_date <= dateTo. ISO date format (YYYY-MM-DD). Required parameter. Must be >= dateFrom.
     */
    dateTo: string & tags.Format<"date">;

    /**
     * Grouping dimension for aggregation. Options: employee (group by employee), project (group by project), task (group by task).
     *
     * @x-autobe-specification Aggregation dimension: 'employee' groups by hrm_platform_employees.id, 'project' groups by hrm_platform_projects.id, 'task' groups by hrm_platform_tasks.id. Determines which entity summary is included in response.
     */
    group: "employee" | "project" | "task";

    /**
     * Filter results to specific employees. Array of employee UUIDs. If omitted, includes all employees in organization.
     *
     * @x-autobe-specification Filter timelogs by employee IDs. Array of UUIDs matching hrm_platform_employees.id. If provided, only timelogs from specified employees are included. Optional parameter.
     */
    employeeIds?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Filter results to specific projects. Array of project UUIDs. If omitted, includes all projects in organization.
     *
     * @x-autobe-specification Filter timelogs by project IDs. Array of UUIDs matching hrm_platform_projects.id. If provided, only timelogs from specified projects are included. Optional parameter.
     */
    projectIds?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Filter results to specific tasks. Array of task UUIDs. If omitted, includes all tasks.
     *
     * @x-autobe-specification Filter timelogs by task IDs. Array of UUIDs matching hrm_platform_tasks.id. If provided, only timelogs from specified tasks are included. Optional parameter.
     */
    taskIds?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Filter by billable status. True for billable hours only, false for non-billable only, omitted for both.
     *
     * @x-autobe-specification Filter timelogs by billable status. If true, only billable timelogs included. If false, only non-billable timelogs included. If omitted, includes both. Maps to hrm_platform_timelogs.billable column.
     */
    billable?: boolean | undefined;

    /**
     * Page number for pagination (1-indexed). Minimum value is 1.
     *
     * @x-autobe-specification Page number for pagination (1-indexed). Minimum value is 1. Defaults to 1 if not provided. Used with limit to paginate aggregated results.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records per page. Range: 1-100.
     *
     * @x-autobe-specification Number of records per page. Minimum 1, maximum 100. Defaults to backend default if not provided. Controls page size for paginated results.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Sort field. Options: totalHours, billableHours, nonBillableHours, name (group entity name).
     *
     * @x-autobe-specification Sort field for results. 'totalHours' sorts by aggregated total hours, 'billableHours' by billable hours, 'nonBillableHours' by non-billable hours, 'name' by group entity name (employee display name, project name, or task title).
     */
    sort?:
      | "totalHours"
      | "billableHours"
      | "nonBillableHours"
      | "name"
      | undefined;

    /**
     * Sort direction. Options: asc (ascending), desc (descending).
     *
     * @x-autobe-specification Sort direction. 'asc' for ascending order, 'desc' for descending order. Applied to the field specified in sort parameter.
     */
    direction?: "asc" | "desc" | undefined;
  };

  /**
   * Time report summary showing aggregated hours for a single grouping dimension (employee, project, or task). Includes total hours worked with billable and non-billable breakdown. Used in paginated time report responses.
   */
  export type ISummary = {
    /**
     * The grouping dimension for this report entry. Indicates whether hours are aggregated by employee, project, or task.
     *
     * @x-autobe-specification Query parameter value echoed in response. Determines which entity reference (employee/project/task) is populated. Values: 'employee', 'project', 'task'.
     */
    group_type: "employee" | "project" | "task";

    /**
     * Employee reference when grouped by employee. Null when grouped by project or task.
     *
     * @x-autobe-specification LEFT JOIN to hrm_platform_employees via timelogs.employee_id. Returns IHrmPlatformEmployee.ISummary when group_type='employee', otherwise null.
     */
    employee: IHrmPlatformEmployee.ISummary | null;

    /**
     * Project reference when grouped by project. Null when grouped by employee or task.
     *
     * @x-autobe-specification LEFT JOIN to hrm_platform_projects via timelogs.project_id. Returns IHrmPlatformProject.ISummary when group_type='project', otherwise null.
     */
    project: IHrmPlatformProject.ISummary | null;

    /**
     * Task reference when grouped by task. Null when grouped by employee or project.
     *
     * @x-autobe-specification LEFT JOIN to hrm_platform_tasks via timelogs.task_id. Returns IHrmPlatformTask.ISummary when group_type='task', otherwise null.
     */
    task: IHrmPlatformTask.ISummary | null;

    /**
     * Total hours worked in this grouping dimension. Sum of billable and non-billable hours.
     *
     * @x-autobe-specification SUM(timelogs.duration_minutes) / 60.0. Rounded to 2 decimal places. Includes all timelogs in the group regardless of billable status.
     */
    total_hours: number & tags.Minimum<0>;

    /**
     * Hours worked on billable tasks. Timelogs marked as billable only.
     *
     * @x-autobe-specification SUM(timelogs.duration_minutes WHERE timelogs.billable = true) / 60.0. Rounded to 2 decimal places.
     */
    billable_hours: number & tags.Minimum<0>;

    /**
     * Hours worked on non-billable tasks. Timelogs marked as non-billable only.
     *
     * @x-autobe-specification SUM(timelogs.duration_minutes WHERE timelogs.billable = false) / 60.0. Rounded to 2 decimal places.
     */
    non_billable_hours: number & tags.Minimum<0>;
  };
}
