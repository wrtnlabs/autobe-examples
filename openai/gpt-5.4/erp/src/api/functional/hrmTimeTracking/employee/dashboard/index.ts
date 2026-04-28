import { IConnection, PlainFetcher } from "@nestia/fetcher";
import typia from "typia";

import { IHrmTimeTrackingReport } from "../../../../structures/IHrmTimeTrackingReport";

/**
 * Retrieve the read-only dashboard summary for the caller in the currently selected organization context.
 *
 * This operation returns dashboard information derived from existing business records rather than from a standalone dashboard table. The dashboard concept is defined as a summary widget view that presents current, role-relevant information for the selected organization context and does not replace transactional records such as timelogs, timesheets, tasks, projects, or employees. In practice, the personal portion of the response summarizes the caller's own work and time information in that organization, including hours logged today, hours logged this week, active timer status, recent timelogs, current-week timesheet status, and assigned tasks whose current workflow status is open or in-progress. The organization portion summarizes organization-level indicators such as total active employees, current-week logged hours, pending timesheets awaiting approval, projects exceeding eighty percent of planned budget hours, and the top five employees by current-week logged hours.
 *
 * Access is evaluated strictly within the currently selected organization. Every employee who has an employee record in the selected organization can view the personal dashboard for that organization. If the caller has no employee membership in the selected organization, access to the personal dashboard must be rejected for that organization context. The organization dashboard is more restricted: it is returned only when the caller is allowed to view reports in the selected organization. If that permission is not present, the system must deny the organization-dashboard portion rather than exposing management summaries from the tenant. These rules must be reevaluated whenever the current organization changes or when the caller's role or permissions change within that organization.
 *
 * The underlying data comes from several normalized tables. Personal metrics rely on the employee identity in hrm_time_tracking_employees, historical work records in hrm_time_tracking_timelogs, the live running timer in hrm_time_tracking_timers, weekly workflow state in hrm_time_tracking_timesheets, and assigned work items in hrm_time_tracking_tasks linked to hrm_time_tracking_projects so that only data belonging to the selected organization is included. Organization metrics are aggregated from employee, timelog, timesheet, and project records within the same organization boundary. Because hrm_time_tracking_projects stores optional budget_hours and lifecycle status, budget-pressure indicators must be computed by comparing current logged effort against that project budget, not by reading any precomputed percentage column.
 *
 * This operation must be used as the primary entry point for dashboard rendering after organization context is established in the authenticated session or request context. When the user switches to another organization, the client should call this operation again so the service can clear prior-organization values and return freshly recalculated summaries for the new context. Consumers that need full record details must use the dedicated entity operations for timelogs, timesheets, tasks, projects, or employees rather than relying on dashboard widgets, because the dashboard intentionally exposes summary-oriented, read-only information only.
 *
 * If the caller is unauthorized for the selected organization, if no selected organization context can be resolved, or if the caller lacks an employee membership required for the personal dashboard, the operation should fail clearly rather than returning mixed or partial cross-tenant data. The service must ensure that no employee, project, timesheet, timelog, task, or timer from another organization appears in the response, even for multi-organization users.
 *
 * @param props.connection
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor employee
 * @x-autobe-specification Resolve the currently selected organization context
 *   from the authenticated session or request-scoped organization selector
 *   before executing any dashboard query. Authorize the caller against that
 *   organization only. First resolve whether the caller has an employee
 *   membership in the selected organization; if not, reject access because the
 *   personal dashboard requires an employee record in that organization.
 *   Separately evaluate whether the caller has report-viewing permission in the
 *   selected organization to determine whether the organization summary may be
 *   included.
 *
 * Build the personal dashboard summary from organization-scoped source records only. Identify the caller's employee account in hrm_time_tracking_employees for the selected organization membership, then aggregate hrm_time_tracking_timelogs for that employee and organization to calculate hours logged today and hours logged during the current week. Query hrm_time_tracking_timers by the employee foreign key using the unique hrm_time_tracking_employee_id constraint to load the active timer, if present, and verify that its hrm_time_tracking_organization_id matches the selected organization. Load up to five most recent non-deleted timelogs for that employee within the organization ordered by worked_on descending and created_at descending. Load the current-week timesheet from hrm_time_tracking_timesheets using the unique combination of hrm_time_tracking_employee_id and week_start_date. Load assigned tasks from hrm_time_tracking_tasks where hrm_time_tracking_employee_id matches the employee, status is open or in-progress, deleted_at is null, and the joined project belongs to the selected organization.
 *
 * When organization-dashboard permission is granted, compute the organization summary in separate aggregate queries scoped to the selected organization. Count active employees only, using the organization's workforce membership records and their active status classification rather than counting actor identities globally. Sum current-week duration_minutes from hrm_time_tracking_timelogs for the selected organization and convert to hours in the response DTO according to shared response conventions. Count pending approval workload from hrm_time_tracking_timesheets for the selected organization using the workflow state that represents submitted items awaiting review. For project budget pressure, query hrm_time_tracking_projects in the selected organization with non-null budget_hours and non-deleted records, aggregate actual logged time from hrm_time_tracking_timelogs per project for the relevant comparison window defined by business logic, compute utilization as logged_hours divided by budget_hours, and include only projects whose utilization exceeds 0.8. For top contributors, aggregate current-week logged minutes by employee in the selected organization, order descending, and return the first five employees with their totals.
 *
 * Assemble a single IHrmTimeTrackingDashboard response object that contains the personal summary and a nullable organization summary. Do not persist any dashboard row or cache that outlives the organization context unless an external caching layer is explicitly configured for read optimization. Exclude deleted records by checking deleted_at on projects, tasks, timelogs, timers, timesheets, and employee actor identities where applicable. Return authorization failures for missing organization access or missing employee membership, and never fall back to data from another organization or a previously selected organization.
 * @path /hrmTimeTracking/employee/dashboard
 * @accessor api.functional.hrmTimeTracking.employee.dashboard.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(connection: IConnection): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(),
          status: null,
        },
      );
}
export namespace at {
  export type Response = IHrmTimeTrackingReport;

  export const METADATA = {
    method: "GET",
    path: "/hrmTimeTracking/employee/dashboard",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/hrmTimeTracking/employee/dashboard";
  export const random = (): IHrmTimeTrackingReport =>
    typia.random<IHrmTimeTrackingReport>();
  export const simulate = (_connection: IConnection): Response => {
    return random();
  };
}
