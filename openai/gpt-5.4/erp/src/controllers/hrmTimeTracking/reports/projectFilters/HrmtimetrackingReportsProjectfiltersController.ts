import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingReport } from "../../../../api/structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportProjectFilter } from "../../../../api/structures/IHrmTimeTrackingReportProjectFilter";
import { IPageIHrmTimeTrackingReportProjectFilter } from "../../../../api/structures/IPageIHrmTimeTrackingReportProjectFilter";
import { deleteHrmTimeTrackingReportsReportIdProjectFiltersProjectFilterId } from "../../../../providers/deleteHrmTimeTrackingReportsReportIdProjectFiltersProjectFilterId";
import { getHrmTimeTrackingReportsReportIdProjectFiltersProjectFilterId } from "../../../../providers/getHrmTimeTrackingReportsReportIdProjectFiltersProjectFilterId";
import { patchHrmTimeTrackingReportsReportIdProjectFilters } from "../../../../providers/patchHrmTimeTrackingReportsReportIdProjectFilters";
import { postHrmTimeTrackingReportsReportIdProjectFilters } from "../../../../providers/postHrmTimeTrackingReportsReportIdProjectFilters";
import { putHrmTimeTrackingReportsReportIdProjectFiltersProjectFilterId } from "../../../../providers/putHrmTimeTrackingReportsReportIdProjectFiltersProjectFilterId";

