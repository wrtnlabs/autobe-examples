import { tags } from "typia";

export namespace IHrmsTopEmployee {
  /**
   * Request parameters for retrieving top employees ranked by time tracking metrics. Specifies the time period for aggregation, optional filters for specific employees or projects, pagination controls, and sort order for the results.
   */
  export type IRequest = {
    /**
     * Date range for filtering timelog entries to aggregate hours worked. Specifies the start and end dates (inclusive) for calculating total hours, billable hours, and work counts per employee.
     *
     * @x-autobe-specification Required date range for timelog aggregation. Filters timelog records where date falls between start_date and end_date (inclusive). Data source: timelogs.date column. Validation: start_date must be before or equal to end_date. Default to current week if not specified.
     */
    dateRange: {
      startDate: string & tags.Format<"date">;
      endDate: string & tags.Format<"date">;
    };

    /**
     * Unique identifier of a specific employee to include in the report. Filters results to show only hours worked by this employee. If omitted, includes all employees in the organization.
     *
     * @x-autobe-specification Optional UUID filter to restrict results to a specific employee. Filters timelog records by employee_id before aggregation. If omitted, includes all employees. Data source: timelogs.employee_id column.
     */
    employeeId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Unique identifier of a specific project to include in the report. Filters results to show only hours logged for this project. If omitted, includes hours from all projects in the organization.
     *
     * @x-autobe-specification Optional UUID filter to restrict results to a specific project. Filters timelog records by project_id before aggregation. If omitted, includes timelogs from all projects. Data source: timelogs.project_id column.
     */
    projectId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Page number for paginated results. Specifies which page of the ranked employee list to retrieve. Must be a positive integer starting from 1.
     *
     * @x-autobe-specification Page number for cursor-based pagination (1-indexed). Controls which page of results to return. Data source: query parameter passed to aggregation query. Combined with limit to calculate offset. Minimum value: 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of top employees to return per page. Defines the page size for pagination results. Must be between 1 and 100.
     *
     * @x-autobe-specification Maximum number of results per page. Limits the number of employees returned in a single page. Data source: query parameter passed to aggregation query. Validation: 1 <= limit <= 100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Sort field for ranking employees in the report. Determines which metric is used to order the results, such as total hours logged, billable hours, or count of projects worked on.
     *
     * @x-autobe-specification Sort field for ranking employees. Options: total_hours (default), billable_hours, project_count, task_count, employee_name, department. Data source: aggregated computed fields from timelog aggregation. Results ordered DESC by selected field.
     */
    sort?:
      | "total_hours"
      | "billable_hours"
      | "project_count"
      | "task_count"
      | "employee_name"
      | "department"
      | undefined;
  };

  /**
   * Summary representation of a top employee in the ranked time tracking report, showing hours worked and work distribution metrics across projects.
   *
   * This DTO aggregates timelog data to provide key performance indicators for each employee within a specified date range. It displays total logged hours, billable hours, and the number of distinct projects and tasks worked on. The data is automatically calculated from timelog records and can be filtered by date range, projects, and sorted by various metrics.
   */
  export type ISummary = {
    /**
     * Unique identifier of the employee.
     *
     * @x-autobe-specification Direct mapping from hrms_employees.id column in the employee-to-timelogs JOIN. Primary key of employee record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Display name of the employee as shown in the organization.
     *
     * @x-autobe-specification Direct mapping from hrms_employees.display_name column in the employee-to-timelogs JOIN. The name shown in the organization.
     */
    display_name: string;

    /**
     * Job title or position of the employee (e.g., Senior Developer, Marketing Manager).
     *
     * @x-autobe-specification Direct mapping from hrms_employees.position column in the employee-to-timelogs JOIN. Can be NULL if position not assigned.
     */
    position: string;

    /**
     * Identifier of the department the employee belongs to.
     *
     * @x-autobe-specification Direct mapping from hrms_employees.department_id column. Nullable: employees may not be assigned to a department. UUID format when present.
     */
    department_id: (string & tags.Format<"uuid">) | null;

    /**
     * Total number of hours (in minutes) logged by the employee within the specified date range.
     *
     * @x-autobe-specification Computed aggregation: SUM(hrms_timelogs.duration_minutes) from all timelogs within the date range. Value is in MINUTES (not converted to hours for precision). Represents the total time logged by the employee.
     */
    total_hours: number & tags.Type<"int32">;

    /**
     * Number of billable hours (in minutes) logged by the employee within the specified date range.
     *
     * @x-autobe-specification Computed aggregation: SUM(CASE WHEN hrms_timelogs.billable THEN hrms_timelogs.duration_minutes ELSE 0) from all billable timelogs within the date range. Value is in MINUTES. Represents time logged for billable/client work.
     */
    billable_hours: number & tags.Type<"int32">;

    /**
     * Number of distinct projects the employee has worked on within the specified date range.
     *
     * @x-autobe-specification Computed aggregation: COUNT(DISTINCT hrms_timelogs.project_id) from all timelogs within the date range. Excludes NULL project_id values. Represents the number of unique projects the employee has worked on.
     */
    project_count: number & tags.Type<"int32">;

    /**
     * Number of distinct tasks the employee has worked on within the specified date range.
     *
     * @x-autobe-specification Computed aggregation: COUNT(DISTINCT hrms_timelogs.task_id) from all timelogs within the date range. Excludes NULL task_id values. Represents the number of unique tasks the employee has worked on.
     */
    task_count: number & tags.Type<"int32">;
  };
}
