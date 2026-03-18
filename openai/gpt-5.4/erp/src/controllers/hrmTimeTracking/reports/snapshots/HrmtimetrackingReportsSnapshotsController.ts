import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingReportSnapshot } from "../../../../api/structures/IHrmTimeTrackingReportSnapshot";
import { IPageIHrmTimeTrackingReportSnapshot } from "../../../../api/structures/IPageIHrmTimeTrackingReportSnapshot";
import { getHrmTimeTrackingReportsReportIdSnapshotsSnapshotId } from "../../../../providers/getHrmTimeTrackingReportsReportIdSnapshotsSnapshotId";
import { patchHrmTimeTrackingReportsReportIdSnapshots } from "../../../../providers/patchHrmTimeTrackingReportsReportIdSnapshots";
import { postHrmTimeTrackingReportsReportIdSnapshots } from "../../../../providers/postHrmTimeTrackingReportsReportIdSnapshots";

@Controller("/hrmTimeTracking/reports/:reportId/snapshots")
export class HrmtimetrackingReportsSnapshotsController {
  /**
   * Create a new persisted snapshot artifact for a saved organization report definition.
   *
   * This operation generates and records one immutable historical output for the saved report identified by `reportId`. The parent report is the organization-scoped configuration stored in `hrm_time_tracking_reports`, which contains the stable analytical setup such as the report name, report type, optional reporting date range, grouping dimension, and billable filtering flags. The created child record is stored in `hrm_time_tracking_report_snapshots`, an append-oriented historical store designed to preserve reproducible report outputs even after employees, projects, tasks, timelogs, timesheets, or other source business records later change. The snapshot captures artifact metadata including the stored output location, export format, covered reporting period boundaries, generation timestamp, and optional row count.
   *
   * Access to this operation is constrained by the same organization-scoped report access rules that govern the reporting area. The caller must be operating within the currently selected organization and must have report viewing permission in that organization context. Before any snapshot is created, the system must validate that the referenced saved report belongs to the current organization and must deny the request when the caller lacks report access in that organization. A role or permission granted in another organization must have no effect on this operation, and the endpoint must never expose whether a report in a different organization exists.
   *
   * The operation is closely related to the three supported report families described by the domain model: Time Report, Project Budget Report, and Weekly Summary Report. The parent `hrm_time_tracking_reports.report_type` determines which analytical view is being materialized, while the snapshot record stores the generated result artifact rather than duplicating the underlying operational data. This distinction is important because the report definition remains reusable and editable over time, whereas each snapshot represents one generation event with its own `period_start`, `period_end`, `output_format`, `output_uri`, and `generated_at` values.
   *
   * Validation must ensure that the requested snapshot period is coherent and that the created snapshot truthfully represents a completed generation result. If snapshot creation depends on an external rendering, export, or storage integration, the system must reject the operation when that dependency fails instead of creating a misleading snapshot record. Degraded behavior should prefer temporary unavailability over storing uncertain analytical output. The platform must also preserve organization isolation during failures so that report data, artifact references, or error handling from one organization never appear in another organization's context.
   *
   * This endpoint is typically used after a user has already accessed the reporting area and selected or prepared a saved report definition. Consumers may first retrieve or browse saved reports, then invoke this operation to persist a generated output for later retrieval, auditability, and report history. Repeated calls for the same report are valid because the snapshot table explicitly allows multiple historical outputs for one saved report over time.
   *
   * @param connection
   * @param reportId Target saved report identifier
   * @param body Information required to create a persisted report snapshot
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement a service that creates a child snapshot record for an existing saved report definition.
   *
   * 1. Authorize the caller in the current organization context before any report lookup results are exposed. Require report viewing permission for the selected organization, following the organization-scoped report access rules.
   * 2. Load the parent record from `hrm_time_tracking_reports` by `id = reportId` and `deleted_at IS NULL`. Verify that its `hrm_time_tracking_organization_id` matches the caller's currently selected organization. If not found in scope, reject the request as inaccessible.
   * 3. Validate the incoming creation payload against the snapshot schema requirements. Require artifact metadata needed to persist a completed snapshot, including output URI, output format, covered period start and end, generation timestamp, and optional row count. Reject incoherent periods where `period_start` is later than `period_end`. Reject negative row counts if provided.
   * 4. If snapshot generation requires external export or storage integration, invoke the dependency before inserting the record or otherwise ensure the artifact has been produced successfully. On any integration failure, fail the operation and do not insert a snapshot row. Do not report partial success and do not create metadata that implies a snapshot exists when generation or storage did not complete.
   * 5. Insert a new row into `hrm_time_tracking_report_snapshots` with a newly generated UUID `id`, the validated `hrm_time_tracking_report_id`, request-provided output metadata and covered period fields, and server-managed `created_at` and `updated_at` timestamps. Persist `deleted_at` as null for a newly created record.
   * 6. Return the newly created snapshot resource.
   *
   * Database behavior should be append-only from the perspective of report history: never overwrite a previous snapshot while handling this operation. The parent-child relationship uses cascade behavior at the database level, but this endpoint only creates child records and must not modify or remove the parent report definition. Error handling must preserve organization isolation and avoid disclosing cross-organization records or artifact locations.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingReportSnapshot.ICreate,
  ): Promise<IHrmTimeTrackingReportSnapshot> {
    try {
      return await postHrmTimeTrackingReportsReportIdSnapshots({
        reportId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of generated snapshots for a saved report definition.
   *
   * This operation exposes the history of generated outputs that belong to one saved report in the current organization context. The parent report record in `hrm_time_tracking_reports` stores the reusable analytical definition, including its human-readable name, report family, optional date range, grouping mode, and billable filtering options. The child snapshot records in `hrm_time_tracking_report_snapshots` represent point-in-time persisted outputs of that saved definition, including the generated artifact location, export format, covered reporting period boundaries, row count when applicable, and generation timestamp. The operation is intended for users who need to review previously generated report outputs, compare reporting periods, or reopen export history for the same saved report configuration.
   *
   * Access to this operation is organization-scoped and permission-gated. The system must first validate that the caller has report viewing permission in the currently selected organization, because report access validation must occur before showing report filters or results. The system must then confirm that the target report identified by `reportId` belongs to that same organization. If either condition fails, the operation must deny access and must not reveal whether snapshots exist in another organization. This preserves the multi-tenant boundary described in the requirements, where report data, including historical outputs, is visible only within the active organization context.
   *
   * The returned data is based on the append-oriented historical snapshot store. Each snapshot is an immutable generated artifact linked to a single saved report definition, allowing previously produced outputs to remain reproducible even when operational source data later changes. Consumers can use this endpoint to browse snapshot metadata such as `outputUri`, `outputFormat`, `periodStart`, `periodEnd`, `rowCount`, and `generatedAt` without needing to regenerate the report immediately. The list should exclude snapshot records that are no longer in active visibility when their `deleted_at` timestamp is set, unless future product requirements explicitly introduce an administrative recovery view.
   *
   * This operation is commonly used after a client has already identified or opened a saved report through report browsing features. After obtaining the report identifier, the client can query this endpoint to display generation history, sort the history by newest generation time, or narrow the result set to a reporting period of interest. The endpoint returns summary representations optimized for list views rather than full artifact contents. If a downstream API for opening a specific snapshot artifact exists, that API should be invoked after the client selects one snapshot from this list.
   *
   * Expected failure handling must be conservative and organization-safe. If the report does not exist in the active organization, the operation must reject the request without exposing cross-organization data. If the caller lacks report viewing permission, the operation must reject access before evaluating filters in detail. If dependent infrastructure for reading snapshot metadata becomes temporarily unavailable, the system should fail the operation rather than returning misleading or partial business results, consistent with the platform's safe degradation requirements.
   *
   * @param connection
   * @param reportId Target saved report's ID in the current organization
   * @param body Snapshot list filters, sorting, and pagination options
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Validate that the caller is authenticated as an organization actor and resolve the currently selected organization context from the session. Enforce report viewing permission before processing any business query logic. Reject the request if the caller lacks permission in the active organization.
   *
   * Load the parent record from `hrm_time_tracking_reports` by `id = reportId`, `hrm_time_tracking_organization_id = currentOrganizationId`, and `deleted_at IS NULL`. If no such report exists, return a not-found or access-denied result according to the service's standard security policy, without exposing whether a report exists in another organization.
   *
   * Parse `IHrmTimeTrackingReportSnapshot.IRequest` as a list query object. Support pagination inputs, deterministic sorting, and optional filters grounded in snapshot metadata. Recommended sortable fields are `generated_at`, `period_start`, `period_end`, `output_format`, `created_at`, and `updated_at`. Recommended filters are generation date range, covered period range, output format, and row-count bounds if those members exist in the DTO. Do not require the request body to repeat `reportId`; path context already identifies the parent report.
   *
   * Query `hrm_time_tracking_report_snapshots` with `hrm_time_tracking_report_id = reportId` and `deleted_at IS NULL`. Apply validated filters, sorting, and pagination. The default order should prioritize the most recent generation first using `generated_at DESC`, with a stable tie-breaker such as `id DESC` to ensure deterministic pagination.
   *
   * Map each record to `IHrmTimeTrackingReportSnapshot.ISummary`. Include summary fields appropriate for list display, derived from actual schema columns, such as snapshot identifier, output URI, output format, reporting period boundaries, row count, generated timestamp, created timestamp, and updated timestamp. Do not mutate snapshot records during retrieval.
   *
   * Return `IPageIHrmTimeTrackingReportSnapshot.ISummary` containing pagination metadata and the filtered data array. Ensure that all returned rows belong only to the validated parent report and therefore only to the active organization.
   *
   * For error handling, reject malformed pagination or filter values using standard validation errors. If database access fails, surface a service failure without returning partial results. If any external dependency is involved in resolving artifact metadata, fail safely and do not fabricate snapshot availability or generation success.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingReportSnapshot.IRequest,
  ): Promise<IPageIHrmTimeTrackingReportSnapshot.ISummary> {
    try {
      return await patchHrmTimeTrackingReportsReportIdSnapshots({
        reportId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve one generated report snapshot that belongs to a saved report definition.
   *
   * This operation returns the persisted metadata for a single report snapshot stored under a specific saved report. In the data model, `hrm_time_tracking_report_snapshots` is a point-in-time persisted output of generated reports, designed to capture an immutable generated artifact for one saved report definition in `hrm_time_tracking_reports`. The response therefore represents a historical analytical output record rather than a live recalculation of current operational data. It is intended for consumers that need to open, inspect, or reference a previously generated report artifact together with its covered reporting period, output format, row count, and generation timing.
   *
   * Access to this endpoint is organization-scoped and must follow the same report viewing rules as the reporting area. Users may retrieve a snapshot only when they have report viewing permission in the currently selected organization. The parent saved report belongs to one organization through `hrm_time_tracking_reports.hrm_time_tracking_organization_id`, and the system must not expose snapshot data from another organization context. If the caller lacks report viewing permission in the selected organization, or if the specified report does not belong to that organization, the request must be denied and no report data should be disclosed.
   *
   * This endpoint relies on the parent-child relationship between `hrm_time_tracking_reports` and `hrm_time_tracking_report_snapshots`. A snapshot is not a standalone global resource; it is a historical output attached to one saved report definition. For that reason, the caller must provide both the saved report identifier and the snapshot identifier. The service must validate that the snapshot's `hrm_time_tracking_report_id` matches the requested report before returning data. This prevents accidental or unauthorized access to a snapshot through an unrelated report path.
   *
   * The returned resource should reflect the historical nature of the snapshot record. Fields such as `output_uri`, `output_format`, `period_start`, `period_end`, `row_count`, and `generated_at` describe the generated artifact and the period it covers. Unlike live report views that refresh when underlying data changes, this endpoint exposes a persisted snapshot record that remains reproducible over time. Consumers that need a list of available snapshots for a report should first use the corresponding list endpoint for snapshots, then call this detail endpoint to access one specific stored result.
   *
   * If the report or snapshot cannot be found in the current organization scope, the system should respond as an unavailable target resource rather than leaking whether a record exists elsewhere. If the snapshot has been removed from active visibility through its `deleted_at` timestamp, the service should treat it as not available for normal retrieval unless the broader product explicitly supports privileged historical access. Error handling must preserve organization isolation and must not mix data across organizations even when failures occur.
   *
   * @param connection
   * @param reportId Target saved report ID
   * @param snapshotId Target report snapshot ID
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement a read-only service that loads one report snapshot from `hrm_time_tracking_report_snapshots` joined to its parent `hrm_time_tracking_reports` record.
   *
   * Authorize the caller before returning any report data. Resolve the caller's current organization context, then verify the caller has report viewing permission in that organization. Apply organization-scoped access evaluation only within the current organization context.
   *
   * Query the parent report by `hrm_time_tracking_reports.id = {reportId}` and `hrm_time_tracking_reports.hrm_time_tracking_organization_id = currentOrganizationId`. Exclude logically removed parent reports by requiring `deleted_at IS NULL` unless internal administrative recovery behavior is explicitly supported elsewhere.
   *
   * Query the snapshot by `hrm_time_tracking_report_snapshots.id = {snapshotId}` and `hrm_time_tracking_report_snapshots.hrm_time_tracking_report_id = {reportId}`. Exclude logically removed snapshots by requiring `deleted_at IS NULL` for normal retrieval. Return not found when either the parent report does not exist in the current organization or the snapshot is not attached to that report.
   *
   * Map the result to the response DTO using the actual snapshot columns: `id`, `hrm_time_tracking_report_id`, `output_uri`, `output_format`, `period_start`, `period_end`, `row_count`, `generated_at`, `created_at`, and `updated_at`. Include parent report context only if the response schema for `IHrmTimeTrackingReportSnapshot` defines it; otherwise return only the snapshot entity fields.
   *
   * Do not regenerate the report, call external integrations, or recompute live analytical values in this operation. This endpoint is strictly for retrieving persisted historical output metadata. If the stored artifact location referenced by `output_uri` is unavailable, keep the business record intact and surface the retrieval failure consistently without fabricating a successful artifact state.
   *
   * Handle edge cases explicitly: deny when the caller lacks report viewing permission; return not found when the report is outside the current organization; return not found when the snapshot does not belong to the specified report; and avoid exposing whether foreign-organization records exist. The operation must remain side-effect free and must not alter snapshot, report, or related organization data.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":snapshotId")
  public async at(
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedParam("snapshotId")
    snapshotId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingReportSnapshot> {
    try {
      return await getHrmTimeTrackingReportsReportIdSnapshotsSnapshotId({
        reportId,
        snapshotId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
