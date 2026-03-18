import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingTimesheet } from "../../../../../api/structures/IErpHrmTimeTrackingTimesheet";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { postErpHrmTimeTrackingMemberTimesheetsTimesheetIdApprove } from "../../../../../providers/postErpHrmTimeTrackingMemberTimesheetsTimesheetIdApprove";

@Controller("/erpHrmTimeTracking/member/timesheets/:timesheetId/approve")
export class ErphrmtimetrackingMemberTimesheetsApproveController {
  /**
   * Approve a submitted timesheet for review within the currently selected organization context.
   *
   * This endpoint transitions a single timesheet ({@link erp_hrm_time_tracking_timesheets}) from the business workflow into an approved state. The requirements specify that approval is only allowed when the timesheet workflow status is `submitted`; attempting to approve while the timesheet is in any other state must be rejected and must leave the timesheet state unchanged.
   *
   * Security and authorization are enforced using role-permission capability `time:approve` scoped to the selected organization. When the authenticated member lacks the `time:approve` permission in the selected organization, this operation must prevent the approval action.
   *
   * After a successful approval, the system must apply the approved-lock behavior to all timelogs that are included in that approved timesheet ({@link erp_hrm_time_tracking_timelogs}). This ensures those timelogs cannot be edited or deleted while the approved workflow is in effect.
   *
   * The system must record review outcome information (who reviewed and that the outcome was approved) as part of its activity/audit trail using the organization-scoped audit table ({@link erp_hrm_time_tracking_activity_log_entries}). If an unexpected internal failure occurs while approving, the system must reject the operation and must leave the timesheet status unchanged.
   *
   * Related operations you may call together with this one include:
   * - `GET`/list operations to view timesheets and their current status before submitting an approval.
   * - The corresponding rejection endpoint to return a submitted timesheet back to draft, including requirement for a rejection reason.
   *
   * Expected behavior and error handling:
   * - If the timesheet id does not belong to the selected organization context, the system must reject access and must not reveal details about timesheets from other organizations.
   * - If the timesheet is not in `submitted` status, the system must reject the request as invalid without changing status timestamps.
   * - On success, response returns the updated timesheet resource reflecting the approved state and its approval timestamp.
   *
   * @param connection
   * @param timesheetId Target timesheet identifier to approve. The timesheet must belong to the currently selected organization context.
   * @param body Approval request payload. Includes any optional approval metadata required by the system (e.g., reviewer notes) used for audit details.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps for Realize Agent:
   *
   * 1) Input handling
   * - Read `timesheetId` from path.
   * - Parse request body as `IerpHrmTimeTrackingTimesheet.IApprove` (request DTO type).
   *
   * 2) Authorization and tenancy checks
   * - Identify the authenticated member performing the request and the currently selected organization context.
   * - Verify the member has `time:approve` capability in that selected organization.
   * - Enforce organization isolation: ensure the target timesheet belongs to the selected organization via `erp_hrm_time_tracking_timesheets.erp_hrm_time_tracking_organization_id`.
   * - If either permission check fails or organization isolation fails, reject the request.
   *
   * 3) Load and validate current workflow state
   * - Fetch the timesheet record by `id` from `erp_hrm_time_tracking_timesheets`.
   * - Verify `status` equals `submitted`.
   * - If not `submitted`, reject and leave the record unchanged.
   *
   * 4) Apply approval state transition (transaction)
   * - Start a database transaction.
   * - Update `erp_hrm_time_tracking_timesheets`:
   *   - Set `status` to `approved`.
   *   - Set `approved_at` to current timestamp.
   *   - (Do not modify `submitted_at` unless the schema/DTO requires; keep existing submitted timestamp.)
   *   - Ensure `rejected_at` remains unchanged.
   * - Lock included timelogs to enforce approved-lock behavior:
   *   - Identify timelogs included in the timesheet via `erp_hrm_time_tracking_timelogs.erp_hrm_time_tracking_timesheet_id` = timesheet.id.
   *   - Enforce lock behavior according to the lock model: create or update records in `erp_hrm_time_tracking_timesheet_versioning_locks` for the timesheet where needed so that editing/deleting timelogs is prevented.
   *   - If the system already has active versioning locks, ensure approval still succeeds without violating lock ownership semantics; release/update locks according to the business rules implemented in the service layer.
   *
   * 5) Activity/audit record
   * - Insert an `erp_hrm_time_tracking_activity_log_entries` row:
   *   - `organization_id` = timesheet.organization_id
   *   - `performed_by_member_id` = authenticated member id
   *   - `action_type` = approval action key (use service taxonomy mapping)
   *   - `target_entity_type` and `target_entity_id` for the timesheet
   *   - `summary` = short human-readable approval summary
   *   - `details` = optionally include request body metadata
   *   - `occurred_at` = now
   *
   * 6) Error handling
   * - If any step fails unexpectedly, roll back the transaction and ensure the timesheet status remains unchanged.
   *
   * 7) Return
   * - Return the updated `erp_hrm_time_tracking_timesheets` resource mapped to the response DTO.
   *
   * Notes on concurrency
   * - Use the transaction to prevent race conditions between concurrent approval attempts and timelog modification attempts. Ensure the lock enforcement step is performed atomically with the timesheet status transition.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async approveTimesheet(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimeTrackingTimesheet.IApprove,
  ): Promise<IErpHrmTimeTrackingTimesheet> {
    try {
      return await postErpHrmTimeTrackingMemberTimesheetsTimesheetIdApprove({
        member,
        timesheetId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
