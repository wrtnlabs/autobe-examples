import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingReportTaskFilter } from "../../../../api/structures/IHrmTimeTrackingReportTaskFilter";
import { deleteHrmTimeTrackingReportsReportIdTaskFiltersTaskFilterId } from "../../../../providers/deleteHrmTimeTrackingReportsReportIdTaskFiltersTaskFilterId";
import { getHrmTimeTrackingReportsReportIdTaskFiltersTaskFilterId } from "../../../../providers/getHrmTimeTrackingReportsReportIdTaskFiltersTaskFilterId";
import { patchHrmTimeTrackingReportsReportIdTaskFilters } from "../../../../providers/patchHrmTimeTrackingReportsReportIdTaskFilters";
import { postHrmTimeTrackingReportsReportIdTaskFilters } from "../../../../providers/postHrmTimeTrackingReportsReportIdTaskFilters";
import { putHrmTimeTrackingReportsReportIdTaskFiltersTaskFilterId } from "../../../../providers/putHrmTimeTrackingReportsReportIdTaskFiltersTaskFilterId";

@Controller("/hrmTimeTracking/reports/:reportId/taskFilters")
export class HrmtimetrackingReportsTaskfiltersController {
  /**
   * Create a task filter selection for an existing saved report definition.
   *
   * This operation adds one normalized task selection to a saved organization-scoped report definition stored in `hrm_time_tracking_reports`. The parent report represents a reusable analytical view that keeps atomic configuration such as the report family, optional reporting period, grouping dimension, and billable toggles in the report record itself, while repeating task selections are stored separately in `hrm_time_tracking_report_task_filters`. By creating one child row per selected task, the platform preserves the normalized structure described by the database schema and allows the same report definition to be reused consistently over time.
   *
   * Access to this operation must follow the report access rules of the currently selected organization context. The platform must evaluate the caller's report viewing permission only within the current organization, and it must reject the request when the caller lacks that permission for the selected organization. The operation must never allow a report from one organization or a task from another organization to be attached across tenant boundaries. When access is denied, no report filter metadata or report data should be exposed.
   *
   * From a data perspective, this endpoint creates a row in `hrm_time_tracking_report_task_filters` containing the owning saved report identifier, the selected task identifier, and the standard creation and update timestamps. The table comment defines the child record as a normalized task filter selection attached to a saved report definition, and its schema enforces uniqueness for the pair `(hrm_time_tracking_report_id, hrm_time_tracking_task_id)`. As a result, the same task cannot be selected more than once for the same report. The platform must treat this operation as an update to the saved analytical scope of the parent report rather than as report execution itself.
   *
   * This operation is typically used together with report retrieval or report execution endpoints that read the saved report definition and its related filter selections before generating a Time Report, Project Budget Report, or Weekly Summary Report for the current organization. Clients should create the parent report first, then add zero or more task filters through this nested endpoint, and only afterward request report output based on the saved definition.
   *
   * If validation fails, the platform should reject the request without creating a partial filter record. Failures include a missing target report, a referenced task that is outside the current organization scope, a duplicate task selection for the same report, or permission denial in the current organization. Consistent with the platform's safe-failure rules, the service must prefer rejection over producing an ambiguous or misleading saved report configuration.
   *
   * @param connection
   * @param reportId Target saved report identifier
   * @param body Task filter selection to add to the saved report
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Authorize the caller using report viewing
     *   permission evaluated in the currently selected organization context. Do
     *   not infer access from permissions granted in any other organization.
   *
   * Load the parent row from `hrm_time_tracking_reports` by `id = reportId` and `deleted_at IS NULL`. If the report does not exist, return a not-found error. Verify that `hrm_time_tracking_organization_id` of the report matches the caller's current organization context; otherwise reject the request as out-of-scope.
   *
   * Validate the request body against `IHrmTimeTrackingReportTaskFilter.ICreate`. Resolve the referenced task identifier from the body against the task domain table and ensure that the task belongs to the same current organization as the parent report. Reject the request when the task is missing, inaccessible, or outside the current organization boundary.
   *
   * Before insertion, check for an existing non-deleted row in `hrm_time_tracking_report_task_filters` with the same `(hrm_time_tracking_report_id, hrm_time_tracking_task_id)` pair. Because the schema defines a composite unique constraint for this pair, the service should proactively detect duplicates and also translate any database uniqueness violation into a business-level conflict response.
   *
   * Insert a new `hrm_time_tracking_report_task_filters` row with a generated UUID, the resolved report ID, the resolved task ID, `created_at`, and `updated_at`. Persist the change transactionally. The operation should not modify unrelated report fields on the parent record.
   *
   * Return the created task filter resource as `IHrmTimeTrackingReportTaskFilter`. Include identifiers and timestamps required for clients to reference or remove the selection later. Error handling must preserve organization isolation and must not leak whether a foreign-organization report or task exists beyond a scoped authorization or validation failure.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingReportTaskFilter.ICreate,
  ): Promise<IHrmTimeTrackingReportTaskFilter> {
    try {
      return await postHrmTimeTrackingReportsReportIdTaskFilters({
        reportId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the task filter selection set for a saved report definition.
   *
   * This operation manages the normalized task selections attached to a saved report in the reporting module. The underlying report record is stored in `hrm_time_tracking_reports`, which represents a saved organization-scoped report definition containing reusable analytical settings such as report type, optional reporting range, grouping dimension, and billable filtering flags. The task filter values themselves are stored separately in `hrm_time_tracking_report_task_filters`, where each row links one selected task to the parent report definition. By updating this endpoint, a client replaces the report's current task-based analytical scope with a new validated selection set.
   *
   * Access to this operation is restricted by report permissions in the currently selected organization. Report access validation must occur before exposing or modifying filters, groupings, or results. A caller who lacks report viewing permission in the current organization must not be allowed to inspect or change the task filters of any saved report, and a caller working across multiple organizations must be evaluated only against the active organization context. The target report must belong to the current organization, and no task from another organization may be attached through this endpoint.
   *
   * This endpoint operates on report configuration rather than transactional work data. It changes only the normalized child records that define which tasks constrain later report analysis. The parent report may also carry date boundaries through `range_start_date` and `range_end_date`, grouping behavior through `group_by`, and billable flags through `billable_only` and `include_non_billable`; those settings are not modified here. Clients should use the appropriate saved report update operation for broader report definition changes, while this endpoint is focused specifically on task filter composition.
   *
   * Validation must ensure that every submitted task identifier exists, that each task is valid for the same organization as the parent report, and that duplicate task selections are not persisted. Because the database schema defines a composite uniqueness rule on `(hrm_time_tracking_report_id, hrm_time_tracking_task_id)`, the final stored set must contain each task at most once for the report. Error responses should reject invalid cross-organization references, unknown report identifiers, unknown task identifiers, and unauthorized access. If any downstream dependency failure affects the update flow, the system must present the action as failed rather than returning a misleading partial success.
   *
   * This endpoint is commonly used before generating or refreshing a filtered analytical view. After the task filter set is updated, subsequent report retrieval or execution operations can use the saved configuration to produce organization-scoped analytical results that reflect the selected task scope.
   *
   * @param connection
   * @param reportId Target saved report identifier
   * @param body Replacement set of task filters for the saved report
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Authorize the caller against the current
     *   organization context before any report configuration lookup. Require
     *   report viewing permission in the selected organization; if permission
     *   is missing, reject the request without exposing whether the report
     *   exists.
   *
   * Load the target row from `hrm_time_tracking_reports` by `id = reportId` and `deleted_at IS NULL`. Verify that its `hrm_time_tracking_organization_id` matches the caller's current organization context. If no matching report exists in the active organization, return a not-found or access-denied outcome consistent with the service's security policy.
   *
   * Parse the request body as the complete desired task filter selection set for the report. Normalize the incoming task identifier list by trimming duplicates before persistence-time validation, but reject malformed identifiers immediately. If the request intends an empty selection, treat it as clearing all task filters for the report.
   *
   * Validate each referenced task against `hrm_time_tracking_tasks` using active records only and ensure every task belongs to the same organization boundary as the parent report. Do not allow any task from another organization context to be linked to the report. If one or more task identifiers are invalid or out of scope, reject the entire operation and preserve the previously stored filter set.
   *
   * Execute the change in a single transaction. Remove existing non-deleted rows from `hrm_time_tracking_report_task_filters` for the target report, then insert the final validated set of unique task references. Respect the table's composite uniqueness on `(hrm_time_tracking_report_id, hrm_time_tracking_task_id)`. Update audit timestamps for newly written rows according to platform conventions.
   *
   * Return the resulting filter collection for the report after the transaction commits. The response payload should include the parent report identifier and the final list of selected task filter entries so downstream report execution flows can use the saved configuration immediately. If report refresh events are emitted by the application layer after configuration changes, scope them only to users authorized to view reports in the same organization and avoid exposing unrelated operational detail.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async updateTaskFilters(
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingReportTaskFilter.IUpdateRequest,
  ): Promise<IHrmTimeTrackingReportTaskFilter.ICollection> {
    try {
      return await patchHrmTimeTrackingReportsReportIdTaskFilters({
        reportId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single task filter selection from a saved report definition.
   *
   * This operation returns one normalized task filter row that belongs to a saved report in the reporting area. In the data model, saved reports are stored in `hrm_time_tracking_reports` as reusable organization-scoped report definitions containing stable analytical configuration such as the report family, optional date range, grouping mode, and billable toggles. Task selections are not embedded in that parent record; instead, they are normalized into `hrm_time_tracking_report_task_filters`, where each row represents one selected task used to constrain the report's analytical scope. This endpoint exposes one such child selection in detail form.
   *
   * Access to this operation is organization-scoped and permission-gated. The system shall allow report access only to users who have report viewing permission in the currently selected organization, and that access validation must occur before report filters or results are shown. As a consequence, this endpoint must not reveal whether a report or task filter exists outside the active organization context. The caller must already be operating within the organization that owns the parent saved report, and users without report viewing permission in that organization must be denied access.
   *
   * The operation is also parent-scoped by design. Although `taskFilterId` uniquely identifies the child row, the path includes `reportId` so the API can guarantee that the requested filter belongs to the specified saved report. This matches the database relationship where each task filter row belongs to exactly one `hrm_time_tracking_reports` record through `hrm_time_tracking_report_id`, and duplicate task selections within the same report are prevented by a composite unique constraint on report and task. The endpoint therefore documents and enforces ownership, not just lookup by primary key.
   *
   * This operation is typically used together with other report-related APIs that open the reporting area or retrieve a saved report definition before drilling into its normalized filter selections. Consumers should first obtain or know the relevant saved report identifier in the current organization context, then request the individual task filter when a detailed child-resource view is needed. Error handling should reject access when the user lacks report-viewing permission, when the parent report is outside the selected organization, or when the task filter does not belong to the specified report.
   *
   * @param connection
   * @param reportId Target saved report's ID
   * @param taskFilterId Target task filter selection's ID
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification 1. Authenticate the caller and resolve the
     *   currently selected organization context. 2. Authorize the request by
     *   checking that the caller has report viewing permission in the current
     *   organization before exposing report filters or report metadata. 3.
     *   Query `hrm_time_tracking_reports` by `id = reportId`,
     *   `hrm_time_tracking_organization_id = currentOrganizationId`, and an
     *   active-record condition excluding rows whose `deleted_at` is not null.
     *   4. If no matching report exists in the current organization context,
     *   reject the request as not found or inaccessible without disclosing
     *   cross-organization existence details. 5. Query
     *   `hrm_time_tracking_report_task_filters` by `id = taskFilterId`,
     *   `hrm_time_tracking_report_id = reportId`, and an active-record
     *   condition excluding rows whose `deleted_at` is not null`. 6. If the
     *   child row is not found, reject the request because the specified task
     *   filter does not belong to the specified saved report or is no longer
     *   active. 7. Load any fields required by the
     *   `IHrmTimeTrackingReportTaskFilter` response contract. If the DTO
     *   includes related task details, join the referenced task through
     *   `hrm_time_tracking_task_id` using a read-only lookup. Do not include
     *   unrelated report filters. 8. Return the resolved child resource as a
     *   single JSON object. 9. Error handling must cover: missing permission,
     *   missing current-organization report, mismatched parent-child
     *   relationship, and logically removed rows. 10. No mutation, transaction
     *   with writes, or report recalculation is required for this endpoint; it
     *   is a read-only detail retrieval.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":taskFilterId")
  public async at(
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedParam("taskFilterId")
    taskFilterId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingReportTaskFilter> {
    try {
      return await getHrmTimeTrackingReportsReportIdTaskFiltersTaskFilterId({
        reportId,
        taskFilterId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a saved task filter selection within a specific report definition.
   *
   * This operation updates one normalized task filter row that belongs to a saved report in the reporting area. The parent report is a saved organization-scoped report definition used for reusable analytical views, and the child task filter represents one selected task used to constrain that report's analytical scope. Because the report model stores repeating task selections in a dedicated child table instead of arrays or serialized text, this endpoint is responsible for maintaining one concrete task selection under an existing report.
   *
   * Access to this operation must be evaluated in the currently selected organization context. Reports are available only to users who have report viewing permission in that organization, and report access validation must be performed before exposing report filters or report results. The system must therefore confirm that the requested report belongs to the current organization and must reject the update when the caller lacks report access in that organization, even if the same user has report-related access elsewhere.
   *
   * The operation works with the underlying hrm_time_tracking_reports and hrm_time_tracking_report_task_filters tables. The parent report stores the reusable report definition, including the human-readable name, report type, optional date range, grouping mode, and billable toggles. The child filter row stores the selected task linked to that parent report. Since duplicate task selections are prevented within the same report by a composite unique constraint, the update must validate that the new task selection does not collide with another existing task filter row for the same report.
   *
   * Clients typically use this endpoint after retrieving report details and the current set of normalized filters for editing. The report must already exist, and the task filter row must already belong to that report. If either identifier is invalid, if the task filter does not belong to the specified report, or if the replacement task selection would violate report-scoped uniqueness, the request must fail without partially updating reporting configuration. On success, the endpoint returns the updated task filter resource so the client can refresh the saved report editor state.
   *
   * @param connection
   * @param reportId Target saved report ID
   * @param taskFilterId Target task filter ID
   * @param body Replacement values for the task filter
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implement this operation as an authenticated
     *   organization-scoped update on the hrm_time_tracking_report_task_filters
     *   subsidiary resource.
   *
   * 1. Resolve the caller's currently selected organization context and verify that the caller has report viewing permission in that organization before any filter data is exposed or mutated.
   * 2. Load the parent hrm_time_tracking_reports row by id = reportId and deleted_at IS NULL. Reject if not found.
   * 3. Verify the loaded report's hrm_time_tracking_organization_id matches the caller's current organization context. Reject on cross-organization access.
   * 4. Load the target hrm_time_tracking_report_task_filters row by id = taskFilterId and deleted_at IS NULL. Reject if not found.
   * 5. Verify the target task filter's hrm_time_tracking_report_id exactly matches reportId. Reject if the child record does not belong to the specified parent report.
   * 6. Validate the request body fields for update. Permit only mutable fields defined by the DTO, primarily the referenced hrm_time_tracking_task_id replacement. Do not allow changing parent report ownership through the body.
   * 7. If the task reference is being changed, verify the referenced task exists and is valid for use in the same organization context as the parent report. Reject any task reference outside the current organization scope.
   * 8. Enforce the composite uniqueness of [hrm_time_tracking_report_id, hrm_time_tracking_task_id] by checking whether another non-deleted filter row already exists for the same report and requested task. Reject duplicates.
   * 9. Update the target row's hrm_time_tracking_task_id as requested and set updated_at to the current timestamp. Preserve created_at and parent linkage.
   * 10. Return the updated task filter record.
   *
   * Use a single transaction for validation-dependent persistence so the uniqueness check and write remain consistent. For error handling, return not found for missing report or task-filter resources, forbidden for organization-scope or permission failures, and conflict or validation failure for duplicate task selections within the same report. Do not mutate unrelated report data or create any misleading reporting records if a validation step fails.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":taskFilterId")
  public async update(
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedParam("taskFilterId")
    taskFilterId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingReportTaskFilter.IUpdate,
  ): Promise<IHrmTimeTrackingReportTaskFilter> {
    try {
      return await putHrmTimeTrackingReportsReportIdTaskFiltersTaskFilterId({
        reportId,
        taskFilterId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently remove one task filter selection from a saved report definition.
   *
   * This operation deletes a single row from the normalized task filter set that belongs to a saved report definition. The underlying report model stores stable analytical configuration for one organization, including report type, optional reporting range, grouping mode, and billable toggles, while repeating filter selections are intentionally normalized into child tables. The task filter model therefore represents one selected task used to constrain the analytical scope of the saved report, and this endpoint removes exactly one such selection from that saved configuration.
   *
   * Access to this operation is organization-scoped. The caller must be operating within the currently selected organization, and the target report must belong to that organization. Report access requirements state that organization reports are available only to users who have report viewing permission in the currently selected organization, and report data must never leak across organization boundaries. The implementation must therefore verify both the caller's permission in the active organization context and the ownership chain from the task filter row to the parent report and organization before performing deletion.
   *
   * From a data perspective, the parent hrm_time_tracking_reports table is the saved organization-scoped report definition, and the child hrm_time_tracking_report_task_filters table stores one selected task reference for that definition. Each child row references one report and one task, and duplicate selections within the same report are prevented by the composite uniqueness of report and task identifiers. Removing one child row updates the report's saved filter scope by excluding that selected task from future analytical use of the saved report definition, while leaving the parent report record and all other filter selections intact.
   *
   * This operation is intended to be used together with report detail retrieval or report editing interfaces that show the current saved filter set before the user removes one entry. A client typically loads the saved report and its current task filter selections first, then calls this endpoint for the chosen filter row. If the report does not exist in the current organization, the task filter does not exist, or the filter does not belong to the specified report, the operation must fail without deleting anything. The deletion must affect only the identified normalized filter record and must not remove the underlying task, report, or any unrelated analytical data.
   *
   * @param connection
   * @param reportId Identifier of the saved report definition in the current organization.
   * @param taskFilterId Identifier of the task filter selection belonging to the specified report.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implement this operation as a hard delete of one
     *   hrm_time_tracking_report_task_filters row scoped to its owning
     *   hrm_time_tracking_reports record.
   *
   * 1. Resolve the caller's current organization context and verify the caller has report viewing permission for that organization. If the caller lacks permission, reject the request before querying report data.
   * 2. Load the parent hrm_time_tracking_reports row by reportId and verify its hrm_time_tracking_organization_id matches the caller's current organization. If no matching report exists in scope, return a not-found or access-denied style failure according to service conventions.
   * 3. Load the hrm_time_tracking_report_task_filters row by taskFilterId and verify its hrm_time_tracking_report_id equals the parent report's id. Do not allow deletion when the child row exists but belongs to a different report.
   * 4. Delete only the matched hrm_time_tracking_report_task_filters row. Do not modify hrm_time_tracking_reports fields and do not delete the referenced task.
   * 5. Return success with no response body.
   *
   * Implementation notes:
   * - Use a transaction if your data-access layer requires consistent verification and deletion semantics.
   * - Treat the nested route as authoritative: both reportId and taskFilterId must be honored.
   * - Because the child table includes deleted_at but this endpoint is defined as delete and the business intent is resource removal, perform actual deletion of the selected filter row rather than a logical mark-only update.
   * - Preserve organization isolation: never reveal whether a report or filter exists in another organization.
   * - Error cases to handle include missing permission, unknown report in current organization, unknown task filter, and task filter/report mismatch.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":taskFilterId")
  public async erase(
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedParam("taskFilterId")
    taskFilterId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmTimeTrackingReportsReportIdTaskFiltersTaskFilterId({
        reportId,
        taskFilterId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
