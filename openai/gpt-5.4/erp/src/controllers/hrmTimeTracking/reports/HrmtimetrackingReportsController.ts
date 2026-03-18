import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingReport } from "../../../api/structures/IHrmTimeTrackingReport";
import { IPageIHrmTimeTrackingReport } from "../../../api/structures/IPageIHrmTimeTrackingReport";
import { deleteHrmTimeTrackingReportsReportId } from "../../../providers/deleteHrmTimeTrackingReportsReportId";
import { getHrmTimeTrackingReportsReportId } from "../../../providers/getHrmTimeTrackingReportsReportId";
import { patchHrmTimeTrackingReports } from "../../../providers/patchHrmTimeTrackingReports";
import { postHrmTimeTrackingReports } from "../../../providers/postHrmTimeTrackingReports";
import { putHrmTimeTrackingReportsReportId } from "../../../providers/putHrmTimeTrackingReportsReportId";

@Controller("/hrmTimeTracking/reports")
export class HrmtimetrackingReportsController {
  /**
   * Create a new saved report definition for the currently selected organization.
   *
   * This operation creates an organization-scoped report configuration based on the saved report definition model in `hrm_time_tracking_reports`. The saved definition captures the stable analytical settings that make a report reusable over time, including the human-readable report name, the report family, the optional inclusive reporting period defined by `range_start_date` and `range_end_date`, the optional grouping dimension stored in `group_by`, and optional billable filtering flags stored in `billable_only` and `include_non_billable`. The created resource represents a reusable reporting view rather than a one-time export, allowing users to preserve reporting intent and reopen the same analytical configuration later.
   *
   * This endpoint must be used only within the user's currently selected organization context. In line with the report access requirements, the system shall permit creation only for users who can access reporting functions in that organization context, and it shall never allow references from another organization to influence the saved configuration. Any selected employees, projects, or tasks included in the request must belong to the same current organization as the parent report definition. If the user lacks report viewing permission in the active organization, or if any referenced filter target belongs elsewhere, the request must be rejected and no saved report definition may be created.
   *
   * The operation persists the parent record in `hrm_time_tracking_reports` and, when provided, creates the normalized child selections in `hrm_time_tracking_report_employee_filters`, `hrm_time_tracking_report_project_filters`, and `hrm_time_tracking_report_task_filters`. This mirrors the database design, where repeating filter selections are normalized into dedicated child tables instead of being stored as arrays or serialized text inside the parent record. The result is a reusable report definition that remains consistent with the platform's Third Normal Form design and supports reproducible reporting behavior over time.
   *
   * The request must use one of the supported report families described by the reporting domain: Time Report, Project Budget Report, or Weekly Summary Report. Validation should also ensure that the report name is unique within the current organization, because the database enforces a composite uniqueness rule on organization and name. If validation fails, the system must reject the creation request without writing a partial parent record or partial child filter selections. This endpoint may later be used together with report-reading operations that load the reporting area and execute or refresh the saved definition for visible results.
   *
   * @param connection
   * @param body New saved report definition data
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement a create-report service that writes a new saved report definition into `hrm_time_tracking_reports` within a single transaction.
   *
   * 1. Resolve the authenticated user and active organization context from the session.
   * 2. Evaluate report-viewing permission only in that active organization context. Reject the request if the caller lacks permission.
   * 3. Validate request payload fields against supported reporting behavior:
   *    - `name` must be non-empty and unique within the active organization.
   *    - `reportType` must map to one of the supported report families represented by the persisted `report_type` column.
   *    - If both range boundaries are provided, `rangeStartDate` must be less than or equal to `rangeEndDate`.
   *    - `groupBy` is optional and should be allowed only when compatible with the selected report family.
   *    - `billableOnly` and `includeNonBillable` are optional flags and should be applied only when relevant to the selected report family.
   * 4. Validate every referenced filter target before persistence:
   *    - Each employee filter must reference an employee in the active organization.
   *    - Each project filter must reference a project in the active organization.
   *    - Each task filter must reference a task whose project belongs to the active organization.
   *    - Remove duplicates or reject duplicated selections before insert so composite unique constraints are not violated.
   * 5. Insert the parent `hrm_time_tracking_reports` row with generated UUID, active organization ID, provided configuration fields, `created_at`, and `updated_at`. `deleted_at` must remain null.
   * 6. Insert normalized child filter rows for employees, projects, and tasks when the request includes those selections. For project and task filter rows, populate `created_at` and `updated_at`; keep `deleted_at` null on creation. For employee filter rows, insert only the foreign keys required by the schema.
   * 7. Return the created report aggregate, including persisted filter selections if the DTO includes them.
   *
   * Use transaction rollback for any validation or persistence failure so the API never leaves a partially created report definition. Map uniqueness violations on `(hrm_time_tracking_organization_id, name)` to a conflict-style business error. Map missing or out-of-scope referenced employees, projects, or tasks to validation or not-found errors scoped to the current organization only. Do not invoke external integrations for this operation; if future integrations are introduced, a failure must reject the action rather than leaving misleading saved records.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @TypedBody()
    body: IHrmTimeTrackingReport.ICreate,
  ): Promise<IHrmTimeTrackingReport> {
    try {
      return await postHrmTimeTrackingReports({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of saved report definitions available in the user's currently selected organization.
   *
   * This operation exposes the organization-scoped reporting area described in the requirements by returning reusable report definitions for the active organization context only. It is based on the `hrm_time_tracking_reports` table, which stores the stable configuration of a saved report, including its human-readable `name`, `report_type`, optional reporting period defined by `range_start_date` and `range_end_date`, optional `group_by` dimension, and billable filtering toggles such as `billable_only` and `include_non_billable`. The underlying model is explicitly designed for reusable analytical views, and repeating employee, project, and task selections are normalized into the child tables `hrm_time_tracking_report_employee_filters`, `hrm_time_tracking_report_project_filters`, and `hrm_time_tracking_report_task_filters` rather than being stored as arrays.
   *
   * Access to this operation is restricted to users who have report viewing permission in the currently selected organization. The permission decision must be evaluated only within that active organization context, so a role assignment in another organization must not grant visibility here. When access is granted, the result set must still remain limited to the current organization's reports, and the platform must not expose report filters, groupings, or results for any other organization. Owners, managers, and employees may call this operation only when their current organization role includes the corresponding reporting permission.
   *
   * This operation is intended for report browsing, discovery, and selection before a user opens a specific saved report or triggers related report views. It should support finding reports by report family such as Time Report, Project Budget Report, and Weekly Summary Report, as well as narrowing by report name, grouping choice, billable behavior, and date-range presence where supported by the request DTO. The list response should favor summary information suitable for report libraries, dashboards, or selection dialogs rather than embedding every normalized child filter row in the list payload.
   *
   * The operation should return only active saved report definitions that are valid for presentation in the reporting area. Because the report schema includes `deleted_at`, implementations must exclude deleted records from normal browsing results. If the caller lacks report viewing permission, the system must deny access before revealing any report metadata. If a dependent external integration affects downstream report refresh behavior, the system should prefer safe failure and must not present misleading cross-organization or partially successful results.
   *
   * This endpoint is commonly used before a report detail or report execution flow. Clients typically call this operation first to obtain the available saved report definitions for the active organization, then use a separate detail or rendering operation to open one selected report configuration. Report refresh events described elsewhere may later signal that a visible saved report view has become stale, but those events do not change the organization-scoped access rules enforced by this listing operation.
   *
   * @param connection
   * @param body Report search criteria and pagination options
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement an organization-scoped search query over `hrm_time_tracking_reports` filtered by the authenticated user's currently selected organization identifier. Before constructing filters or returning data, validate that the caller has report viewing permission in the active organization context; if not, reject the request immediately without exposing available report names, types, or filter metadata.
   *
   * Build the base query with `hrm_time_tracking_organization_id = currentOrganizationId` and exclude deleted records by requiring `deleted_at IS NULL`. Support request-driven filtering through `IHrmTimeTrackingReport.IRequest`, including pagination, sorting, free-text or exact-name matching on `name`, filtering by `report_type`, optional filtering by `group_by`, and date-scope filters using `range_start_date` and `range_end_date` where the DTO defines them. Restrict report_type filtering to the supported business report families: time report, project budget report, and weekly summary report. Sorting should default to a stable business-friendly order such as `updated_at DESC`, with secondary ordering by `id` to keep pagination deterministic.
   *
   * For list responses, return summary-oriented data derived from `hrm_time_tracking_reports`. Do not expand all normalized child filter records in the page result unless the summary DTO explicitly requires derived counts or indicators. If the summary type includes filter presence metadata, compute it efficiently using existence checks or aggregate counts against `hrm_time_tracking_report_employee_filters`, `hrm_time_tracking_report_project_filters`, and `hrm_time_tracking_report_task_filters`, excluding deleted child rows where applicable for project and task filter tables.
   *
   * Use a single read transaction or equivalent consistent read strategy so pagination metadata and page data reflect the same organization-scoped snapshot. Ensure all joins and subqueries preserve organization isolation through the parent report relation instead of trusting child identifiers alone. Never allow request criteria to inject another organization's identifiers into the result set.
   *
   * On authorization failure, return a forbidden-style error. On malformed filter input, return a validation error. If external integration or downstream report-refresh infrastructure is unavailable, do not fabricate refreshed analytical state in this listing operation; continue serving already stored report definitions when possible, but fail safely if the requested action depends on unavailable external behavior. The implementation must preserve existing data and avoid any side effects because this is a read-only search endpoint.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody()
    body: IHrmTimeTrackingReport.IRequest,
  ): Promise<IPageIHrmTimeTrackingReport.ISummary> {
    try {
      return await patchHrmTimeTrackingReports({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single saved report definition from the currently selected organization.
   *
   * This operation provides access to one organization-scoped report resource identified by its report ID. In the hrm time tracking platform, a report is a reusable analytical view that belongs to one organization and turns organization activity into managerial insight. The returned resource represents a saved report definition rather than a raw export artifact, and it is intended to support the reporting area where users open and work with the Time Report, Project Budget Report, and Weekly Summary Report. Because report access is organization-bound, the operation must resolve the requested report only within the caller's current organization context.
   *
   * Access to this endpoint is restricted by report viewing permission in the currently selected organization. The system must evaluate permissions using only the caller's role assignments in that active organization context and must deny access when the caller lacks report viewing permission there, even if the same person has report access in another organization. When access is denied, no report data from the requested organization may be displayed or leaked through the response. This aligns the endpoint with the reporting authorization model and with organization-scoped access evaluation.
   *
   * The operation is backed by the saved report entity, which belongs to one organization and may be associated with normalized filter selections for employees, projects, and tasks. The business meaning of the report depends on its type. A Time Report summarizes hours logged during a selected period, a Project Budget Report compares actual hours against planned effort, and a Weekly Summary Report presents week-by-week activity patterns over a selected range. Although those report types are distinct in measures and presentation focus, they share the same access rules and organization scope. The endpoint should therefore return the persisted report definition and its configured analytical scope, not data from another organization and not an unrelated dashboard aggregate.
   *
   * If the report ID does not exist, or if it exists outside the current organization, the request must fail as an inaccessible or missing resource rather than attempting fallback behavior. The system should also validate authorization before exposing filters, groupings, or results derived from the report definition. Related operations commonly used with this endpoint include the list operation that lets an authorized user browse available reports in the current organization before selecting one specific report to open in detail.
   *
   * @param connection
   * @param reportId Target report's ID in the current organization scope
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement a report detail retrieval service for the primary report entity scoped to the caller's currently selected organization.
   *
   * 1. Resolve the authenticated actor and current organization context.
   * 2. Evaluate whether the caller has report viewing permission in that organization context before loading report-specific details. Permission evaluation must use only the role and permissions effective in the current organization.
   * 3. Query the report record by reportId and organization ownership together in a single access-scoped lookup. Do not load a report by ID alone and then separately trust it; the organization filter must be part of the resource resolution.
   * 4. If no matching report exists in the current organization context, return a not-found style failure without exposing whether the identifier exists in another organization.
   * 5. Hydrate the detailed report response from the saved report definition. Include its core report metadata and any persisted configuration necessary to reopen the saved analytical view. Where the report model is normalized through employee, project, or task filter tables, load only the filter records attached to the resolved report.
   * 6. Validate that the resolved report type is one of the supported organization report categories: Time Report, Project Budget Report, or Weekly Summary Report. If corrupted or unsupported data is encountered, reject the request as invalid server state rather than returning misleading content.
   * 7. Do not create or mutate report snapshots, activity logs, or dashboard aggregates as part of this read operation. This endpoint is read-only.
   * 8. If any downstream integration is consulted while enriching the report detail, treat failure as a failure of this request and do not present the operation as successful with misleading partial business state.
   *
   * Error handling:
   * - Forbidden when the caller lacks report viewing permission in the current organization.
   * - Not found when the report does not belong to the current organization or the identifier is unknown in that scope.
   * - Reject unsupported report categories or invalid persisted configuration.
   * - Preserve strict organization isolation in all failure paths.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":reportId")
  public async at(
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingReport> {
    try {
      return await getHrmTimeTrackingReportsReportId({
        reportId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing saved report definition for the currently selected organization.
   *
   * This operation modifies a reusable report configuration stored in the report definition record. The underlying report entity is described in the database schema as a saved organization-scoped report definition for reusable analytical views. It stores the stable configuration of a report, including the human-readable name, the report family, the optional inclusive reporting period defined by range_start_date and range_end_date, the optional grouping dimension in group_by, and single-value billable toggles such as billable_only and include_non_billable. The operation is intended to maintain those reusable analytical settings so authorized users can preserve and refine how organization reporting is later generated.
   *
   * Access to this operation is organization-scoped and permission-gated. The requirements state that users may access organization reports only when they have report viewing permission in the currently selected organization, and that report access validation must occur before report filters, groupings, or results are shown. For that reason, the update must first verify the caller's report-viewing entitlement in the active organization context, then confirm that the requested report record belongs to that same organization. A report or permission from another organization must never influence this update path.
   *
   * This operation updates the parent report definition only. According to the report schema comments, the model intentionally stores only atomic configuration fields in the parent table, while repeating filter selections such as multiple employees, projects, or tasks are normalized into child tables so the definition remains reusable over time. Implementations therefore must treat this endpoint as the authoritative update path for the parent configuration fields of the saved report, while coordinating any separately modeled child-filter updates according to the wider DTO contract and service logic.
   *
   * The report_type must remain aligned with the supported report families defined in the requirements: Time Report, Project Budget Report, and Weekly Summary Report. The group_by value, when supplied, must remain meaningful for the selected report family, such as employee, project, or task for Time Report and week for weekly summaries where supported by the product design. Date boundaries should be interpreted as the inclusive start and inclusive end of the saved reporting period. Invalid organization scope, unsupported report families, or a caller without report permission must cause the update to be rejected rather than partially applied.
   *
   * This operation is commonly used together with report browsing or detail retrieval operations. A client would typically load an existing saved report definition first, present its current configuration to the user, and then submit the revised definition through this endpoint. After a successful update, downstream report generation or snapshot retrieval features may use the updated configuration to produce current organization-level analytical output.
   *
   * @param connection
   * @param reportId Identifier of the saved report definition in the current organization
   * @param body Replacement data for the saved report definition
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement a service method that updates one hrm_time_tracking_reports row identified by reportId within the caller's currently selected organization.
   *
   * 1. Resolve the caller's active organization context and verify that the caller has report viewing permission in that organization before loading any report configuration fields.
   * 2. Query hrm_time_tracking_reports by id = :reportId and deleted_at IS NULL, and additionally constrain hrm_time_tracking_organization_id to the current organization. If no matching row exists in the active organization, return a not-found or forbidden result according to platform conventions without disclosing data from other organizations.
   * 3. Validate the request body against the IHrmTimeTrackingReport.IUpdate contract. Permit updates only to fields represented by the saved report definition: name, report_type, range_start_date, range_end_date, group_by, billable_only, and include_non_billable, plus any explicitly modeled child filter collections if the DTO includes them.
   * 4. Enforce domain validation:
   *    - report_type must be one of the supported report families: time_report, project_budget_report, or weekly_summary_report, matching persistence conventions.
   *    - If both range_start_date and range_end_date are provided, ensure the start is not later than the end.
   *    - Validate group_by against the selected report type's supported grouping dimensions.
   *    - Preserve organization uniqueness of name using the existing unique constraint on (hrm_time_tracking_organization_id, name); convert database uniqueness violations into a business-level conflict response.
   * 5. Update updated_at to the current timestamp in the same transaction as the report changes.
   * 6. If the DTO also carries normalized child filter collections, replace those child records transactionally in their respective tables so the parent report definition and normalized filter selections remain consistent.
   * 7. Return the updated report definition as IHrmTimeTrackingReport.
   *
   * Error handling must favor safe failure. Reject the operation when authorization fails, the report is outside the selected organization, validation rules are violated, or persistence fails. Do not partially apply parent or child updates. If any external dependency is involved in ancillary processing, treat integration failure as a failed update and preserve the pre-existing report definition unchanged.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":reportId")
  public async update(
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingReport.IUpdate,
  ): Promise<IHrmTimeTrackingReport> {
    try {
      return await putHrmTimeTrackingReportsReportId({
        reportId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently remove a saved report definition from the current organization context by marking it deleted and making it unavailable for normal reporting lists and selection flows.
   *
   * This operation targets a single saved report definition stored in the hrm_time_tracking_reports table, which is described as the stable, reusable configuration for an organization-scoped analytical view. The underlying record contains the human-readable report name, the report family such as time_report, project_budget_report, or weekly_summary_report, optional inclusive reporting period boundaries in range_start_date and range_end_date, an optional grouping dimension in group_by, optional billable filtering flags, and lifecycle timestamps including created_at, updated_at, and deleted_at. Because report definitions belong to one organization through hrm_time_tracking_organization_id, the operation must act only within the caller's currently selected organization and must never expose or affect a report from another organization.
   *
   * From a security and tenancy perspective, this endpoint is organization-scoped. Report access requirements state that users open the reporting area for the organization they are currently working in and that only report data for that current organization may be shown. The same isolation principle applies to deletion of saved report definitions: the caller must have report-management authority in the active organization, and a report identifier that exists in another organization must be treated as inaccessible. Organization owners may perform this operation, and managers may perform it only when their assigned permissions include report administration capability in the selected organization. Ordinary employees should not be allowed to remove shared saved report definitions unless separately granted such authority by the permission system.
   *
   * The operation is intentionally about the saved report definition, not about deleting historical source records such as employees, projects, tasks, timelogs, timesheets, or generated snapshots outside the configured deletion policy. The reports model is documented as the parent definition for generated historical outputs in hrm_time_tracking_report_snapshots, so implementation must ensure downstream handling remains consistent with relational rules and product expectations. If dependent snapshot records are configured to cascade at the data layer, they may be removed automatically; otherwise, they must be handled explicitly before finalizing the deletion update. In either case, clients should understand that removing the saved definition makes that analytical view unavailable for future reuse in the current organization.
   *
   * Validation must confirm that the target report exists, belongs to the active organization, and has not already been deleted. If the report cannot be found in the current organization scope, the system should return a not-found style failure rather than leaking whether the identifier exists elsewhere. If the caller lacks sufficient permission, the system must reject the request without changing the record. The response returns the deleted report definition so user interfaces can remove the item from saved-report lists, display a clear confirmation message, and reconcile local caches using the exact resource that was affected.
   *
   * This endpoint is commonly used after list or detail retrieval operations for saved reports. A client would typically pre-execute the organization's report list operation to present available saved definitions, then call this endpoint for a user-selected item, and finally refresh the list so the deleted definition no longer appears in the reporting area for that organization.
   *
   * @param connection
   * @param reportId Target saved report definition identifier in the current organization scope
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement a report-definition deletion service for the hrm_time_tracking_reports model scoped to the authenticated user's currently selected organization.
   *
   * 1. Resolve the authenticated actor and active organization context from the session layer. Do not accept organization identity from the request body or query string.
   * 2. Authorize the actor for report-management capability in the active organization. Allow organization owners by default. Allow managers only when their organization-scoped permission set includes report administration or equivalent report management authority. Reject unauthorized callers before performing lookup side effects that could reveal cross-organization existence.
   * 3. Query hrm_time_tracking_reports by id = :reportId and hrm_time_tracking_organization_id = :activeOrganizationId. Exclude rows where deleted_at is already non-null from the normal match condition so repeated deletes behave as not found or conflict according to platform convention.
   * 4. If no active row is found, return a not-found error scoped to the current organization context.
   * 5. Perform logical deletion by setting deleted_at to the current timestamp and updating updated_at to the same current timestamp in a single write. Do not physically remove the row unless a lower-level persistence policy requires it; the schema explicitly contains deleted_at and relevant indexes include deleted_at, so lifecycle-aware removal is the expected implementation pattern.
   * 6. If generated child data such as hrm_time_tracking_report_snapshots must also be hidden or removed, handle that within the same transaction or rely on configured referential behavior. Ensure no orphaned snapshot visibility remains for a deleted saved definition.
   * 7. Return the deleted report representation using the post-update values, including id, hrm_time_tracking_organization_id, name, report_type, range_start_date, range_end_date, group_by, billable_only, include_non_billable, created_at, updated_at, and deleted_at.
   * 8. Publish any internal domain event needed for live saved-report list refresh in the current organization context. Event payload should identify the organization and deleted report id without leaking cross-organization data.
   * 9. Error handling: return forbidden for missing permission, not found for absent or cross-organization targets, and conflict only if platform conventions distinguish already-deleted resources from unknown resources. On transaction failure, roll back all writes. Under degraded dependency conditions, prefer temporary failure over uncertain deletion outcomes, preserving organization isolation and report history integrity guarantees.
   * 10. Testing should verify: owner success within organization; authorized manager success; unauthorized employee rejection; cross-organization id rejection; already-deleted row behavior; deleted rows no longer appearing in normal saved-report browsing queries; returned payload contains deleted_at populated.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":reportId")
  public async erase(
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmTimeTrackingReportsReportId({
        reportId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
