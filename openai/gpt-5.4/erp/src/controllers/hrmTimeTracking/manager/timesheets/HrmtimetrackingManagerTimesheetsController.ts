import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingTimesheet } from "../../../../api/structures/IHrmTimeTrackingTimesheet";
import { ManagerAuth } from "../../../../decorators/ManagerAuth";
import { ManagerPayload } from "../../../../decorators/payload/ManagerPayload";
import { postHrmTimeTrackingManagerTimesheetsTimesheetIdApprove } from "../../../../providers/postHrmTimeTrackingManagerTimesheetsTimesheetIdApprove";
import { postHrmTimeTrackingManagerTimesheetsTimesheetIdReject } from "../../../../providers/postHrmTimeTrackingManagerTimesheetsTimesheetIdReject";

@Controller("/hrmTimeTracking/manager/timesheets/:timesheetId")
export class HrmtimetrackingManagerTimesheetsController {
  /**
   * Approve a submitted weekly timesheet and finalize its included work records.
   *
   * This operation executes the approval decision for a single timesheet in the HRM time tracking workflow. The underlying timesheet entity is described in the requirements as a weekly record owned by an organization employee for a Monday-to-Sunday reporting period, and the approval flow requires the system to preserve the employee, week, included timelogs, and calculated total hours as the approved weekly record. When this endpoint succeeds, the target timesheet transitions from submitted to approved, the review decision is finalized, and the approved record becomes immediately visible to the timesheet owner and to authorized reviewers in the same organization context.
   *
   * Security for this operation is organization-scoped. Only actors who can approve timesheets in the currently selected organization may execute it. In practice this means organization owners and managers who hold the relevant approval authority in that organization context. Access must be evaluated using the current organization only, consistent with the requirement that permissions from one organization must not grant access in another organization. If the caller lacks approval authority for the timesheet's organization, the request must be denied even if the same user has broader permissions elsewhere.
   *
   * This operation is implemented against the timesheet aggregate and its included timelog records. The timesheet stores the weekly status and review metadata, while the inclusion set is represented through the explicit timesheet-to-timelog association and the underlying timelog records. The business rules require total hours to be calculated from the timelogs included in the timesheet and retained for the submitted set of included timelogs. On approval, the system must record the review decision time as reviewed at and the reviewing user as reviewed by. The operation must then lock every timelog included in the approved timesheet against further employee editing and deletion so that the approved weekly record remains preserved.
   *
   * Validation is state-sensitive. The target timesheet must exist, belong to the current organization context, and be in submitted status at the moment of review. Approving a draft, already approved, or otherwise non-submitted timesheet must fail because review decisions are only allowed while the timesheet is in submitted status. The implementation should also guarantee that review audit fields are written only as part of a valid approval decision, matching the rule that reviewed at and reviewed by are not recorded before approval or rejection.
   *
   * This endpoint is commonly used after list and detail retrieval operations for approval worklists. Clients will typically obtain submitted timesheets from the organization's timesheet list or load one specific timesheet for review before calling this approval action. After successful approval, clients may continue using the timesheet detail operation or list operation to reflect the updated approved state in dashboards, employee self-view, and reviewer queues. If the approval cannot be completed because the resource is missing, outside the caller's organization, or in an invalid status, the operation must return an appropriate error without partially updating either the timesheet or its included timelogs.
   *
   * @param connection
   * @param timesheetId Target timesheet's unique identifier
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor manager
     * @x-autobe-specification Implement an application service action that
     *   approves one submitted timesheet by its identifier within the caller's
     *   current organization context.
   *
   * 1. Authenticate the caller and resolve the current organization context.
   * 2. Authorize the caller against organization-scoped timesheet approval permission. Owners are allowed by default according to their administrative role; managers require the relevant permission in the current organization. Deny access when the caller's permission exists only in another organization.
   * 3. Load the target row from hrm_time_tracking_timesheets by timesheetId and verify that it belongs to the current organization. Also load the owning employee, all included association rows from hrm_time_tracking_timesheet_timelogs, and the referenced hrm_time_tracking_timelogs needed for total-hours verification and lock updates.
   * 4. Validate business preconditions:
   *    - the timesheet exists;
   *    - it is in submitted status;
   *    - it belongs to the current organization;
   *    - its included timelog set is available and internally consistent.
   *    If any precondition fails, abort with an error and do not write review metadata or timelog lock changes.
   * 5. Start a database transaction.
   * 6. Recalculate or verify the total hours from the currently included timelogs to ensure the approved record reflects the included set. Persist the retained total on the hrm_time_tracking_timesheets row if recalculation is part of approval finalization.
   * 7. Update the hrm_time_tracking_timesheets row to:
   *    - set status to approved;
   *    - set reviewed_at to the current timestamp;
   *    - set reviewed_by to the authenticated reviewing user/account reference defined by the schema;
   *    - preserve or confirm the calculated total hours for the approved set.
   * 8. Update every included row in hrm_time_tracking_timelogs so those timelogs become locked against employee editing and deletion while they remain included in this approved timesheet. Use the actual lock-related schema fields exactly as defined in the database model.
   * 9. Commit the transaction only if both the timesheet status/audit update and all related timelog lock updates succeed. Roll back the entire transaction on any failure so the system never leaves an approved timesheet with partially locked timelogs or recorded review metadata without status change.
   * 10. Return the refreshed detailed timesheet aggregate, including owner context, approved status, calculated totals, review audit fields, and included timelogs as represented by the response DTO.
   *
   * Error handling:
   * - Return not found when the timesheet does not exist in the current organization scope.
   * - Return forbidden when the caller lacks approval authority in the current organization.
   * - Return conflict or validation failure when the timesheet is not in submitted status.
   * - Return an internal error when transactional updates fail unexpectedly.
   *
   * Concurrency guidance:
   * - Protect against double approval by using transactional state checking in the update statement or equivalent row locking so only one reviewer can approve a submitted timesheet once.
   * - If another review decision changes the status before commit, fail the operation as an invalid state transition.
   *
   * Related behavior:
   * - This approval action complements list/detail retrieval for reviewer work queues and should be kept separate from rejection, which requires a rejection reason and returns the timesheet to draft.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("approve")
  public async approve(
    @ManagerAuth()
    manager: ManagerPayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingTimesheet> {
    try {
      return await postHrmTimeTrackingManagerTimesheetsTimesheetIdApprove({
        manager,
        timesheetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Reject a submitted timesheet and return it to editable draft state.
   *
   * This operation applies a review outcome to one weekly timesheet record stored in `hrm_time_tracking_timesheets`, the organization-scoped entity that holds the reporting week boundaries, workflow status, submission timestamp, review timestamp, and optional `rejection_reason`. It is used when an authorized reviewer determines that a submitted timesheet cannot be approved in its current form. On success, the system records the rejection reason, updates the review metadata, and changes the workflow status from `submitted` back to `draft` so the owning employee can correct the weekly record and resubmit it through the normal approval flow.
   *
   * Access to this operation is organization-scoped. The acting user must have timesheet approval authority in the currently selected organization context, and the target timesheet must belong to that same organization. Permissions from another organization must have no effect on this action. Employees may later see the outcome and reason on their own returned draft, but they are not the reviewers for this endpoint. The operation is intended for owner or manager actors when their role in the active organization grants review capability.
   *
   * The underlying timesheet schema explicitly defines `status`, `reviewed_at`, and `rejection_reason`, and the business rules require that a rejection reason be present for rejected review outcomes. The operation must therefore reject requests with an empty or missing reason, and it must reject attempts to review a timesheet that is not currently in `submitted` status. The system should preserve the relationship between the timesheet and its normalized included timelogs in `hrm_time_tracking_timesheet_timelogs`; rejection changes workflow state only and does not itself add or remove included timelog records.
   *
   * This endpoint is typically used after the submitted review queue has been obtained elsewhere in the application and a reviewer opens a specific weekly timesheet for inspection. After this operation succeeds, the owning employee should immediately see both the rejection reason and the restored draft state, and authorized reviewers in the same organization should immediately see the updated outcome reflected in review views. If the action cannot be completed because of status mismatch, permission failure, tenant mismatch, or an unconfirmed failure during downstream processing, the system must return a clear failure result and must not present the review as completed when the business outcome is unknown.
   *
   * @param connection
   * @param timesheetId Target timesheet's ID
   * @param body Rejection reason for the submitted timesheet
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor manager
     * @x-autobe-specification Validate that the caller is authenticated in a
     *   currently selected organization context and has permission to approve
     *   or reject timesheets in that organization. Resolve the target
     *   `hrm_time_tracking_timesheets` row by `id = :timesheetId` and ensure
     *   `deleted_at IS NULL`. Reject the request if the timesheet does not
     *   exist, belongs to a different organization than the active context, or
     *   the caller lacks review permission in that organization.
   *
   * Validate the request body and require a non-empty rejection reason. Start a transaction. Re-read the target timesheet row with update locking to prevent concurrent review decisions. Confirm that `status` is exactly `submitted`; if the status is `draft`, `approved`, `rejected`, or any other value, abort with a business validation error because review actions are allowed only for submitted timesheets.
   *
   * Apply the rejection outcome by updating the timesheet row: set `status` to `draft`, set `reviewed_at` to the current timestamp, and set `rejection_reason` from the request body. Do not modify `submitted_at`, because it represents the timestamp when the employee submitted the timesheet. Do not add or remove rows from `hrm_time_tracking_timesheet_timelogs`; the included timelog composition remains intact until the employee edits the returned draft through separate draft-management operations.
   *
   * Commit the transaction and return the refreshed timesheet entity. Emit any internal notifications or real-time events needed so the timesheet owner immediately sees the rejection reason and returned draft state, and so authorized reviewers or observers in the same organization see the updated review outcome. Ensure failures are reported clearly. If an external dependency involved in notifications times out, do not duplicate the review action and do not report success unless the database update outcome is known.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("reject")
  public async reject(
    @ManagerAuth()
    manager: ManagerPayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingTimesheet.IReject,
  ): Promise<IHrmTimeTrackingTimesheet> {
    try {
      return await postHrmTimeTrackingManagerTimesheetsTimesheetIdReject({
        manager,
        timesheetId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
