import { TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IErpHrmTimeTrackingReportDefinition } from "../../../../api/structures/IErpHrmTimeTrackingReportDefinition";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { getErpHrmTimeTrackingMemberDashboard } from "../../../../providers/getErpHrmTimeTrackingMemberDashboard";

@Controller("/erpHrmTimeTracking/member/dashboard")
export class ErphrmtimetrackingMemberDashboardController {
  /**
   * Provides the HRM time-tracking dashboard for the currently active organization context.
   *
   * This endpoint is a read-only aggregation endpoint that composes multiple organization-scoped data widgets: organization dashboard (for users with report:view permission) and personal dashboard (for all users). The business flow requires an active organization context for report-related data; when organization context is missing, report access rules state the request must be blocked with a business validation message indicating the user must select an organization context before accessing reports.
   *
   * If the requesting member has report:view permission in the selected organization, the response includes the organization dashboard contents such as total active employees, total hours logged this week, number of pending timesheets awaiting approval, projects exceeding the configured budget utilization threshold (e.g., over 80%), and top employees by hours logged this week. For users without report:view permission, the endpoint must show only the personal dashboard for the selected organization context.
   *
   * Organization isolation is mandatory: all timelog-derived computations (e.g., hours, recent timelogs, weekly totals) must be restricted to timelogs belonging to the currently selected organization. This endpoint must never return timelog, timesheet, project, or member-related results from other organizations, even when the user belongs to multiple organizations.
   *
   * Dashboard computations depend on time-based report logic and must follow the reporting generation flow and empty-result behavior: if the selected organization has no employees, or if there are no matching timelogs within the requested/internal date windows, the endpoint must return an empty result set safely rather than failing. For personal widgets that rely on the current week timesheet status, the implementation must determine the “current week” boundaries consistently with timesheet week_start_at/week_end_at semantics.
   *
   * Security and authorization:
   *
   * - Members without an active organization context must be blocked for report-derived widgets.
   * - Members without report:view permission must be limited to personal dashboard widgets.
   * - Any employee/time-tracking related outputs must respect employee state rules: if a time tracking operation is requested for a deactivated employee, it is considered invalid. While this endpoint is read-only, it must still avoid exposing time-tracking actions/outputs for deactivated employees beyond what is allowed by the reporting views, using the same decisive deactivation checks when employee eligibility is required by downstream computations.
   *
   * Related operations:
   *
   * - This dashboard is conceptually driven by the same data and metrics used by report generation runs and outputs (report definitions, generation runs, and metric breakdown rows). If implementation chooses to reuse persisted report outputs, it must ensure the report generation run parameters are scoped to the selected organization and align with the dashboard widgets’ grouping and filtering.
   * - Detailed report result viewing should be implemented through the report operations (Time Report, Project Budget Report, Weekly Summary Report), while this endpoint is responsible for the at-a-glance composition.
   *
   * Expected behavior:
   *
   * - Always returns HTTP 200 with the dashboard payload when authorization and organization context checks pass.
   * - Returns a business validation error when organization context is missing.
   * - Returns an empty/zero-populated dashboard where the selected organization has no data for the computed windows rather than producing errors.
   *
   * @param connection
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implementation steps:
   *
   * 1) Resolve organization context
   * - Read the currently selected organization context from the request/session context (no path/body parameters).
   * - If missing, return a business validation error indicating the user must select an organization context before accessing reports.
   *
   * 2) Authorization
   * - Check whether the member has report:view permission within the selected organization.
   * - If yes, compute organization dashboard widgets.
   * - If no, compute only personal dashboard widgets.
   *
   * 3) Compute time windows
   * - Determine the current week window using the same semantics as timesheet week_start_at and week_end_at.
   * - Determine today/today window for personal “hours logged today”. Use Asia/Seoul timezone handling at the application layer.
   *
   * 4) Organization dashboard widgets (only when report:view is allowed)
   * - Total employees (active): count erp_hrm_time_tracking_members that are active within the selected organization context. If member deactivation is represented via members.deleted_at, exclude deleted/deactivated members.
   * - Total hours logged this week: sum timelogs.duration_minutes grouped/filtered by erp_hrm_time_tracking_timelogs.work_date within current week boundaries and scoped to erp_hrm_time_tracking_organization_id.
   * - Pending timesheets awaiting approval: count erp_hrm_time_tracking_timesheets whose status indicates draft/submitted but not approved/rejected (use actual status values from the timesheet business rules; if status values are stored as strings, match via business-rule mapping).
   * - Projects with budget utilization over threshold: compute budget vs actual hours using contracts/billing context if available in schemas; otherwise, reuse existing report generation outputs for Project Budget Report when present for the current parameters. If reusing persisted report outputs:
   *   - Find the latest succeeded report_generation_runs for the selected organization and matching report definition and parameters_summary.
   *   - Read report_outputs and report_output_metrics to compute percentage and filter > 80%.
   * - Top 5 employees by hours logged this week:
   *   - Aggregate timelogs duration by employee_id within the organization and current week.
   *   - Join to members to resolve display data.
   *   - Order by total hours desc and limit 5.
   *
   * 5) Personal dashboard widgets (always)
   * - Hours logged today and this week:
   *   - For today: sum duration_minutes where work_date is within today in Asia/Seoul and organization is selected.
   *   - For week: sum duration_minutes within current week boundaries.
   * - Active timer status:
   *   - Query erp_hrm_time_tracking_timer_sessions for the current member and selected organization where is_active=true and deleted_at is null/ignored according to schema soft-delete handling.
   *   - If present, return running project/task references and started_at; otherwise return inactive status.
   * - Recent timelogs (last 5):
   *   - Query erp_hrm_time_tracking_timelogs scoped to selected organization and current member, excluding deleted_at.
   *   - Order by work_date desc, then created_at desc, limit 5.
   * - Pending timesheet status for current week:
   *   - Query erp_hrm_time_tracking_timesheets for current member and selected organization with week_start_at/week_end_at matching the current week.
   *   - If status indicates awaiting approval, return pending details; else return current status.
   * - Tasks assigned to the employee with status open/in-progress:
   *   - Query erp_hrm_time_tracking_tasks where assigned_employee_id equals current member id, project belongs to selected organization, and deleted_at is null.
   *   - Return tasks with status in-progress or open, ordered by created_at desc or due_date asc.
   *
   * 6) Empty-result handling
   * - If organization has no employees or no timelogs in the computed windows, return zeros/empty lists for the corresponding widgets and still return HTTP 200.
   *
   * 7) Response shaping
   * - Map database rows/aggregations into the dashboard response DTO.
   *
   * Transactions:
   * - Use read-only queries; no write transaction required.
   *
   * Error handling:
   * - If organization context missing: return business validation error.
   * - If authorization fails for organization dashboard widgets: omit organization dashboard data and provide personal dashboard only.
   * - If unexpected inconsistencies occur (e.g., report output references missing), fall back to live aggregation where feasible or return empty widgets with no crash.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get()
  public async at(
    @MemberAuth()
    member: MemberPayload,
  ): Promise<IErpHrmTimeTrackingReportDefinition> {
    try {
      return await getErpHrmTimeTrackingMemberDashboard({
        member,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
