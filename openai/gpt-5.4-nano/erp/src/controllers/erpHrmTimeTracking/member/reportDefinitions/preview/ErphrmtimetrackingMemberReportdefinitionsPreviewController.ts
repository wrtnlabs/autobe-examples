import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IErpHrmTimeTrackingReportDefinition } from "../../../../../api/structures/IErpHrmTimeTrackingReportDefinition";
import { IErpHrmTimeTrackingReportOutput } from "../../../../../api/structures/IErpHrmTimeTrackingReportOutput";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { patchErpHrmTimeTrackingMemberReportDefinitionsPreview } from "../../../../../providers/patchErpHrmTimeTrackingMemberReportDefinitionsPreview";

@Controller("/erpHrmTimeTracking/member/reportDefinitions/preview")
export class ErphrmtimetrackingMemberReportdefinitionsPreviewController {
  /**
   * Preview a generated time-tracking report using an existing report definition and client-provided preview parameters.
   *
   * This operation is intended for UI/report-building flows where a member can validate that the selected report definition (and its configured dimensions/filters) produces the expected grouped output shape before committing to any persisted generation workflow.
   *
   * The report preview results are computed in memory with the same grouping and metric normalization rules represented in the persisted report outputs model. In the database, report outputs are represented by `erp_hrm_time_tracking_report_outputs` (grouped rows with `employee_id`, `project_id`, optional `task_id`, and optional `week_start_date_id`), and their metric breakdown lines are represented by `erp_hrm_time_tracking_report_output_metrics` (`metric_name` + `metric_value`). The preview response mirrors these structures so the client can render a consistent report table.
   *
   * Security and tenant isolation are enforced by scoping all preview inputs/outputs to the selected organization context. If organization context is missing, the system must block the report request with a business validation message indicating that an organization context must be selected before accessing reports. When the selected organization has no employees and/or no matching timelogs for the requested filters/date range, the operation must still complete successfully and return an empty result set (no crashes or unhandled errors).
   *
   * Validation rules must ensure the targeted report definition is valid for the organization and that any preview parameters used for filtering are applied consistently with the report definition configuration stored in `erp_hrm_time_tracking_report_definition_filters` and grouping configuration in `erp_hrm_time_tracking_report_definition_dimensions`. Any invalid parameters (unknown filter keys/operators, invalid values) should be rejected as a business validation error and must not produce misleading partial preview output.
   *
   * Related operations:
   * - The persisted generation workflow (report definition runs and outputs) is represented by `erp_hrm_time_tracking_report_generation_runs` and `erp_hrm_time_tracking_report_outputs`; this preview endpoint is the non-persisting equivalent for immediate UI feedback.
   * - Report generation run history can be viewed through report-related read endpoints (not part of this operation).
   *
   * Error handling expectations:
   * - Missing organization context → block with a validation message.
   * - No employees or no matching timelogs → return empty preview output successfully.
   * - Invalid report definition or invalid preview parameters → return an error response explaining the validation issue.
   *
   * @param connection
   * @param body Preview request for generating an in-memory report output using a report definition and preview/filter parameters.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement a report preview flow that resolves a
     *   report definition and computes grouped preview outputs without
     *   necessarily creating persisted report_generation_runs.
   *
   * Algorithm:
   * 1) Read organization context from the authenticated member/session.
   * 2) Validate that organization context exists; if missing, throw a business validation error (matches report error scenario).
   * 3) Parse request body to identify the target report definition (prefer `code` within `erp_hrm_time_tracking_report_definitions` because it is stored as a stable unique code per organization) and preview parameters (date range and any filter values aligned with configured filter definitions).
   * 4) Load `erp_hrm_time_tracking_report_definitions` by (organization_id from context + code), and ensure it is not soft-deleted (deleted_at is null) and is active if required by business rules.
   * 5) Load the report definition configuration:
   *    - `erp_hrm_time_tracking_report_definition_dimensions` rows for ordering and dimension keys (ignore soft-deleted rows where deleted_at is not null).
   *    - `erp_hrm_time_tracking_report_definition_filters` rows to understand which field_key/operator/value_text/value_text_2 are enabled and how to interpret preview inputs.
   * 6) Build an in-memory evaluation plan:
   *    - Determine the grouping keys for preview rows using dimensions (employee/project/task/week where configured).
   *    - Determine filtering predicates from enabled definition filters and overlay/override them with the preview request’s provided values.
   *    - Apply project status rules when the definition/preview implies timelog association: only active projects allow new timelogs association during creation workflows; for preview aggregation, ensure timelogs are fetched based on stored timelogs and the requested date filters.
   * 7) Query source timelog data needed for report outputs. Source of truth for time entries is `erp_hrm_time_tracking_timelogs` joined to `erp_hrm_time_tracking_projects`, `erp_hrm_time_tracking_members`, and optional `erp_hrm_time_tracking_tasks`.
   * 8) Aggregate results into grouped rows matching `erp_hrm_time_tracking_report_outputs` shape:
   *    - For each group, produce employee_id, project_id, optional task_id, optional week_start_date_id token (derived from week dimension rules).
   *    - Produce grouping_sort_key deterministically so the response order matches persisted output ordering expectations.
   * 9) Produce metric lines in the same normalized way as `erp_hrm_time_tracking_report_output_metrics`:
   *    - For each metric configured by the report_type/dimensions, compute metric_name and metric_value (Float).
   * 10) If no matching employees/timelogs are found, return an empty dataset successfully (no error).
   * 11) Do not write to `erp_hrm_time_tracking_report_generation_runs` or `erp_hrm_time_tracking_report_outputs`; return only the preview payload.
   *
   * Transactions:
   * - Use a read-only transaction for all database reads.
   *
   * Edge cases:
   * - Unknown report definition code for the org → validation error.
   * - Preview parameter values that cannot be parsed according to the filter operator → validation error.
   * - Soft-deleted definitions/filters/dimensions should be ignored.
   *
   * Authorization:
   * - Apply organization-scoped authorization: enforce that the preview is only computed from data belonging to the selected organization context.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async previewReportDefinitions(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmTimeTrackingReportDefinition.IRequest,
  ): Promise<IErpHrmTimeTrackingReportOutput.ISummary> {
    try {
      return await patchErpHrmTimeTrackingMemberReportDefinitionsPreview({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
