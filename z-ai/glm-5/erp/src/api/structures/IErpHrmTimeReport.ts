import { tags } from "typia";

import { IErpHrmEmployee } from "./IErpHrmEmployee";
import { IErpHrmProject } from "./IErpHrmProject";
import { IErpHrmTask } from "./IErpHrmTask";

export namespace IErpHrmTimeReport {
  /**
   * Request body for generating time reports. Supports filtering by date range, employee, project, and billable status. Results can be grouped by employee, project, or task to provide different analytical perspectives. Pagination controls allow browsing through large result sets.
   */
  export type IRequest = {
    /**
     * Start date for the report period (inclusive). Filters timelogs by date field.
     */
    from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for the report period (inclusive). Filters timelogs by date field.
     */
    to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter results to a specific employee's timelogs.
     */
    employee_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Filter results to a specific project's timelogs.
     */
    project_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Filter by billable status. True for billable only, false for non-billable only, null for all.
     */
    billable?: boolean | null | undefined;

    /**
     * Grouping dimension for the report. Determines how aggregated hours are organized in the results.
     */
    groupBy?: "employee" | "project" | "task" | null | undefined;

    /**
     * Page number for pagination. Defaults to 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of results per page. Defaults to 20, maximum 100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * A single time report entry containing aggregated hours data grouped by employee, project, or task. Displays total hours, billable hours, non-billable hours, and timelog count for the specified grouping dimension along with the relevant entity context for reporting and analytics purposes.
   */
  export type ISummary = {
    /**
     * The grouping dimension used for this report entry. Determines whether the aggregation shows data per employee, per project, or per task.
     *
     * @x-autobe-specification Value derived from the request parameter 'groupBy'. Determines which dimension to aggregate by: 'employee' groups by employee_id from erp_hrm_timelogs, 'project' groups by project_id, 'task' groups by task_id. This value dictates which of the three entity properties (employee, project, task) will be populated with actual data; the other two remain null.
     */
    groupBy: "employee" | "project" | "task";

    /**
     * Employee details when the report is grouped by employee. Contains employee summary with member profile, role, and department. Null when grouping by project or task.
     *
     * @x-autobe-specification Conditionally populated based on groupBy value. When groupBy='employee': LEFT JOIN erp_hrm_timelogs.employee_id to erp_hrm_employees.id, then JOIN to erp_hrm_members, erp_hrm_roles, and erp_hrm_departments to construct IErpHrmEmployee.ISummary. When groupBy is 'project' or 'task', this property is null. The employee summary includes member profile (display name, avatar), role, and department affiliation.
     */
    employee: IErpHrmEmployee.ISummary | null;

    /**
     * Project details when the report is grouped by project. Contains project summary with identification, status, and metadata. Null when grouping by employee or task.
     *
     * @x-autobe-specification Conditionally populated based on groupBy value. When groupBy='project': LEFT JOIN erp_hrm_timelogs.project_id to erp_hrm_projects.id to construct IErpHrmProject.ISummary containing id, name, description, colorCode, status, budgetHours, startDate, endDate, createdAt. When groupBy is 'employee' or 'task', this property is null.
     */
    project: IErpHrmProject.ISummary | null;

    /**
     * Task details when the report is grouped by task. Contains task summary with title, status, priority, and assignment information. Null when grouping by employee or project.
     *
     * @x-autobe-specification Conditionally populated based on groupBy value. When groupBy='task': LEFT JOIN erp_hrm_timelogs.task_id to erp_hrm_tasks.id, then JOIN to erp_hrm_employees if task is assigned, to construct IErpHrmTask.ISummary. When groupBy is 'employee' or 'project', this property is null. Includes task title, status, priority, assigned employee, and subtask indicator.
     */
    task: IErpHrmTask.ISummary | null;

    /**
     * Total hours logged for this group, including both billable and non-billable time. Represents the complete time investment for the grouped entity.
     *
     * @x-autobe-specification Computed as SUM(erp_hrm_timelogs.duration) / 60.0 for all timelogs in the group. Duration is stored in minutes in the database, so division by 60 converts to hours. Includes both billable and non-billable time. Uses double precision for fractional hours. Minimum value constraint: 0.
     */
    totalHours: number & tags.Minimum<0>;

    /**
     * Total billable hours logged for this group. Only includes time entries marked as billable, representing revenue-generating work.
     *
     * @x-autobe-specification Computed as SUM(erp_hrm_timelogs.duration WHERE billable = true) / 60.0. Only includes timelog entries where the billable flag is true. Duration is stored in minutes, converted to hours. Uses double precision for fractional hours. Minimum value constraint: 0.
     */
    billableHours: number & tags.Minimum<0>;

    /**
     * Total non-billable hours logged for this group. Includes time entries not marked as billable, representing internal or overhead work.
     *
     * @x-autobe-specification Computed as SUM(erp_hrm_timelogs.duration WHERE billable = false) / 60.0. Only includes timelog entries where the billable flag is false. Alternatively calculated as totalHours - billableHours. Duration is stored in minutes, converted to hours. Uses double precision for fractional hours. Minimum value constraint: 0.
     */
    nonBillableHours: number & tags.Minimum<0>;

    /**
     * Number of individual timelog entries included in this group's aggregation. Provides context for the sample size underlying the hour totals.
     *
     * @x-autobe-specification Computed as COUNT(*) of erp_hrm_timelogs records matching the group criteria. Counts all timelog entries that contribute to this group's aggregated hours, regardless of billable status. Integer type with minimum value constraint: 0.
     */
    timelogCount: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
