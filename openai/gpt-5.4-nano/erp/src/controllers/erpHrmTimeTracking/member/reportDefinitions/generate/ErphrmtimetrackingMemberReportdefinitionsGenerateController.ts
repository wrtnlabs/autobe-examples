import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IErpHrmTimeTrackingReportDefinition } from "../../../../../api/structures/IErpHrmTimeTrackingReportDefinition";
import { IErpHrmTimeTrackingReportGenerationRun } from "../../../../../api/structures/IErpHrmTimeTrackingReportGenerationRun";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { postErpHrmTimeTrackingMemberReportDefinitionsGenerate } from "../../../../../providers/postErpHrmTimeTrackingMemberReportDefinitionsGenerate";

@Controller("/erpHrmTimeTracking/member/reportDefinitions/generate")
export class ErphrmtimetrackingMemberReportdefinitionsGenerateController {
  /**
   * Generate report results for a specific persisted time-tracking report definition.
   *
   * This endpoint creates a new report generation run for the chosen report definition, applies the report’s configured dimensions and filter rules to the requested date range, and returns the computed report output rows needed for the client to render the results. The reporting computation is scoped to the currently selected organization context, and the system must not create, modify, or prevent creation of timelogs/timesheets as a side effect of viewing or generating report results.
   *
   * Authorization and organization-context requirements follow the report viewing flow: if there is no active organization context selected, the system must block the request with a business validation message; if the caller lacks `report:view` permission for the selected organization, access must be denied. When an organization context is present, all inputs and outputs are restricted to that organization only.
   *
   * The requested report configuration must be treated as a single report-type selection. If the provided configuration is invalid for that report type (for example, grouping/filter selections that conflict with that report type’s capabilities), the request must be rejected as invalid rather than silently ignored. If there are no matching records (no timelogs/employees match the date range and filters), the operation must return an empty report result set successfully.
   *
   * Internally, this operation persists a generation run record for traceability, then persists output rows and any per-output metric/breakdown rows produced by the report definition.
   *
   * Related behavior: report requests should be computed only after organization context is selected, and report generation must validate the requested date range for meaningful aggregation; invalid or nonsensical ranges must be rejected with a business validation message or result in an empty report set consistently with the system’s report generation handling.
   *
   * @param connection
   * @param body Parameters for generating a time-tracking report from a specific persisted report definition, including the requested date range and any report-type-specific grouping and filter selections.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Create a new report generation run and compute
     *   outputs.
   *
   * 1) Validate organization context and authorization
   * - Resolve the organization tenant context from the authenticated member session.
   * - If organization context is missing, reject with a business validation message.
   * - Verify report:view permission for the selected organization.
   *
   * 2) Resolve report definition
   * - Identify the target report definition using the provided report definition identifier/code.
   * - Ensure the report definition belongs to the selected organization.
   * - Reject if the definition is deleted/inactive when such constraints are enforced in downstream validation.
   *
   * 3) Validate report configuration against report_type capabilities
   * - Apply report-specific rules for date range selection and report-specific grouping/filter selections.
   * - Reject invalid combinations of grouping/filter options that conflict with the report_type capabilities (do not ignore).
   *
   * 4) Create generation run (audit/traceability)
   * - Insert a record into erp_hrm_time_tracking_report_generation_runs with:
   *   - report_definition_id
   *   - status = "pending" (or equivalent status string defined in implementation)
   *   - parameters_summary = canonical summary string derived from the request inputs
   *   - started_at = now
   *
   * 5) Compute outputs
   * - Using the report definition’s configured dimensions and filters (erp_hrm_time_tracking_report_definition_dimensions and erp_hrm_time_tracking_report_definition_filters), compute grouped outputs for the requested date range.
   * - Persist each grouped row into erp_hrm_time_tracking_report_outputs, setting:
   *   - report_generation_run_id
   *   - employee_id / project_id / optional task_id
   *   - optional week_start_date_id when week dimension is used
   *   - grouping_sort_key for deterministic ordering/deduplication
   *   - notes when applicable
   * - For each output row, persist metric_name/metric_value pairs into erp_hrm_time_tracking_report_output_metrics.
   *
   * 6) Empty results handling
   * - If no matching employees/timelogs exist for the requested filters/date range, persist zero outputs and return an empty result set.
   *
   * 7) Finalize generation run
   * - Update erp_hrm_time_tracking_report_generation_runs status to "succeeded" on success, and set finished_at.
   * - On any failure, set status to "failed" (or equivalent), store error_message, and set finished_at.
   *
   * 8) Return response
   * - Return the generation run and the computed outputs needed by the client to render results.
   *
   * Data access constraints
   * - All queries for definitions, runs, and outputs must be scoped to the selected organization via erp_hrm_time_tracking_report_definitions.erp_hrm_time_tracking_organization_id.
   * - Must not modify timelog/timesheet data during report computation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async generateReport(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmTimeTrackingReportDefinition,
  ): Promise<IErpHrmTimeTrackingReportGenerationRun> {
    try {
      return await postErpHrmTimeTrackingMemberReportDefinitionsGenerate({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