@Controller("/hrmTimeTracking/reports/:reportId/projectFilters")
export class HrmtimetrackingReportsProjectfiltersController {
  /**
   * Add project-based filter selections to an existing saved report definition.
   *
   * This operation creates normalized project filter rows under a saved report in the organization reporting area. The parent report is stored in the `hrm_time_tracking_reports` table, which represents a reusable organization-scoped analytical view with a human-readable name, a `report_type` such as time report, project budget report, or weekly summary report, an optional reporting date range, an optional grouping dimension, and optional billable filtering flags. The project filter selections themselves are stored separately in `hrm_time_tracking_report_project_filters` so that multi-project filtering is preserved as normalized analytical configuration rather than as embedded array data. By writing child rows instead of overwriting serialized values, the system keeps saved report configuration reproducible and structurally consistent over time.
   *
   * Access to this operation is governed by the same current-organization report access rules that apply to opening the reporting area. The caller must have report viewing permission in the currently selected organization, and the system must validate that permission before allowing filter manipulation. The target report identified by `reportId` must belong to the caller's active organization context, and every referenced project must also resolve within that same organization scope. A report, project, or permission from another organization must not influence this operation. If the report is not visible in the current organization, or if any selected project falls outside the report's organization boundary, the request must be rejected without exposing cross-organization data.
   *
   * This operation is intended to support report configuration workflows that begin with selecting or opening an existing saved report and then refining its filter scope. It is especially relevant to report types whose analytical meaning depends on narrowing included work to specific initiatives. The requirements define reports as managerial insight functions built from employees, projects, tasks, timelogs, and timesheets within one organization, and define reporting scope through the reporting period, grouping option, and filter scope. This endpoint contributes the project portion of that filter scope by attaching one or more selected projects to the saved report definition.
   *
   * Validation must enforce the database realities of the child table. Each created row links exactly one saved report to one selected project using `hrm_time_tracking_report_id` and `hrm_time_tracking_project_id`. Because the table has a uniqueness constraint on that pair, the same project cannot be attached twice to the same report. The operation should therefore fail clearly when the request attempts to add a duplicate project filter selection that already exists for the report. The system should also reject references to nonexistent reports or projects, and it should not partially succeed in a way that leaves the saved report with an ambiguous configuration.
   *
   * After successful creation, clients will typically continue with report viewing operations that read the saved configuration and generate analytical results based on it. For that reason, this endpoint returns the updated saved report definition rather than only the newly inserted subsidiary rows. API consumers can use the returned report state to refresh report settings screens, continue editing related employee or task filters, or trigger subsequent report execution using the newly expanded project filter scope.
   *
   * @param connection
   * @param reportId Target saved report's ID
   * @param body Project filter creation payload
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement this operation as a nested child-creation use case for the subsidiary table `hrm_time_tracking_report_project_filters` under the parent table `hrm_time_tracking_reports`.
   *
   * 1. Authorize the caller in the currently selected organization context before any report lookup. Require report viewing permission as defined by the reporting access requirements. Evaluate permission only against the caller's active organization role assignments. Reject the request immediately if the caller lacks report viewing permission in the current organization.
   *
   * 2. Load the target report by `reportId` from `hrm_time_tracking_reports`, excluding rows whose `deleted_at` is not null unless the service convention explicitly allows administrative access to deleted records. If no active report is found, return a not-found error. Verify that `hrm_time_tracking_organization_id` matches the caller's current organization context. Reject cross-organization access.
   *
   * 3. Parse the request body as `IHrmTimeTrackingReportProjectFilter.ICreate`. Expect the payload to provide one or more target project identifiers to attach to the saved report. Validate that the submitted collection is not empty and does not contain duplicated project identifiers within the same request.
   *
   * 4. Resolve all referenced projects and verify they belong to the same organization as the parent report. Because the project filter table points directly to projects while inheriting organization scope from the parent report, the service must ensure that each selected project is valid for the report's organization. If any project does not exist or belongs to another organization, reject the request.
   *
   * 5. Before insertion, query existing `hrm_time_tracking_report_project_filters` rows for the same `reportId` and the requested project identifiers, excluding rows whose `deleted_at` is not null only if the business rule treats soft-deleted children as absent. If any active duplicate exists, reject the request with a conflict-style validation error describing that the project is already included in the saved report filter set.
   *
   * 6. Insert the new child rows in a single transaction. For each project identifier, create one `hrm_time_tracking_report_project_filters` row with a generated UUID `id`, the resolved `hrm_time_tracking_report_id`, the resolved `hrm_time_tracking_project_id`, and current timestamps for `created_at` and `updated_at`. If the persistence layer supports bulk insert with transactional guarantees, use it.
   *
   * 7. Re-read the saved report after insertion and return the parent report representation as `IHrmTimeTrackingReport`. The returned DTO should reflect the persisted state after mutation so downstream clients can immediately refresh saved report settings and dependent reporting UI.
   *
   * 8. Error handling: return not found when the parent report does not exist in the current organization, forbidden when the caller lacks current-organization report permission, and conflict or validation failure when duplicate project filter links are requested. On any failure during insertion, roll back the entire transaction so the saved report configuration remains internally consistent.
   *
   * 9. Audit and safety behavior: if the platform records operational history for report configuration changes, emit the appropriate internal activity after successful commit only. Under degraded conditions, prefer temporary failure over uncertain partial linkage so organization isolation and report integrity are preserved.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingReportProjectFilter.ICreate,
  ): Promise<IHrmTimeTrackingReport> {
    try {
      return await postHrmTimeTrackingReportsReportIdProjectFilters({
        reportId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of project filter selections attached to a saved report definition.
   *
   * This operation exposes the normalized child records stored for a report in the reporting area of the currently selected organization. The parent report is the organization-scoped analytical definition represented by `hrm_time_tracking_reports`, which stores the stable configuration of a reusable report such as its human-readable name, report family, optional reporting period, grouping dimension, and billable-related toggles. The returned collection comes from `hrm_time_tracking_report_project_filters`, the subsidiary table that links one saved report definition to one selected project so that multi-project filtering remains normalized and reproducible over time rather than being stored as arrays or serialized values.
   *
   * Access to this operation is governed by report viewing permission. The system must validate access before exposing report filters or results, and it must evaluate that permission only within the user's current organization context. A caller who can view reports in one organization must not gain visibility into report definitions or filter selections that belong to another organization. Owners may access the operation by virtue of their full organization authority, while managers and employees may access it only when their current organization role grants report viewing permission.
   *
   * The operation is intended for report browsing and configuration inspection workflows. A client typically obtains the parent saved report first, then calls this endpoint to inspect which projects are currently selected as filter inputs for that report. This is especially relevant for organization-level reporting functions such as the Time Report, Project Budget Report, and Weekly Summary Report, where users need to understand how the visible report scope has been narrowed. The result should be suitable for administrative screens, reporting side panels, and refreshable UI views that show reusable analytical filter configuration.
   *
   * Business behavior must remain aligned with organization-scoped reporting guarantees. The list must contain only project-filter rows that belong to the specified report, and that report must itself belong to the current organization. The operation must not expose unrelated project records, filters from another report, or filters from a report in another organization. When the parent report does not exist, does not belong to the current organization, or the caller lacks report viewing permission, the request must be rejected. If dependent subsystems used for report-related refresh or enrichment are unavailable, the platform should favor temporary unavailability over returning misleading cross-organizational or partial business results.
   *
   * This endpoint works naturally with the parent report retrieval and report-list operations. Clients usually identify an organization-scoped saved report from the reporting area first, then load its attached project filters through this nested collection endpoint. If report refresh events indicate that a visible report view has become stale, the client may re-execute this operation to synchronize the displayed project filter selections with the current saved configuration.
   *
   * @param connection
   * @param reportId Target saved report definition ID
   * @param body Search, pagination, and sorting options for report project filters
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement this operation as a collection query over `hrm_time_tracking_report_project_filters` constrained by a validated parent report in `hrm_time_tracking_reports`.
   *
   * 1. Authenticate the caller and resolve the current organization context from the active workspace selection.
   * 2. Authorize the request by checking report viewing permission for the caller in that current organization context before exposing any filter metadata.
   * 3. Load the parent report by `reportId` and verify that `hrm_time_tracking_reports.id` matches the path parameter, `hrm_time_tracking_reports.hrm_time_tracking_organization_id` matches the current organization, and the record is not logically removed for active browsing purposes.
   * 4. If the parent report is missing or outside the current organization, reject the request as not found or forbidden according to service conventions without leaking whether a foreign-organization report exists.
   * 5. Query `hrm_time_tracking_report_project_filters` where `hrm_time_tracking_report_id = reportId`. Exclude logically removed child rows by default using `deleted_at IS NULL` unless the shared IRequest convention explicitly supports including removed records.
   * 6. Apply pagination, sorting, and any supported search filters from `IHrmTimeTrackingReportProjectFilter.IRequest`. Sorting should default to a stable order such as `created_at DESC, id DESC` when the client does not specify one.
   * 7. Join the related project only as needed to populate summary fields defined by `IHrmTimeTrackingReportProjectFilter.ISummary`; do not expose project data outside the response contract.
   * 8. Return `IPageIHrmTimeTrackingReportProjectFilter.ISummary` with pagination metadata and the filtered data array.
   *
   * Validation and edge handling:
   * - Treat `reportId` as a UUID and reject malformed identifiers before querying.
   * - Never allow the request body to override the parent context; the parent report is determined only by the path parameter.
   * - Do not include project-filter rows from any other report, even if they reference the same project.
   * - Maintain organization isolation throughout logging, caching, and error handling.
   * - If a downstream integration or refresh dependency needed by the service layer fails, return a failure response rather than presenting uncertain or partially successful results.
   *
   * Performance considerations:
   * - Use the parent report lookup first to fail fast on authorization and organization-scope violations.
   * - Use indexed access on the child table by `hrm_time_tracking_report_id`, and apply pagination at the database layer.
   * - Keep the query read-only and transaction-light because this is a browse operation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingReportProjectFilter.IRequest,
  ): Promise<IPageIHrmTimeTrackingReportProjectFilter.ISummary> {
    try {
      return await patchHrmTimeTrackingReportsReportIdProjectFilters({
        reportId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve one saved project filter selection from a specific saved report definition.
   *
   * This operation returns the details of a single normalized project filter row that belongs to a saved report in the current organization context. The underlying report model stores reusable analytical configuration such as the report family, optional reporting period, grouping mode, and billable toggles, while the project-filter model stores one selected project as a separate child record rather than embedding multiple project identifiers in the parent report. This design reflects the database structure in which saved report definitions remain atomic and reusable, and repeating project selections are normalized into child rows for consistent analytical configuration over time.
   *
   * Access to this operation is governed by the same report-viewing authorization used for the organization reporting area. A caller must have report viewing permission in the currently selected organization. Report access validation must occur before exposing report filters, and the system must return data only for the current organization context. Even if the caller has report-related permission in another organization, that authority must not grant access here. If the specified report does not belong to the current organization, or if the specified project filter does not belong to the specified report, the operation must not disclose the resource.
   *
   * The response represents one row from the saved report project filter relation, whose business purpose is to preserve a selected project attached to a reusable report definition. The child record links a saved report definition to one selected project and includes creation and update timestamps for the filter selection lifecycle. Because the parent saved report supports report types such as Time Report, Project Budget Report, and Weekly Summary Report, this endpoint can be used by reporting interfaces that need to inspect or display the exact project-scoping configuration of one saved report before showing or editing the broader report setup.
   *
   * This endpoint is typically used together with a report detail or report list operation. A client would first obtain the saved report identifier from a report listing or report detail response, then use this endpoint to retrieve a particular project filter row when rendering detailed configuration screens, audit views, or fine-grained filter management interactions. The operation does not generate report output, compute report aggregates, or evaluate project budget measures by itself; it only exposes one persisted project filter selection that participates in the saved report definition.
   *
   * Expected failures include lack of report viewing permission in the current organization, a parent report that is absent or outside the selected organization, or a project filter identifier that does not belong to the specified report. In each of these cases, the system should reject the request without exposing data from another organization or another saved report.
   *
   * @param connection
   * @param reportId Target saved report identifier in the current organization
   * @param projectFilterId Target project filter identifier belonging to the saved report
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement a read-only service method that retrieves one hrm_time_tracking_report_project_filters row in the context of its parent hrm_time_tracking_reports row.
   *
   * First, resolve the authenticated user and current organization context. Validate that the caller has report viewing permission in the selected organization before loading any report filters, consistent with report access rules. Reject the request if report viewing permission is missing.
   *
   * Query the parent hrm_time_tracking_reports record by id = reportId and hrm_time_tracking_organization_id = currentOrganizationId. Exclude logically removed parents by rejecting records whose deleted_at is not null. If no parent report is found, return a not-found style failure.
   *
   * Then query hrm_time_tracking_report_project_filters by id = projectFilterId and hrm_time_tracking_report_id = reportId. Exclude logically removed child rows by rejecting records whose deleted_at is not null. If no matching child row exists, return a not-found style failure. This ownership check is mandatory so a filter row from one report cannot be fetched through another report's path.
   *
   * Return the detail DTO mapped from the child record. Include the primary identifier, parent report identifier, selected project identifier, and timestamp fields that are part of the exposed schema. If related project summary data is part of the generated DTO definition, it may be joined or loaded separately, but the implementation must not assume fields that are not defined in the actual schema.
   *
   * Do not modify report definitions, filter selections, report snapshots, or analytical results. No transaction is required beyond the consistent read unless the implementation framework requires one for authorization and row loading. Log authorization failures and not-found outcomes according to the platform's standard audit and error policies without leaking cross-organization identifiers.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":projectFilterId")
  public async at(
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedParam("projectFilterId")
    projectFilterId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingReportProjectFilter> {
    try {
      return await getHrmTimeTrackingReportsReportIdProjectFiltersProjectFilterId(
        {
          reportId,
          projectFilterId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a selected project filter within a saved report definition.
   *
   * This operation updates one normalized project filter row that belongs to a saved report in the current organization context. The underlying resource is the `hrm_time_tracking_report_project_filters` table, which exists to link one saved report definition to one selected project so that multi-project filtering can be persisted without serialized arrays. Through this endpoint, a client can replace the project associated with an existing filter record while keeping the filter as part of the same saved report definition.
   *
   * Access to this operation is organization-scoped and must be evaluated against the user's currently selected organization. The saved report belongs to one organization through `hrm_time_tracking_reports.hrm_time_tracking_organization_id`, and the filter row belongs to that report through `hrm_time_tracking_report_project_filters.hrm_time_tracking_report_id`. In accordance with the report access requirements, the system must validate report viewing permission before exposing or mutating report filters. A caller must not be allowed to update a filter for a report outside the active organization context, and access must be denied when the current organization role does not grant report access.
   *
   * The saved report definition stores stable analytical configuration such as `name`, `report_type`, optional `range_start_date` and `range_end_date`, optional `group_by`, and billable toggles such as `billable_only` and `include_non_billable`. Project filters complement those atomic fields by persisting normalized project selections in child rows. Updating a project filter therefore changes the scope of which project data may be considered when the associated report is reproduced, while preserving the saved report definition as the parent analytical view.
   *
   * Clients typically use this operation together with report detail retrieval or report filter listing for the same report so that they can identify the existing `projectFilterId` to update. After a successful update, subsequent report execution or report viewing operations for the same saved report should reflect the revised project selection. If the specified report does not exist in the current organization, if the project filter is not a child of that report, or if the replacement project is invalid for the same organization context, the request must fail without changing unrelated report configuration.
   *
   * @param connection
   * @param reportId Target saved report identifier in the current organization
   * @param projectFilterId Target project filter identifier within the saved report
   * @param body Replacement values for the selected project filter
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Validate that the authenticated actor is operating inside a selected organization context and has report viewing permission for that current organization before processing the update.
   *
   * Load the parent record from `hrm_time_tracking_reports` by `reportId` and ensure it exists, is not deleted, and belongs to the caller's current organization via `hrm_time_tracking_organization_id`. Then load the target child record from `hrm_time_tracking_report_project_filters` by `projectFilterId` and ensure it exists, is not deleted, and has `hrm_time_tracking_report_id` equal to the parent report's `id`. Reject the request if the parent-child relationship does not match.
   *
   * Parse `IHrmTimeTrackingReportProjectFilter.IUpdate` and allow updates only to mutable fields that are actually represented by the child filter resource, primarily the referenced `hrm_time_tracking_project_id`. If a replacement project identifier is supplied, verify that the target project exists, is valid for use, and belongs to the same organization as the parent report. Enforce uniqueness of the pair `(hrm_time_tracking_report_id, hrm_time_tracking_project_id)` so the updated filter does not duplicate another active project filter row for the same report.
   *
   * Execute the update in a transaction. Persist the changed project reference and refresh `updated_at`. Do not alter unrelated parent report configuration fields such as `report_type`, date range, grouping, or billable flags. Return the updated filter resource after persistence.
   *
   * Handle errors deterministically: return not found when the report or filter does not exist in the current organization scope, forbidden when the actor lacks report access in the current organization, and conflict when the requested replacement would violate the unique report-project filter constraint. If any dependent validation or persistence step fails, abort the update so no partial change is stored.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":projectFilterId")
  public async update(
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedParam("projectFilterId")
    projectFilterId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingReportProjectFilter.IUpdate,
  ): Promise<IHrmTimeTrackingReportProjectFilter> {
    try {
      return await putHrmTimeTrackingReportsReportIdProjectFiltersProjectFilterId(
        {
          reportId,
          projectFilterId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Remove one project filter selection from a saved report definition.
   *
   * This operation deletes a single normalized project filter row from the saved report configuration stored in the report subsystem. The parent report is represented by the organization-scoped `hrm_time_tracking_reports` table, which stores the stable analytical definition including the report name, report type, optional reporting date range, grouping mode, and billable filtering flags. The child filter being removed is represented by `hrm_time_tracking_report_project_filters`, a normalized selection table that links one saved report to one selected project rather than storing multiple project identifiers in a serialized field. Removing this row updates the reusable report definition so that future executions of the saved report no longer constrain results by the deleted project selection.
   *
   * Access to this operation must respect the current organization context used by the reporting area. Reports are available only for the organization the user is currently working in, and report results are limited to employees, projects, tasks, timelogs, and timesheets belonging to that organization. For that reason, the server must verify that the specified report belongs to the caller's active organization and that the caller has report access in that organization. This operation is intended for organization-level reporting administration by authorized actors such as owners and permitted managers, and it must reject attempts to remove filter rows across organization boundaries.
   *
   * The database structure requires the project filter selection to belong to the specified report through `hrm_time_tracking_report_id`, and the row also references a selected project through `hrm_time_tracking_project_id`. The operation must therefore validate both identifiers in the route hierarchy: the `reportId` identifies the saved report definition, and the `projectFilterId` identifies the exact filter row to remove. Even if a filter row with the supplied identifier exists, the deletion must be rejected when it is not attached to the specified report. This preserves the normalized relationship design of the reporting schema and prevents accidental removal of unrelated filter selections.
   *
   * This endpoint is typically used together with report detail or report update workflows that first load the saved report definition and its current filter selections. Clients should retrieve the report configuration before deleting a child filter so they can display the current list of selected projects and update the user interface immediately after removal. After successful deletion, downstream report execution and any report editing screens should treat the removed project as no longer selected for that saved report definition.
   *
   * Expected failures include the report not being found in the current organization, the project filter row not being found, the filter row not belonging to the specified report, or the caller lacking permission to access report functions in the active organization context. On success, the filter selection is permanently removed from the saved report configuration record set, and subsequent report generation should reflect the updated filter scope.
   *
   * @param connection
   * @param reportId Target saved report definition ID in the current organization.
   * @param projectFilterId Target project filter selection ID that belongs to the specified report.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement the operation as a parent-child deletion on the reporting configuration aggregate.
   *
   * 1. Authenticate the caller and resolve the current organization context from the active session.
   * 2. Authorize the caller for report access and report-management capability within the current organization. Owners are always eligible; managers must possess the relevant reporting permission. Reject unauthorized callers before revealing resource existence details.
   * 3. Query `hrm_time_tracking_reports` by `id = :reportId`, `hrm_time_tracking_organization_id = :currentOrganizationId`, and active record semantics appropriate to the project conventions so that deleted report definitions are not modifiable.
   * 4. If the parent report is not found in the active organization, return a not-found or access-denied style error according to service conventions.
   * 5. Query `hrm_time_tracking_report_project_filters` by `id = :projectFilterId` and `hrm_time_tracking_report_id = :reportId`. This check is mandatory because the nested route requires the child row to belong to the addressed parent report.
   * 6. If the child filter row is not found, return a not-found error. Do not delete by `projectFilterId` alone.
   * 7. Delete the matched child row. If the service uses hard deletion for child filter removal, issue a physical delete. If the reporting aggregate follows logical deletion semantics for removable filter selections, mark `deleted_at` and update `updated_at` consistently with repository conventions. The implementation must follow the persistence strategy used for this schema set.
   * 8. Commit the change in a single transaction. No cascading parent update is required beyond any standard timestamp maintenance applied by the repository layer.
   * 9. Emit any report-definition change event required by the platform so report editing screens can refresh their selected project list.
   *
   * Validation and edge cases:
   * - Reject cross-organization access even when `reportId` exists in another organization.
   * - Reject deletion when `projectFilterId` exists but belongs to a different report.
   * - Treat repeated deletion attempts idempotently according to service standards; the typical behavior is not-found once the row is absent.
   * - Do not require the client to send `hrm_time_tracking_project_id`; the route already identifies the removable child resource.
   * - Ensure audit logging, if present in the platform, records the actor, organization, report, and removed filter identifier.
   *
   * Data access guidance:
   * - Parent lookup: `hrm_time_tracking_reports`
   * - Child lookup/delete: `hrm_time_tracking_report_project_filters`
   * - Relationship constraint: `hrm_time_tracking_report_project_filters.hrm_time_tracking_report_id = hrm_time_tracking_reports.id`
   * - Optional validation join to the underlying project is unnecessary for deletion unless the service wants to enrich audit logs with the referenced project identifier.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":projectFilterId")
  public async erase(
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedParam("projectFilterId")
    projectFilterId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmTimeTrackingReportsReportIdProjectFiltersProjectFilterId(
        {
          reportId,
          projectFilterId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
