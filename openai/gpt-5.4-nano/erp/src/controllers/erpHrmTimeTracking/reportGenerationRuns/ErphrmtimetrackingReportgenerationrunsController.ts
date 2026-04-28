import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingReportGenerationRun } from "../../../api/structures/IErpHrmTimeTrackingReportGenerationRun";
import { deleteErpHrmTimeTrackingReportGenerationRunsReportGenerationRunId } from "../../../providers/deleteErpHrmTimeTrackingReportGenerationRunsReportGenerationRunId";
import { getErpHrmTimeTrackingReportGenerationRunsReportGenerationRunId } from "../../../providers/getErpHrmTimeTrackingReportGenerationRunsReportGenerationRunId";
import { postErpHrmTimeTrackingReportGenerationRuns } from "../../../providers/postErpHrmTimeTrackingReportGenerationRuns";
import { putErpHrmTimeTrackingReportGenerationRunsReportGenerationRunId } from "../../../providers/putErpHrmTimeTrackingReportGenerationRunsReportGenerationRunId";

@Controller("/erpHrmTimeTracking/reportGenerationRuns")
export class ErphrmtimetrackingReportgenerationrunsController {
  /**
   * Retrieve the details of a single report generation run by its identifier.
   *
   * This endpoint is designed for the report viewing flow where a member first selects a report definition and date range, then requests generation, and finally needs to view the resulting grouped output rows. The request is identified by a single persisted generation-run identifier.
   *
   * Security and authorization are enforced using the currently selected organization context of the authenticated member. When an organization context is not selected, the system must block the request and return a business validation message indicating that the user must select an organization context before accessing reports. When an organization context is present, the system scopes access checks to that organization and requires report-viewing permission for that selected organization.
   *
   * The operation reads from persisted reporting tables:
   *
   * - `erp_hrm_time_tracking_report_generation_runs` provides the run identity, lifecycle `status`, `parameters_summary`, and generation timestamps (`started_at`, `finished_at`), plus `error_message` when a run fails.
   * - `erp_hrm_time_tracking_report_outputs` provides the grouped output rows for the run, including `employee_id`, `project_id`, optional `task_id`, and optional `week_start_date_id` when the report definition uses week grouping.
   * - `erp_hrm_time_tracking_report_output_metrics` provides metric breakdown lines per output row, keyed by `metric_name` and valued by `metric_value`.
   *
   * If the selected organization has no employees or if no timelog data matches the requested filters for the run, the generated outputs may be empty. In that case, the endpoint must still complete successfully and return an empty output result set rather than failing.
   *
   * Expected behavior and error handling:
   *
   * - If the requested run does not exist (or is not accessible within the selected organization), return an appropriate error response.
   * - If the run exists but has failed, include the run’s `status`, `error_message`, and still return any available outputs (if present) to support debugging and UI display.
   * - Do not create or modify report records from this endpoint; it is strictly read-only.
   *
   *
   * @param connection
   * @param reportGenerationRunId Identifier of the report generation run to retrieve (UUID).
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implementation steps:
   *
   * 1) Validate path parameter `reportGenerationRunId` is a UUID string and load the generation run record from `erp_hrm_time_tracking_report_generation_runs` by primary key `id`.
   *
   * 2) Enforce organization context gating:
   * - Require that the authenticated member has an active organization context selected.
   * - From the loaded run, join to `erp_hrm_time_tracking_report_definitions` via `erp_hrm_time_tracking_report_definition_id`, and use the definition’s `erp_hrm_time_tracking_organization_id` to scope authorization.
   * - If organization context is missing, reject with the business validation message described in the report viewing error scenarios.
   * - If the member lacks `report:view` capability for the selected organization, reject the request.
   *
   * 3) Fetch run detail payload:
   * - Return the run fields: `id`, `status`, `parameters_summary`, `started_at`, `finished_at`, `error_message`, `created_at`, `updated_at`.
   *
   * 4) Fetch outputs for the run:
   * - Query `erp_hrm_time_tracking_report_outputs` where `report_generation_run_id = reportGenerationRunId`.
   * - For each output row, collect: `id`, `employee_id`, `project_id`, `task_id`, `week_start_date_id`, `grouping_sort_key`, `notes`, `created_at`, `updated_at`.
   *
   * 5) Fetch metric breakdown lines (optional but included in the DTO for detailed view):
   * - For output ids returned in step 4, query `erp_hrm_time_tracking_report_output_metrics` where `erp_hrm_time_tracking_report_output_id IN (...)`.
   * - Group metric lines by parent `erp_hrm_time_tracking_report_output_id`.
   * - Ensure uniqueness per output+metric_name is respected by schema unique constraint; if duplicate rows appear due to data issues, treat as a data error.
   *
   * 6) Empty result handling:
   * - If there are zero outputs, return an empty outputs array in the response body while still returning the run metadata.
   *
   * 7) Soft-deleted row handling:
   * - Apply deletion semantics consistently with existing conventions: since the schemas include `deleted_at` on runs/outputs/metrics, exclude rows where `deleted_at` is not null from the returned payload unless the system’s general policy explicitly includes them for audit UI.
   *
   * 8) Error handling:
   * - If the run id does not exist, return not-found.
   * - If the run exists but organization permission fails, return access denied.
   *
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":reportGenerationRunId")
  public async at(
    @TypedParam("reportGenerationRunId")
    reportGenerationRunId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmTimeTrackingReportGenerationRun> {
    try {
      return await getErpHrmTimeTrackingReportGenerationRunsReportGenerationRunId(
        {
          reportGenerationRunId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a persisted time-tracking report generation run record identified by its ID.
   *
   * This operation modifies a single row in `erp_hrm_time_tracking_report_generation_runs` (the record for one report generation attempt), changing its lifecycle metadata such as `status` and associated timing/error fields recorded for auditability. The record is linked to a report definition via `erp_hrm_time_tracking_report_definition_id`, and the update must be scoped to the currently selected organization context.
   *
   * Only users with report viewing/management capability within the selected organization context may update generation-run metadata. This operation does not create or alter report outputs; it only updates the generation-run status and its related metadata so clients can reflect progress or completion state.
   *
   * Validation and behavior:
   *
   * - If `reportGenerationRunId` does not match an existing run record in the selected organization, return a not-found or business not-available error.
   * - Validate allowed `status` transitions according to the generation workflow. When the run represents success, the error field must be empty; when it represents failure, an error message must be present.
   * - If timing fields are provided, validate consistency (e.g., `finished_at` must not precede `started_at`).
   * - Do not modify immutable identity fields (such as the run `id`).
   *
   * Error handling: business validation failures must not partially update the row; the operation should either fully apply a valid update or return an error.
   *
   * @param connection
   * @param reportGenerationRunId Unique identifier of the report generation run to update.
   * @param body Update payload for the specified report generation run, including lifecycle status and optional timing/error metadata.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implementation steps for Realize Agent:
   *
   * 1) Parse input
   * - Extract `reportGenerationRunId` from path.
   * - Parse request body of type `IErpHrmTimeTrackingReportGenerationRun.IUpdate`.
   *
   * 2) Authorization and organization scoping
   * - Resolve current selected organization context from the session.
   * - Load the targeted `erp_hrm_time_tracking_report_generation_runs` row by `id`.
   * - Ensure the associated `reportDefinition` (via `erp_hrm_time_tracking_report_definition_id`) belongs to the same selected organization context.
   * - If authorization fails, deny access.
   *
   * 3) Validate business rules for updates
   * - Only allow lifecycle/status metadata fields to be updated.
   * - Never update `created_at` and never update immutable identity fields such as `id`.
   * - Validate `status` transition consistency. (For example: pending -> running -> succeeded/failed; reject any illegal transition.)
   * - If the update sets `status` to a failure state, ensure `error_message` is non-empty when required; if status indicates success, ensure `error_message` is null.
   * - If `started_at`/`finished_at` are provided, validate they are consistent (finished_at >= started_at when both are set).
   *
   * 4) Execute update transactionally
   * - Use a single database transaction.
   * - Perform an UPDATE on `erp_hrm_time_tracking_report_generation_runs` with the allowed columns only.
   * - If no row is affected, treat as not-found.
   *
   * 5) Return updated record
   * - Re-query the updated row and map it to `IErpHrmTimeTrackingReportGenerationRun` response DTO.
   *
   * Edge cases
   * - Concurrent updates: last-write-wins at the application layer unless the schema/ORM provides optimistic locking; do not create duplicate runs.
   * - If the record is marked removed (deleted_at not null) and the design forbids updates, reject with a business error.
   *
   * Indexes
   * - The operation will use `id` primary key lookup efficiently; additional filtering by report definition/organization must rely on joins to `erp_hrm_time_tracking_report_definitions` if needed.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":reportGenerationRunId")
  public async update(
    @TypedParam("reportGenerationRunId")
    reportGenerationRunId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimeTrackingReportGenerationRun.IUpdate,
  ): Promise<IErpHrmTimeTrackingReportGenerationRun> {
    try {
      return await putErpHrmTimeTrackingReportGenerationRunsReportGenerationRunId(
        {
          reportGenerationRunId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes a single report generation run record.
   *
   * This endpoint targets the report-generation-run persistence entity that stores, for a specific `report_definition`, the generation `status`, the `parameters_summary` used to reproduce the run, optional `started_at`/`finished_at` timestamps, and an optional `error_message` captured when the generation failed. The record is identified by `reportGenerationRunId`.
   *
   * Authorization and organization scoping are enforced by the service layer. The implementation must ensure that the caller is allowed to manage report generation runs within the currently selected organization context (for example, by checking the organization of the referenced report definition). If the run is not found within that scope, the operation must fail as a not-found/unavailable resource.
   *
   * Validation and deletion behavior:
   * - The path parameter is required and must be a valid UUID.
   * - On success, the specified generation run record is removed from the database.
   * - Any related cascading persistence must follow the database relation behavior defined for `erp_hrm_time_tracking_report_generation_runs` (the `reportDefinition` relation is configured with cascading delete).
   *
   * Related behavior notes:
   * - Other project/time tracking operations may use report generation runs as traceability/audit artifacts. After deletion, clients must treat the run as unavailable for viewing or further workflow actions.
   *
   * Error handling:
   * - If the identifier is invalid, return a 4xx validation error.
   * - If the run does not exist in the caller’s organization scope, return a not-found/unavailable error.
   * - If deletion is blocked due to database constraints, return an appropriate 4xx/5xx error depending on the failure cause.
   *
   * @param connection
   * @param reportGenerationRunId Target report generation run identifier to permanently remove.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implementation steps for DELETE
     *   /reportGenerationRuns/{reportGenerationRunId}: 1) Parse and validate
     *   `reportGenerationRunId` as UUID. 2) Authorization: - Resolve the
     *   caller's effective permissions in the currently selected organization
     *   context. - Determine the owning organization by loading the
     *   `erp_hrm_time_tracking_report_generation_runs` row along with its
     *   `reportDefinition` relation (erp_hrm_time_tracking_report_definition_id
     *   -> erp_hrm_time_tracking_report_definitions -> organization). - Reject
     *   if the run belongs to a different organization than the selected
     *   context. 3) Existence check: - Query
     *   `erp_hrm_time_tracking_report_generation_runs` by `id`. - If not found
     *   (or not found under the scoped organization), return an error
     *   indicating the run is unavailable. 4) Deletion: - Execute a single
     *   transaction to permanently remove the row by primary key. - Rely on the
     *   ORM/database cascade rule for the `reportDefinition` relation
     *   (onDelete: Cascade) to handle dependent records. 5) Response: - Return
     *   HTTP 200/204 with an empty JSON body as defined by `responseBody:
     *   null`. Edge cases: - If the run has already been removed, treat it as
     *   unavailable (not found). - If database-level constraints/cascades fail,
     *   surface an internal error.
   *
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":reportGenerationRunId")
  public async eraseReportGenerationRun(
    @TypedParam("reportGenerationRunId")
    reportGenerationRunId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteErpHrmTimeTrackingReportGenerationRunsReportGenerationRunId(
        {
          reportGenerationRunId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Create a new report generation run for the selected time-tracking report definition.
   *
   * This endpoint persists a new {@link erp_hrm_time_tracking_report_generation_runs} record, capturing the target {@link erp_hrm_time_tracking_report_generation_runs.erp_hrm_time_tracking_report_definition_id} (the report definition this run is based on), the run {@link erp_hrm_time_tracking_report_generation_runs.status} lifecycle state, and a deterministic {@link erp_hrm_time_tracking_report_generation_runs.parameters_summary} that summarizes the input parameters used for the generation. The record is created with {@link erp_hrm_time_tracking_report_generation_runs.started_at} and {@link erp_hrm_time_tracking_report_generation_runs.finished_at} initially unset (or in accordance with the implementation’s pending/running semantics), and later updated as the generation progresses.
   *
   * The generated outputs for this run are stored in {@link erp_hrm_time_tracking_report_outputs} rows linked by {@link erp_hrm_time_tracking_report_outputs.report_generation_run_id}. If the report definition includes metric breakdown/grouping dimensions, the corresponding metric name/value breakdown lines are stored in {@link erp_hrm_time_tracking_report_output_metrics}, linked by {@link erp_hrm_time_tracking_report_output_metrics.erp_hrm_time_tracking_report_output_id}.
   *
   * Security and isolation: report definitions belong to an organization via {@link erp_hrm_time_tracking_report_definitions.erp_hrm_time_tracking_organization_id}. All run creation inputs and resulting run/output data must be scoped to the selected organization context of the authenticated member actor. If the organization context is missing, the request must be blocked following the report access rules.
   *
   * Validation and error behavior: if the selected report definition does not exist, is deleted (when applicable), or is not accessible within the selected organization context, the operation must be rejected. If generation fails after the run row is created, the system updates the same run with {@link erp_hrm_time_tracking_report_generation_runs.error_message} and sets {@link erp_hrm_time_tracking_report_generation_runs.finished_at}. The persisted run row still enables audit traceability of attempts.
   *
   * Expected behavior: the endpoint returns the newly created generation run record immediately. Consumers that need the generated report outputs must query the corresponding report outputs by run identifier using the existing read operations (e.g., report output listing by run).
   *
   * Related data browsing: report viewing operations depend on report generation availability and organization context; when requested at a time where there are no employees or no timelogs, the system returns an empty result set safely without failing report generation operations.
   *
   * @param connection
   * @param body Creation request payload for initiating a report generation run for a specific report definition. The payload includes the report definition identifier and generation parameters whose deterministic summary will be stored in parameters_summary.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification 1) Validate that authenticated member has
     *   report:view (or the required permission for initiating report
     *   generation) within the selected organization context. 2) Resolve the
     *   target report definition by the request-provided report definition
     *   identifier; verify it belongs to the selected organization. 3) Create
     *   erp_hrm_time_tracking_report_generation_runs row with: -
     *   erp_hrm_time_tracking_report_definition_id set from request - status
     *   initialized to the implementation’s initial lifecycle value (e.g.,
     *   pending) consistent with allowed status strings - parameters_summary
     *   set to a deterministic summary of generation parameters derived from
     *   request - started_at/finished_at left null initially (until the
     *   generation worker transitions status) - error_message null 4) Enqueue
     *   or trigger asynchronous generation processing (worker/job) that will: -
     *   update started_at when generation begins - compute grouped outputs and
     *   metric breakdown lines, persisting into
     *   erp_hrm_time_tracking_report_outputs and
     *   erp_hrm_time_tracking_report_output_metrics - update status,
     *   finished_at, and error_message (when failures occur) 5) Return the
     *   created report generation run DTO.
   *
   * Database interactions:
   * - Transactionally insert the run row.
   * - Generation worker uses additional transactions to insert outputs and output metrics linked by foreign keys.
   *
   * Edge cases:
   * - If organization context is missing, reject with a business validation message.
   * - If the report definition is not accessible within organization context, reject before creating the run.
   * - Ensure idempotency policy if the request is retried (implementation may use parameters_summary and definition id to detect duplicates if defined in other requirements).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @TypedBody()
    body: IErpHrmTimeTrackingReportGenerationRun.ICreate,
  ): Promise<IErpHrmTimeTrackingReportGenerationRun> {
    try {
      return await postErpHrmTimeTrackingReportGenerationRuns({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
