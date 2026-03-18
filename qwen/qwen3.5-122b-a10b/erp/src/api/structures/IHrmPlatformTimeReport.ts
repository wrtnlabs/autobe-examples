import { tags } from "typia";

import { IHrmPlatformEmployee } from "./IHrmPlatformEmployee";
import { IHrmPlatformProject } from "./IHrmPlatformProject";
import { IHrmPlatformTask } from "./IHrmPlatformTask";

export namespace IHrmPlatformTimeReport {
  /**
   * Request body for time tracking report search with customizable grouping and filtering options. Defines search criteria for generating aggregated time reports across employees, projects, or tasks. Users with report:view permission can analyze time logged within a specified date range, with results grouped by the chosen dimension. Provides hour breakdowns showing total hours logged, billable hours (chargeable to clients), and non-billable hours (internal work) for client billing, capacity planning, and internal cost tracking.
   */
  export type IRequest = {
    /**
     * Start date of the report period (inclusive). Defines the earliest date for timelog aggregation.
     *
     * @x-autobe-specification Query parameter validated as ISO 8601 date-time. Applied as lower bound filter: date >= startDate. Must be <= endDate, otherwise validation error.
     */
    startDate: string & tags.Format<"date-time">;

    /**
     * End date of the report period (inclusive). Defines the latest date for timelog aggregation.
     *
     * @x-autobe-specification Query parameter validated as ISO 8601 date-time. Applied as upper bound filter: date <= endDate. Must be >= startDate, otherwise validation error.
     */
    endDate: string & tags.Format<"date-time">;

    /**
     * Dimension to group report results by. Determines how timelogs are aggregated (by employee, project, or task).
     *
     * @x-autobe-specification Query parameter validated as enum: 'employee', 'project', or 'task'. Determines GROUP BY clause and which entity table to JOIN for metadata. Invalid value returns validation error.
     */
    groupBy: "employee" | "project" | "task";

    /**
     * Optional filter: only include timelogs for this employee. Filter by employee UUID if provided.
     *
     * @x-autobe-specification Optional UUID filter applied as: employee_id = filter. If provided, only timelogs for the specified employee are included. Not required - omit to include all employees.
     */
    employee_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Optional filter: only include timelogs for this project. Filter by project UUID if provided.
     *
     * @x-autobe-specification Optional UUID filter applied as: project_id = filter. If provided, only timelogs for the specified project are included. Not required - omit to include all projects.
     */
    project_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Optional filter: filter by billable status. true for billable hours (chargeable to clients), false for non-billable hours (internal work).
     *
     * @x-autobe-specification Optional boolean filter applied as: billable = filter. If true, only billable timelogs included. If false, only non-billable timelogs included. Not required - omit to include both.
     */
    billable?: boolean | undefined;

    /**
     * Page number for pagination (1-indexed, default: 1). Determines which page of results to return.
     *
     * @x-autobe-specification Pagination parameter validated as integer >= 1. Applied as OFFSET = (page - 1) * limit. Default: 1. Used with limit for cursor-based pagination.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of results per page (default: 20, maximum: 100). Controls pagination page size.
     *
     * @x-autobe-specification Pagination parameter validated as integer 1-100. Applied as LIMIT = limit. Default: 20, maximum: 100. Controls maximum records per page.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Aggregated time report entry showing hours logged within a date range, grouped by employee, project, or task. Includes breakdown of total hours, billable hours (chargeable to clients), and non-billable hours (internal work). Used in time tracking reports for capacity planning, client billing, and cost analysis. The grouping dimension (employee, project, or task) is determined by the report query parameters, and only the relevant relation is populated while others are null.
   */
  export type ISummary = {
    /**
     * Unique identifier for this report entry.
     *
     * @x-autobe-specification Generated UUID for each aggregation entry. Not stored in database, created during report generation to uniquely identify each row in the paginated result set.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Employee information when grouped by employee. Null when report is grouped by project or task.
     *
     * @x-autobe-specification Join from employee_id to hrm_platform_employees.id when grouping dimension is employee. Returns IHrmPlatformEmployee.ISummary. Null when grouping by project or task.
     */
    employee?: IHrmPlatformEmployee.ISummary | undefined;

    /**
     * Project information when grouped by project. Null when report is grouped by employee or task.
     *
     * @x-autobe-specification Join from project_id to hrm_platform_projects.id when grouping dimension is project. Returns IHrmPlatformProject.ISummary. Null when grouping by employee or task.
     */
    project?: IHrmPlatformProject.ISummary | undefined;

    /**
     * Task information when grouped by task. Null when report is grouped by employee or project.
     *
     * @x-autobe-specification Join from task_id to hrm_platform_tasks.id when grouping dimension is task. Returns IHrmPlatformTask.ISummary. Null when grouping by employee or project.
     */
    task?: IHrmPlatformTask.ISummary | undefined;

    /**
     * Total hours logged in this period (duration_minutes / 60). Sum of all timelogs in the aggregation group.
     *
     * @x-autobe-specification Calculated as SUM(duration_minutes)/60 from hrm_platform_timelogs within the date range. Represents total work hours regardless of billability.
     */
    total_hours: number;

    /**
     * Billable hours (chargeable to clients). Sum of timelogs where billable flag is true.
     *
     * @x-autobe-specification Calculated as SUM(duration_minutes)/60 from hrm_platform_timelogs WHERE billable=true within the date range. Represents chargeable work hours.
     */
    billable_hours: number;

    /**
     * Non-billable hours (internal work). Sum of timelogs where billable flag is false.
     *
     * @x-autobe-specification Calculated as SUM(duration_minutes)/60 from hrm_platform_timelogs WHERE billable=false within the date range. Represents internal work hours.
     */
    non_billable_hours: number;

    /**
     * Date range covered by this report entry. Contains start and end timestamps defining the aggregation period.
     *
     * @x-autobe-specification Aggregation period dates passed as query parameters. start represents the beginning of the time range, end represents the end of the time range. Used to filter hrm_platform_timelogs records.
     */
    date_range: {
      /**
       * Start date of the aggregation period
       */
      start: string & tags.Format<"date-time">;

      /**
       * End date of the aggregation period
       */
      end: string & tags.Format<"date-time">;
    };
  };
}
