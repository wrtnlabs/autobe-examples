import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingReportSnapshot } from "../../../../../api/structures/IHrmTimeTrackingReportSnapshot";
import { ManagerAuth } from "../../../../../decorators/ManagerAuth";
import { ManagerPayload } from "../../../../../decorators/payload/ManagerPayload";
import { postHrmTimeTrackingManagerReportsReportIdExecutions } from "../../../../../providers/postHrmTimeTrackingManagerReportsReportIdExecutions";

@Controller("/hrmTimeTracking/manager/reports/:reportId/executions")
export class HrmtimetrackingManagerReportsExecutionsController {
  /**
   * Create a new execution of an existing saved report definition and persist the generated result as a report snapshot.
   *
   * This operation runs a saved organization-scoped report definition from hrm_time_tracking_reports and produces a new historical artifact in hrm_time_tracking_report_snapshots. The parent report stores the stable analytical configuration for the organization, including the report family, optional reporting range, grouping mode, and billable filtering flags. The created execution represents a point-in-time generated output, preserving the covered reporting period, output format, output location, and generation timestamp so previously produced report results remain reproducible even when underlying employees, projects, tasks, timelogs, or timesheets later change.
   *
   * Access to this operation is restricted by organization-scoped report viewing permission. The caller must have permission to view reports in the currently selected organization, and the target report must belong to that same organization. Permission evaluation must use only the caller's role assignments in the active organization context. If the caller lacks report viewing permission, or if the referenced report belongs to another organization, the system must deny execution and must not reveal report data, filters, or generated output metadata from any other organization.
   *
   * The operation is intended for the organization-level reporting functions defined for the platform, including the Time Report, Project Budget Report, and Weekly Summary Report. Execution uses the saved report definition as the baseline and may apply execution-specific options supplied in the request body, such as export format or period boundaries when allowed by the implementation rules. The generated result is stored as a snapshot record rather than overwriting prior outputs, which preserves report history and supports later retrieval of previously generated artifacts.
   *
   * This operation depends on the report definition already existing. In practice, clients should first obtain or create the saved report definition before requesting an execution for that report. After execution succeeds, clients may use the returned snapshot metadata to display generation status, covered period, row count, and artifact location information. Report refresh events for the current organization may then be delivered only to users who are authorized to view reports in that organization.
   *
   * If report generation requires external storage or export services, the system must treat those dependencies as part of the execution contract. When such a dependency fails, the system must reject the execution instead of presenting it as completed, must avoid creating misleading historical records that imply successful generation, and must keep any failure strictly scoped to the caller's current organization context. Degraded behavior should favor temporary unavailability over inaccurate or cross-organization reporting results.
   *
   * @param connection
   * @param reportId Target saved report ID
   * @param body Execution options for generating a report snapshot
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor manager
     * @x-autobe-specification 1. Authenticate the caller and resolve the
     *   currently selected organization context. 2. Authorize the operation by
     *   verifying that the caller has report viewing permission in the current
     *   organization. Do not evaluate permissions from any other organization
     *   membership. 3. Load the parent hrm_time_tracking_reports record by id =
     *   reportId and deleted_at IS NULL. Reject the request if the report does
     *   not exist. 4. Verify that
     *   hrm_time_tracking_reports.hrm_time_tracking_organization_id matches the
     *   caller's current organization context. If it does not match, reject the
     *   request as an organization-scope access violation. 5. Validate that the
     *   report_type corresponds to one of the supported organization reporting
     *   functions: time_report, project_budget_report, or
     *   weekly_summary_report. If the stored type is unsupported for execution,
     *   reject the request. 6. Resolve execution inputs by combining the saved
     *   report definition with the request body. Determine output_format and
     *   the effective period_start and period_end. If the request body omits
     *   optional execution overrides, use range_start_date and range_end_date
     *   from the saved report definition when present. Validate that the
     *   effective period is coherent and that start is not after end. 7. Load
     *   the saved filter configuration associated with the report from
     *   hrm_time_tracking_report_employee_filters,
     *   hrm_time_tracking_report_project_filters, and
     *   hrm_time_tracking_report_task_filters as needed by the report type.
     *   Exclude child filter rows marked deleted when applicable. 8. Build the
     *   report query strictly against records that belong to the same
     *   organization as the parent report. Use the saved grouping mode and
     *   billable flags from hrm_time_tracking_reports. Never mix data from
     *   another organization. 9. Generate the export artifact in the requested
     *   output_format. If an external export or storage dependency is required,
     *   call it within the execution flow and treat any failure as a full
     *   operation failure. 10. Persist a new hrm_time_tracking_report_snapshots
     *   record with a new UUID id, hrm_time_tracking_report_id, output_uri,
     *   output_format, period_start, period_end, row_count when available,
     *   generated_at, created_at, and updated_at. Do not modify existing
     *   snapshots because the snapshot store is append-oriented. 11. Return the
     *   created snapshot record as the successful response. 12. Error handling:
     *   return not found when the report does not exist in the current
     *   organization scope; forbidden when the caller lacks report viewing
     *   permission; validation failure for invalid period or unsupported
     *   execution options; failure when export or storage integration does not
     *   complete successfully. On dependency failure, do not create a
     *   misleading snapshot row and do not partially succeed.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @ManagerAuth()
    manager: ManagerPayload,
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingReportSnapshot.ICreate,
  ): Promise<IHrmTimeTrackingReportSnapshot> {
    try {
      return await postHrmTimeTrackingManagerReportsReportIdExecutions({
        manager,
        reportId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
