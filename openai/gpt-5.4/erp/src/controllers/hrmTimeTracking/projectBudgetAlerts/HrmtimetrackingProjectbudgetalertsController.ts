import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingProjectBudgetAlert } from "../../../api/structures/IHrmTimeTrackingProjectBudgetAlert";
import { IPageIHrmTimeTrackingProjectBudgetAlert } from "../../../api/structures/IPageIHrmTimeTrackingProjectBudgetAlert";
import { getHrmTimeTrackingProjectBudgetAlertsProjectBudgetAlertId } from "../../../providers/getHrmTimeTrackingProjectBudgetAlertsProjectBudgetAlertId";
import { patchHrmTimeTrackingProjectBudgetAlerts } from "../../../providers/patchHrmTimeTrackingProjectBudgetAlerts";

@Controller("/hrmTimeTracking/projectBudgetAlerts")
export class HrmtimetrackingProjectbudgetalertsController {
  /**
   * Retrieve a filtered and paginated list of project budget alert records for the currently selected organization.
   *
   * This operation exposes the derived budget alert dataset stored in hrm_time_tracking_project_budget_alerts, which exists to support organization dashboard insight. Each record represents a project's budget-consumption state for a specific summarized weekly window and indicates whether the project's logged hours met or exceeded a configured threshold. The response is intended for list screens, dashboard widgets, and analytical views that help organization users identify projects approaching or exceeding planned effort levels.
   *
   * The operation is organization-scoped. Clients must call it within the currently selected organization context, and the system must never mix alert data across organizations. This reflects the broader platform rule that access evaluation is performed separately for each organization context and that data visible in one organization must not grant visibility into another. Only authorized users in the active organization should be able to retrieve this insight data.
   *
   * The returned records are based on the normalized relationship between hrm_time_tracking_project_budget_alerts and hrm_time_tracking_projects. Alert rows provide the summarized week_start_date, week_end_date, actual_hours, utilization_rate, threshold_rate, is_alert flag, and lifecycle timestamps for the derived alert record, while project data provides the human-facing project identity and display attributes such as name, color_code, status, budget_hours, start_date, and end_date. Because the projects table intentionally excludes derived reporting values, this endpoint is the appropriate interface for browsing budget-consumption alert outcomes rather than recalculating them on the client.
   *
   * Clients should use this operation when they need advanced filtering, pagination, or sorting beyond a simple collection fetch. Typical filters include whether a record is currently flagged as an alert, specific project identifiers, weekly date windows, project lifecycle status, and threshold or utilization ranges. Results should be optimized for summary presentation so users can quickly understand which projects require review before navigating to more detailed project views.
   *
   * This operation is read-oriented and does not create, modify, or remove alert records. Project budget alerts are derived insight records created to support reproducible historical dashboard views, so consumers should treat this endpoint as a search and browsing interface over existing summarized data. If a user needs to inspect or manage the underlying project definition itself, related project retrieval or project update operations should be used separately.
   *
   * @param connection
   * @param body Search criteria and pagination options for project budget alerts
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implement this operation as an
     *   organization-scoped search over hrm_time_tracking_project_budget_alerts
     *   with mandatory authorization and tenant isolation checks before
     *   querying any data.
   *
   * Resolve the caller's active organization context from authentication/session state, then verify that the caller is allowed to view project or dashboard insight data in that organization. Deny the request when the caller has no organization-selected access, when the selected organization does not match the caller's membership context, or when the caller lacks the applicable read permission for project insight visibility. Do not permit a role from another organization to influence authorization for the active request.
   *
   * Build the main query from hrm_time_tracking_project_budget_alerts as the primary source and join hrm_time_tracking_projects on hrm_time_tracking_project_id to enrich response items with project display data required by summary views. Constrain all results to the resolved organization by matching hrm_time_tracking_project_budget_alerts.hrm_time_tracking_organization_id to the active organization identifier. Exclude logically removed alert rows by default with deleted_at IS NULL, and also exclude logically removed projects if the joined project record has deleted_at set, unless future explicit requirements introduce an administrative recovery view.
   *
   * Support request-body filtering for common analytical needs: exact or multiple project identifiers, is_alert flag, week_start_date and week_end_date ranges, utilization_rate range, threshold_rate range, actual_hours range, project status, partial project name search using the joined project name, and created_at or updated_at ranges when operational diagnostics need them. If the request schema includes free-text search, apply it only to verified searchable columns such as project name and never to invented fields.
   *
   * Apply deterministic pagination and sorting. Use a stable default sort that prioritizes currently actionable insight, such as is_alert descending, week_start_date descending, utilization_rate descending, and id ascending as a tie-breaker. Respect client-provided page size and cursor or offset parameters according to the generated IRequest schema. Return the paginated envelope in IPageIHrmTimeTrackingProjectBudgetAlert.ISummary.
   *
   * Map each result item to a summary DTO containing the alert record's weekly window and consumption indicators plus enough project context for list rendering. Include only schema-backed fields from the alert and joined project tables. Do not compute or expose external integration metadata because the loaded requirements explicitly state that no user-facing integration workflow is in scope.
   *
   * Handle edge cases explicitly: return an empty page when no alerts match the filters; reject malformed range filters where the start boundary exceeds the end boundary; reject requests that attempt to force access to another organization's data; and ensure permission failures do not leak whether records exist in other organizations. Keep the operation read-only and non-transactional apart from the consistency guarantees of the underlying query.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody()
    body: IHrmTimeTrackingProjectBudgetAlert.IRequest,
  ): Promise<IPageIHrmTimeTrackingProjectBudgetAlert.ISummary> {
    try {
      return await patchHrmTimeTrackingProjectBudgetAlerts({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve one project budget alert detail record for the currently selected organization context.
   *
   * This operation returns a single derived budget alert entry from the organization dashboard insight set. The underlying record comes from the `hrm_time_tracking_project_budget_alerts` table, which is described as a derived budget alert record for organization dashboard insight. Each record captures a project's budget-consumption state for a specific weekly summary window so dashboard queries can identify projects whose logged hours have crossed an alert threshold such as 80 percent. The response therefore represents one historical summary window, including the summarized week start and end timestamps, the actual accumulated logged hours used in the calculation, the computed utilization ratio, the threshold ratio, and whether the project met that threshold.
   *
   * The operation is organization-scoped. The system must interpret the request within the caller's currently selected organization context and must not expose a budget alert from another organization, even when the same account belongs to multiple organizations. Access evaluation must be based only on permissions available in the active organization workspace. This endpoint is intended for organization-level dashboard and reporting visibility, so it is appropriate for owners and managers with access to organization insights, not for authentication or identity-provider workflows.
   *
   * This endpoint is closely related to the `hrm_time_tracking_projects` table because every alert references an alerted project without duplicating project master data. The returned detail should therefore reflect the relationship to the owning project, whose normalized source attributes include its name, optional description, required UI display color code, lifecycle status, optional budgeted hours, and optional planning dates. This gives API consumers enough context to display why the project appears in a budget alert view while preserving the alert record as a separate derived insight entity.
   *
   * The record should only be returned when it exists, belongs to the selected organization, and is still active for retrieval. If the alert record has been logically removed or the caller attempts to access a record outside the active organization context, the system must reject the request instead of leaking cross-organization information. This behavior aligns with the requirement that dashboard data remain scoped to the selected organization and that absent dashboard data be represented accurately rather than substituted from another organization or another period.
   *
   * Clients typically use this operation after obtaining organization-level dashboard summaries or project-oriented budget alert lists. After a dashboard widget or alert list identifies a specific alert record, this detail endpoint can be called to inspect the exact weekly summary window and utilization measurements for the affected project.
   *
   * @param connection
   * @param projectBudgetAlertId Target project budget alert record ID
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implement a read-only service method that
     *   retrieves one record from `hrm_time_tracking_project_budget_alerts` by
     *   `id` and joins the related `hrm_time_tracking_projects` record for
     *   enriched response composition.
   *
   * Resolve the caller's currently selected organization context first. Authorize only actors who can access organization-level dashboard or reporting information in that active workspace, especially owners and managers. Evaluate permissions only within the current organization context and deny access when the caller lacks the required organization-scoped authority.
   *
   * Query the alert table by the provided UUID and enforce `hrm_time_tracking_organization_id` equality with the active organization. Exclude logically removed alert rows by requiring `deleted_at IS NULL`. Also exclude related projects that are logically removed if the response composition depends on project visibility. If no matching record exists under the current organization scope, return a not-found result rather than indicating whether the identifier exists in another organization.
   *
   * Compose the response from the alert record's source fields: `id`, `week_start_date`, `week_end_date`, `actual_hours`, `utilization_rate`, `threshold_rate`, `is_alert`, `created_at`, and `updated_at`. Include the related project details needed by the DTO from `hrm_time_tracking_projects`, such as `id`, `name`, `description`, `color_code`, `status`, `budget_hours`, `start_date`, and `end_date`. Do not fabricate derived values that are not stored or deterministically computed from loaded schema fields.
   *
   * No transaction is required beyond a consistent read unless the implementation layer mandates one for authorization and query atomicity. Return a standard authorization failure when the actor is not allowed, and a not-found failure when the record is absent in the selected organization context. Do not provide write behavior for this entity because project budget alerts are system-derived dashboard insight records rather than user-managed master data.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":projectBudgetAlertId")
  public async at(
    @TypedParam("projectBudgetAlertId")
    projectBudgetAlertId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingProjectBudgetAlert> {
    try {
      return await getHrmTimeTrackingProjectBudgetAlertsProjectBudgetAlertId({
        projectBudgetAlertId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
