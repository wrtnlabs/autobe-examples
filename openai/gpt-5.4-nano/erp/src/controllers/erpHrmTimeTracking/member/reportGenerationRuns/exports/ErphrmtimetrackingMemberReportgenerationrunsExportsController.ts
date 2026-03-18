import { TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingReportOutput } from "../../../../../api/structures/IErpHrmTimeTrackingReportOutput";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { postErpHrmTimeTrackingMemberReportGenerationRunsReportGenerationRunIdExports } from "../../../../../providers/postErpHrmTimeTrackingMemberReportGenerationRunsReportGenerationRunIdExports";

@Controller(
  "/erpHrmTimeTracking/member/reportGenerationRuns/:reportGenerationRunId/exports",
)
export class ErphrmtimetrackingMemberReportgenerationrunsExportsController {
  /**
   * Generate downloadable export artifacts for a specific report generation run.
   *
   * This endpoint targets a single report generation run identified by the `{reportGenerationRunId}` path parameter. The operation uses the generation run metadata stored in `erp_hrm_time_tracking_report_generation_runs` (such as `status` and `parameters_summary`) to decide whether export generation can proceed and to preserve traceability about which parameters produced the outputs.
   *
   * The actual export content is derived from the persisted report outputs in `erp_hrm_time_tracking_report_outputs`. When the report definition produces metric breakdowns, the export generator must also read the corresponding normalized metric lines from `erp_hrm_time_tracking_report_output_metrics` and include them in the export output in a deterministic way.
   *
   * Authorization and organization context:
   *
   * This is an organization-scoped operation. The system must enforce that the report generation run and its underlying report definition belong to the currently selected organization context; if organization context is missing, the request must be blocked with a business validation message requiring organization selection. If the user does not have the required `report:view` permission for the selected organization, the request must be denied.
   *
   * Validation and state handling:
   *
   * If the targeted report generation run is not in a successful state (i.e., the stored `status` indicates failure or it is still pending/running), the system must reject export creation because exporting incomplete or failed runs would produce misleading results.
   *
   * If the run succeeded but its persisted outputs contain zero rows, the operation must still complete successfully and return an empty export result set rather than failing (the system should not crash or return an unhandled error when there are no matching timelogs/data for the requested filters).
   *
   * Security and auditability considerations:
   *
   * Export generation must not expose data outside the selected organization. The operation must derive export content only from outputs associated with this run (`erp_hrm_time_tracking_report_outputs.report_generation_run_id`) and must not query unrelated runs.
   *
   * Related operations:
   *
   * - A client should generate a report first (creating the generation run and its outputs), then call this endpoint to create export artifacts for that existing run.
   * - If the client needs run details and output row data for display instead of download, it should call the corresponding report/output viewing operations (not part of this endpoint).
   *
   * @param connection
   * @param reportGenerationRunId Target report generation run identifier whose persisted outputs will be exported.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1) Extract `reportGenerationRunId` from the path.
   *
   * 2) Organization scoping & authorization:
   *    - Resolve the selected organization context for the authenticated member.
   *    - Query `erp_hrm_time_tracking_report_generation_runs` by `id = reportGenerationRunId`.
   *    - Join/resolve to `erp_hrm_time_tracking_report_definitions` (via `erp_hrm_time_tracking_report_generation_runs.erp_hrm_time_tracking_report_definition_id`) to determine `erp_hrm_time_tracking_report_definitions.erp_hrm_time_tracking_organization_id`.
   *    - If no run exists, return a not-found business error.
   *    - If organization context is missing, block with the organization-selection business validation message.
   *    - If the run's organization does not match the selected organization context, deny the operation.
   *    - Enforce `report:view` permission for the selected organization.
   *
   * 3) Run state validation:
   *    - Read `erp_hrm_time_tracking_report_generation_runs.status`.
   *    - Allow export generation only when the status represents success (exact allowed success values must be aligned with the service's status semantics; if status is not successful, reject export creation).
   *
   * 4) Data retrieval for export:
   *    - Fetch all non-deleted `erp_hrm_time_tracking_report_outputs` rows for `report_generation_run_id`.
   *    - For each output row, fetch corresponding `erp_hrm_time_tracking_report_output_metrics` rows where `deleted_at` is null (if the report definition requires metric lines).
   *    - Ensure deterministic ordering using `grouping_sort_key` (from `erp_hrm_time_tracking_report_outputs`) and, within metrics, stable ordering by `metric_name`.
   *
   * 5) Empty output handling:
   *    - If there are zero output rows, still generate an export artifact representing an empty dataset (e.g., with headers/metadata if the export format requires it) and return success.
   *
   * 6) Export artifact creation:
   *    - Create a new export artifact record in the export storage mechanism used by the service (exact table/schema not specified in loaded models; implement using the project’s standard file/storage approach).
   *    - Populate artifact metadata linking it to `report_generation_run_id` and persisting the generated URI.
   *
   * 7) Response:
   *    - Return the artifact URI (string) and any identifying metadata required by `IReportExport` DTO.
   *
   * 8) Error handling:
   *    - Handle database errors with a generic internal error.
   *    - If export generation fails after partially generating artifacts, ensure no misleading success response is returned; surface a business/infrastructure error message.
   *
   * Note:
   * - Do not assume additional request parameters (such as export format selection) because request-body DTOs and fields were not loaded from the schema set in this context.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async createExports(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("reportGenerationRunId")
    reportGenerationRunId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmTimeTrackingReportOutput> {
    try {
      return await postErpHrmTimeTrackingMemberReportGenerationRunsReportGenerationRunIdExports(
        {
          member,
          reportGenerationRunId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
