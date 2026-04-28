import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingReportOutputMetric } from "../../../../api/structures/IErpHrmTimeTrackingReportOutputMetric";
import { patchErpHrmTimeTrackingReportOutputsReportOutputIdMetrics } from "../../../../providers/patchErpHrmTimeTrackingReportOutputsReportOutputIdMetrics";

@Controller("/erpHrmTimeTracking/reportOutputs/:reportOutputId/metrics")
export class ErphrmtimetrackingReportoutputsMetricsController {
  /**
   * Updates the metric breakdown lines associated with a single report output row.
   *
   * This endpoint is intended for cases where a generated report output (for example, a grouped employee/project/task/week row) needs its per-metric breakdown values adjusted while staying tied to the same grouped output identity. The target row is identified by `reportOutputId`, which maps to `erp_hrm_time_tracking_report_outputs.id`. The metric lines updated by this endpoint correspond to `erp_hrm_time_tracking_report_output_metrics` where each row stores a `metric_name` and its numeric `metric_value` for the parent report output.
   *
   * Security and organization scoping: report viewing authority must be validated for the currently selected organization context before any metric rows are modified. All updates must be restricted to the organization that owns the report output (through the report generation run and its associated report definition), preventing cross-organization data leakage.
   *
   * Uniqueness and data model constraints: for a given report output row, `metric_name` is unique (the schema defines a composite unique on `[erp_hrm_time_tracking_report_output_id, metric_name]`). Therefore, when the request includes a metric entry with an existing `metric_name`, the operation updates the corresponding `metric_value`. When the request includes a new `metric_name` not yet present for the target report output, the operation creates a new metric line.
   *
   * Deletion / removal behavior: the metric lines table supports `deleted_at`. If the request marks a metric entry for removal, the implementation should set `deleted_at` on the corresponding metric line (rather than removing it in a way that would break auditability), so that metric history remains traceable.
   *
   * Validation and error handling: if the provided `reportOutputId` does not exist (or is not visible for the selected organization context), the operation must reject the request with a business-appropriate error without leaking other organizations’ data. If any metric value fails validation, or if any rule prevents completion, the operation must be rejected without applying partial updates, and should provide a clear human-readable reason.
   *
   * Related operations: report outputs are created/generated via the report generation workflow (persisted in `erp_hrm_time_tracking_report_generation_runs` and `erp_hrm_time_tracking_report_outputs`). Metric breakdown lines are read naturally together with their parent report output; this endpoint focuses on updating the metric rows under `erp_hrm_time_tracking_report_output_metrics` for the provided `reportOutputId`.
   *
   * @param connection
   * @param reportOutputId Target report output row identifier whose metric breakdown lines are being updated.
   * @param body Bulk metric update request. Each item identifies a metric by `metric_name` and provides the new `metric_value`, or instructs the operation to remove (mark as deleted) that metric line for the target report output.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification 1) Authorization & scoping - Resolve the
     *   organization context from the authenticated member/session and ensure
     *   the caller has `report:view` permission for the selected organization.
     *   - Load `erp_hrm_time_tracking_report_outputs` by `id = reportOutputId`.
     *   - Verify the report output belongs to the selected organization (join
     *   via
     *   `reportGenerationRun.reportDefinition.erp_hrm_time_tracking_organization_id`).
     *   If not found/visible, reject.
   *
   * 2) Request validation
   * - Parse request body containing a list of metric changes keyed by `metric_name`.
   * - Ensure `metric_name` values are non-empty strings and that no duplicates exist within the request payload for the same `metric_name` (deduplicate or reject; prefer reject to avoid ambiguity).
   * - Ensure each `metric_value` is a finite float number as represented by the DTO.
   *
   * 3) Transactional update
   * - Begin a DB transaction.
   * - Fetch existing metric rows for the target report output where `deleted_at` is null (optionally also consider deleted rows depending on business rules; default to: treat deleted rows as absent and allow re-create or re-activate).
   * - For each requested metric:
   *   a) If `remove`/`isDeleted` flag is true (or equivalent removal instruction from DTO):
   *      - If an existing non-deleted row exists, set `deleted_at = now()`.
   *      - If not exists, do nothing (idempotent removal) unless DTO requires strict existence.
   *   b) Else (upsert):
   *      - If row exists: update `metric_value` and `updated_at`.
   *      - If not exists: create new `erp_hrm_time_tracking_report_output_metrics` row with `metric_name`, `metric_value`, `erp_hrm_time_tracking_report_output_id`, and timestamps.
   * - If DTO supports reactivation of deleted rows, set `deleted_at = null` and update `metric_value` instead of creating.
   *
   * 4) Consistency
   * - Because schema enforces uniqueness on `(report_output_id, metric_name)`, rely on upsert/update flow to avoid conflicts. If a concurrent writer causes a unique constraint violation, treat as an unexpected internal failure and reject.
   *
   * 5) Response
   * - Return the resulting metric list/summaries for this report output: include each affected metric with its latest `metric_name` and `metric_value` (and optionally include id if present in DTO summary type).
   *
   * 6) Error handling
   * - Any failure during the transaction must roll back all changes (no partial updates).
   * - Do not leak other organization data by returning existence hints; use consistent rejection messages.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async updateMetrics(
    @TypedParam("reportOutputId")
    reportOutputId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimeTrackingReportOutputMetric.IRequest,
  ): Promise<IErpHrmTimeTrackingReportOutputMetric.ISummary> {
    try {
      return await patchErpHrmTimeTrackingReportOutputsReportOutputIdMetrics({
        reportOutputId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
