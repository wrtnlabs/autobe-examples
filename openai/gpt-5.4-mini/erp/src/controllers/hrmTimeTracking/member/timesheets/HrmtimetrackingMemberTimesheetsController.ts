import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingTimesheet } from "../../../../api/structures/IHrmTimeTrackingTimesheet";
import { IPageIHrmTimeTrackingTimesheet } from "../../../../api/structures/IPageIHrmTimeTrackingTimesheet";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteHrmTimeTrackingMemberTimesheetsTimesheetId } from "../../../../providers/deleteHrmTimeTrackingMemberTimesheetsTimesheetId";
import { getHrmTimeTrackingMemberTimesheetsTimesheetId } from "../../../../providers/getHrmTimeTrackingMemberTimesheetsTimesheetId";
import { patchHrmTimeTrackingMemberTimesheets } from "../../../../providers/patchHrmTimeTrackingMemberTimesheets";
import { postHrmTimeTrackingMemberTimesheets } from "../../../../providers/postHrmTimeTrackingMemberTimesheets";
import { postHrmTimeTrackingMemberTimesheetsTimesheetIdApprove } from "../../../../providers/postHrmTimeTrackingMemberTimesheetsTimesheetIdApprove";
import { postHrmTimeTrackingMemberTimesheetsTimesheetIdReject } from "../../../../providers/postHrmTimeTrackingMemberTimesheetsTimesheetIdReject";
import { putHrmTimeTrackingMemberTimesheetsTimesheetId } from "../../../../providers/putHrmTimeTrackingMemberTimesheetsTimesheetId";

@Controller("/hrmTimeTracking/member/timesheets")
export class HrmtimetrackingMemberTimesheetsController {
  /**
   * Create a new weekly timesheet draft for the current employee.
   *
   * A timesheet represents one employee’s weekly time collection for a Monday-to-Sunday period within the selected organization. This operation creates the timesheet container in draft status and prepares it for later submission, review, approval, or rejection. The created record is bound to the authenticated employee in the active organization context, and the request must not attempt to create a timesheet for another employee.
   *
   * The weekly boundary must be validated carefully. The requested week must resolve to a single Monday start date and the corresponding Sunday end date, matching the business definition of a timesheet as a weekly collection. The service should reject dates outside the allowed weekly range or requests that would create ambiguous week coverage. If weekly timelogs are attached during creation, they must belong to the same employee, the same organization, and the same week, and they must not already be locked by an approved timesheet.
   *
   * This endpoint is the first step in the timesheet workflow. After creation, the employee may add or remove eligible timelogs, then submit the timesheet for review. Submitted timesheets are reviewed through separate approval and rejection operations by users with timesheet approval permission. The response includes the timesheet summary fields used throughout that workflow, including total hours and review metadata when available.
   *
   * @param connection
   * @param body Weekly timesheet creation details for the current employee.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement a timesheet creation service for the authenticated employee in the selected organization.
   *
   * 1. Resolve the current member identity and selected organization from the request context. Do not accept employeeId or organizationId from the body.
   * 2. Validate the requested week. Normalize the provided date to the Monday of that week and compute the corresponding Sunday end date. Reject requests that do not map cleanly to a weekly Monday-Sunday window.
   * 3. Enforce one timesheet container per employee per week in the organization. If the schema or service rules permit only one row per employee/week, check for an existing timesheet before insert and decide whether to return conflict or reuse existing draft according to the implementation policy.
   * 4. Load eligible timelogs for the employee, organization, and week only if the request includes initial inclusion behavior. Exclude timelogs that are already tied to an approved timesheet or otherwise locked. Ensure only the employee’s own timelogs are considered.
   * 5. Insert the timesheet with draft status, week_start_date, week_end_date, and any initialized totals. If included timelogs are stored via join records, create those join rows in the same transaction after the timesheet insert.
   * 6. Compute total hours from included timelogs if the design stores the aggregate on the timesheet row. Recalculate from source timelogs rather than trusting client-provided totals.
   * 7. Return the created timesheet with review metadata fields set to null when not yet submitted/reviewed.
   * 8. Handle errors: forbidden when the user has no employee context in the organization, conflict when a timesheet already exists for the same employee/week, validation failure for invalid week boundaries or illegal timelog inclusion, and not found when referenced timelogs do not belong to the employee or organization.
   * 9. Record any organization activity only if the broader system explicitly logs timesheet creation; otherwise keep this endpoint focused on the timesheet tables and join records.
   *
   * Use a transaction to ensure the timesheet row and any initial timelog link rows are created atomically.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IHrmTimeTrackingTimesheet.ICreate,
  ): Promise<IHrmTimeTrackingTimesheet> {
    try {
      return await postHrmTimeTrackingMemberTimesheets({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a paginated list of weekly timesheets for the current organization context.
   *
   * A timesheet represents one employee's time entries for one week, running from Monday through Sunday. This endpoint is designed for browsing weekly timesheet records in a paginated list, with filtering by status and date range so users can narrow the set of timesheets shown on screen.
   *
   * The response is scoped to the authenticated user's selected organization and respects employee visibility rules. Employees can view their own timesheets, while users with approval authority can also review submitted timesheets that are waiting for approval or rejection. The list reflects the timesheet header record stored in the timesheet table, including week start, week end, status, total hours, submission timestamp, review metadata, and rejection reason.
   *
   * This operation depends on the organization context already being selected after authentication. The client should not attempt to infer timesheet scope from the URL; instead, the server resolves the active organization and applies employee-level access rules before querying the weekly timesheet records. For review workflows, this endpoint is typically used together with the timesheet detail and review operations that approve or reject a submitted record.
   *
   * Records returned here are historical workflow records and remain available even when an employee is deactivated or reactivated. The operation must preserve that history and must not remove or hide preserved timesheets solely because an employee's membership status has changed.
   *
   * @param connection
   * @param body Timesheet search filters, pagination, and sorting options.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement a paginated timesheet search over hrm_time_tracking_timesheets using the authenticated member's active organization context.
   *
   * Query by organization_id from the current request context and constrain visibility by the caller's access level: employees may only see their own timesheets, while approval-capable users may also query submitted timesheets available for review within the organization. Apply optional filters for status and week/date range using week_start and week_end boundaries. Validate that any supplied date range aligns with the Monday-to-Sunday weekly concept.
   *
   * Use ordering that is stable for paging, preferably week_start descending and then created_at or id as a tiebreaker. Join the employee and reviewedByEmployee relations only as needed for response shaping. Compute or expose total hours from the related timelog inclusion set if the summary schema requires it; do not duplicate timesheet membership data in this query. Return a paginated summary response.
   *
   * Enforce business rules at the service layer: reject cross-organization access, exclude records outside the selected employee scope, and keep historical timesheets visible for preserved employee records. Do not allow this operation to mutate status or inclusion state; it is strictly read/search only. Surface validation-friendly errors for invalid date ranges, unsupported status values, or unauthorized access.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IHrmTimeTrackingTimesheet.IRequest,
  ): Promise<IPageIHrmTimeTrackingTimesheet.ISummary> {
    try {
      return await patchHrmTimeTrackingMemberTimesheets({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the detailed view of a single weekly timesheet.
   *
   * A timesheet represents one employee's time entries for exactly one week, and that week runs from Monday through Sunday. This operation returns the complete timesheet record for the requested period, including its ownership, weekly coverage, current review status, included timelogs, and review metadata needed by the client to present a full timesheet detail or review screen.
   *
   * Access to this resource is always evaluated inside the currently selected organization context. An employee can view only their own timesheets. Users with timesheet approval permission can view submitted timesheets for review, and users with broader time visibility permission can view timesheets across employees in the organization. The server must reject requests that do not match the caller's organization scope or visibility rights.
   *
   * The response is intended to be used together with the timesheet list and timesheet review operations. List endpoints are useful for browsing and filtering weekly records, while this endpoint provides the full single-record view once a specific timesheet has been selected. If the timesheet is submitted, the response should include the metadata required for approval or rejection workflows; if it is still in draft, the response should include the weekly collection details used for editing and submission.
   *
   * @param connection
   * @param timesheetId Timesheet identifier.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Load one timesheet by primary identifier within the active organization context.
   *
   * Implementation should:
   * - Validate that the caller is authenticated and has an active organization context.
   * - Fetch the timesheet by id and ensure it belongs to the selected organization.
   * - Enforce visibility rules:
   *   - The employee owner can read their own timesheet.
   *   - An approver with timesheet approval permission can read submitted timesheets.
   *   - A user with view-all timelogs/timesheets permission can read any timesheet in the organization.
   * - Join the related employee record and, when needed for the detail view, the timesheet timelog links and their underlying timelog records.
   * - Return the weekly range as stored for the timesheet, which must represent Monday through Sunday.
   * - Include any stored review metadata such as submission state and reviewer information if present in the schema.
   * - Preserve immutability of read-only historical information; no mutations occur in this endpoint.
   *
   * Error handling should cover:
   * - 404 when the timesheet does not exist in the active organization.
   * - 403 when the caller lacks permission to view the timesheet.
   * - 400 when the id path parameter is malformed.
   *
   * The endpoint should not infer data from other weeks or synthesize totals beyond what the service layer can compute from related timelogs and stored values. If totals are stored, return them directly; if they are computed, compute them consistently from the linked timelogs.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":timesheetId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingTimesheet> {
    try {
      return await getHrmTimeTrackingMemberTimesheetsTimesheetId({
        member,
        timesheetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a single weekly timesheet record for the selected organization.
   *
   * This operation updates the timesheet header and review metadata for one employee-owned weekly time collection. A timesheet represents one employee's Monday-to-Sunday time collection and stores the workflow state that governs whether the record is still being edited, has been submitted for review, has been approved, or has been rejected. The resource is backed by the `hrm_time_tracking_timesheets` table, which stores the organization boundary, owning employee, reviewer reference, week start and end dates, workflow status, submission timestamp, review timestamp, and rejection reason.
   *
   * Access to this endpoint is organization-scoped and permission-aware. The employee who owns the timesheet may update their own draft record, while users with timesheet approval permission may update review-related fields when processing submitted timesheets. The organization context in the authenticated session must match the timesheet's `organization_id`, and the record must belong to that organization before any update is applied.
   *
   * The update must preserve the weekly Monday-to-Sunday structure described by the business model. If the timesheet is moved through the review workflow, the service layer must enforce the rules that submitted timesheets remain available for review, approved timesheets lock the included timelogs, and rejected timesheets return to draft status with a rejection reason. Historical timesheets must remain preserved even when an employee is deactivated or reactivated, so this endpoint must never remove or recreate the record as part of workflow handling.
   *
   * This endpoint is typically used together with the timesheet list and detail retrieval operations, and with the submission, approval, and rejection workflow actions that manage the record's state. Validation failures should be returned when the requested update conflicts with the current status, violates week boundaries, or attempts to modify fields that are not allowed in the current workflow state.
   *
   * @param connection
   * @param timesheetId Timesheet identifier in UUID format.
   * @param body Editable timesheet fields and workflow-related update values.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Load the target timesheet by id with an organization scope check using organization_id and the authenticated organization context. Reject the request with 404 if the record does not exist in the current organization.
   *
   * Allow updates only to the fields supported by the timesheet domain model and business rules: week_start, week_end, status, reviewed_by_employee_id, reviewed_at, submitted_at, and rejection_reason as applicable to the current lifecycle state. Do not permit changes to employee_id or organization_id through this endpoint. The service should validate that week_start is a Monday and week_end is the corresponding Sunday for the same weekly range. If the contract allows editing a draft timesheet only, reject attempts to alter workflow metadata outside allowed transitions.
   *
   * When the request changes status to submitted, enforce the business rule that no other submitted timesheet may already exist for the same employee and week. When changing to approved, require a valid reviewer context with approval permission, set reviewed_by_employee_id and reviewed_at, and ensure included timelogs become locked through the timesheet-timelog relationship. When changing to rejected, require rejection_reason, set reviewed_by_employee_id and reviewed_at, and return the record to draft state if the workflow requires that behavior. Use a transaction so that timesheet header updates and any dependent timelog locking or workflow adjustments remain consistent.
   *
   * Validate that submitted_at, reviewed_at, and rejection_reason are coherent with the status being written. For example, rejection_reason must be present for rejected state, reviewed_by_employee_id must reference an employee in the same organization, and review timestamps must not precede the submission timestamp. Preserve created_at and updated_at automatically. Return the full updated timesheet entity after persistence.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":timesheetId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingTimesheet.IUpdate,
  ): Promise<IHrmTimeTrackingTimesheet> {
    try {
      return await putHrmTimeTrackingMemberTimesheetsTimesheetId({
        member,
        timesheetId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Delete a single timesheet that is still eligible for removal.
   *
   * This operation removes one organization-scoped weekly timesheet record for the authenticated employee in the current organization context. It is intended for draft or otherwise deletable timesheets only, and it must reject requests for timesheets that have already been submitted for review or approved, because those states protect the included time entries and preserve the employee's historical work record.
   *
   * The timesheet domain represents a weekly time collection for one employee, and the deletion must respect that relationship. The service should verify the target timesheet belongs to the current organization and is accessible to the authenticated member. If the timesheet is linked to submitted or approved review state, the request must fail. If the timesheet is deletable, the service should remove the timesheet record and any join records that associate timelogs to that timesheet, while leaving the underlying timelog records intact.
   *
   * This endpoint is part of the employee time management workflow and should be used together with timesheet creation, submission, approval, rejection, and list/detail retrieval operations. Historical timesheets for inactive employees remain preserved by business rule, so deletion must not be used to alter past approved history or to affect other employees' records. Permission checks and organization-context checks must be enforced before any database mutation occurs.
   *
   * @param connection
   * @param timesheetId Timesheet ID to delete.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement as an organization-scoped delete command against hrm_time_tracking_timesheets.
   *
   * 1. Resolve the authenticated member and active organization context.
   * 2. Load the target timesheet by timesheetId and ensure it belongs to the active organization and is visible to the caller.
   * 3. Enforce deletion eligibility:
   *    - Reject if the timesheet is submitted, approved, rejected-and-locked, or otherwise non-draft according to the service's timesheet state model.
   *    - Reject if the record is not owned by the current employee when the caller is limited to self-service deletion.
   * 4. If eligible, execute the deletion in a transaction:
   *    - Delete associated hrm_time_tracking_timesheet_timelogs join rows for this timesheet.
   *    - Delete the hrm_time_tracking_timesheets record.
   *    - Do not delete underlying hrm_time_tracking_timelogs records.
   * 5. Return a standard deleted-resource response.
   *
   * Edge cases and validation:
   * - Return 404 when the timesheet does not exist in the active organization scope.
   * - Return 403 when the caller lacks rights to delete the target employee's timesheet.
   * - Return 409 when the timesheet is already submitted, approved, or otherwise protected by review state.
   * - Use a transaction to avoid orphaned join rows.
   * - Preserve all historical timelog data; only the timesheet association is removed.
   *
   * No request body is required. The endpoint should remain narrow and resource-specific.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":timesheetId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmTimeTrackingMemberTimesheetsTimesheetId({
        member,
        timesheetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Approve a submitted weekly timesheet and finalize its review outcome.
   *
   * This operation is used by an authorized reviewer to accept a timesheet that has already been submitted for approval within the current organization context. A timesheet may only be approved while it is in submitted status, and the approval decision becomes part of the employee’s weekly time tracking history as well as the organization’s activity record.
   *
   * When the approval succeeds, the timesheet enters the approved state and the timelogs included in that timesheet become locked from further edit or deletion through the timesheet workflow. This preserves the reviewed weekly time record and prevents later changes from altering the approved hours. The approved timesheet remains available as a completed review record for both the employee and the approver.
   *
   * Access to this action is restricted to members who hold the timesheet approval permission in the currently selected organization. The approver must also be operating within the same organization boundary as the target timesheet. If the timesheet is not in submitted status, or if the caller lacks approval authority, the request must be rejected with an appropriate validation or authorization error.
   *
   * This approval action is paired with the rejection endpoint for the same resource, which must be used when the reviewer wants to return the timesheet to draft status with a rejection reason. The approval endpoint does not accept a request body because no additional reviewer input is required for the accept flow beyond the authenticated user and organization context already enforced by the application layer.
   *
   * @param connection
   * @param timesheetId Target timesheet identifier.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Load the target timesheet by timesheetId within the current organization context, ensuring the record belongs to the active organization and is visible to the authenticated reviewer.
   *
   * Authorize the caller using the timesheet approval permission. If the caller does not have approval authority, return a forbidden response. Do not allow cross-organization access even if the identifier exists elsewhere.
   *
   * Validate that the timesheet is in submitted status before processing approval. If the status is draft, approved, rejected, or any non-submitted state, reject the request as an invalid state transition.
   *
   * Perform the approval in a transaction:
   * 1. Update the timesheet status to approved.
   * 2. Persist review metadata such as the reviewer identity and approval timestamp if those columns exist in the timesheet schema.
   * 3. Ensure the included timelogs are treated as locked by the business workflow so they cannot be modified or removed through timesheet operations after approval.
   * 4. Create an organization activity record describing the approval decision, because the requirements state that timesheet approval activity must be recorded in organization history.
   *
   * Return the updated timesheet aggregate after commit. The response should include the timesheet identity, employee reference, week boundary, status, and any review metadata needed by the UI to display the completed approval state.
   *
   * Do not accept a request body. Do not implement rejection reason handling here; that belongs to the reject endpoint. Do not change the included timelogs themselves beyond applying the approval workflow constraints.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":timesheetId/approve")
  public async approve(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingTimesheet> {
    try {
      return await postHrmTimeTrackingMemberTimesheetsTimesheetIdApprove({
        member,
        timesheetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Reject a submitted timesheet after review and record the reason for the decision.
   *
   * This operation is used by an approver with timesheet approval permission to review a submitted weekly timesheet belonging to the currently selected organization. The timesheet header stores the organization boundary, employee ownership, weekly range, current workflow status, submission timestamp, review timestamp, reviewer reference, and rejection reason, so the rejection action updates the existing record with the reviewer metadata and the business reason for the decision.
   *
   * A timesheet can only be rejected while it is in submitted status. The rejection reason is required and must be stored with the decision so the employee can understand why the weekly collection was not approved. After the rejection is recorded, the timesheet returns to a draft-ready state according to the workflow rules, while the review metadata remains available for auditability and UI feedback.
   *
   * Access to this endpoint is limited to approvers in the active organization context. Employees without timesheet approval permission must not be able to use this action, and the system must also reject requests for timesheets that do not belong to the current organization or are not currently submitted. The client should use the timesheet detail or submitted-timesheet review flow before invoking this action so that it can confirm the target record is eligible for rejection.
   *
   * @param connection
   * @param timesheetId Timesheet identifier.
   * @param body Rejection reason for the submitted timesheet.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Load the timesheet by id within the current organization scope and verify that the record exists, is not deleted, and belongs to the authenticated user's selected organization.
   *
   * Authorize the request only when the current actor has timesheet approval permission. If the actor lacks approval authority, return a forbidden response.
   *
   * Validate that the timesheet status is submitted. If it is draft, approved, or otherwise not eligible for review, reject the command with a conflict or validation error. Validate that rejectionReason is present, trimmed, and not empty.
   *
   * Apply the status transition in a transaction: set status to rejected, set reviewed_by_employee_id to the current approver's employee id, set reviewed_at to the current timestamp, and persist the provided rejection_reason. Keep submitted_at unchanged so the record retains its submission history. Update updated_at automatically.
   *
   * Because the schema includes a reviewer foreign key and review timestamps, make sure the update is performed atomically to avoid partial review metadata. Return the updated timesheet record after commit so the client can show the final review state, reviewer identity, and rejection explanation.
   *
   * Do not modify timelog membership in this operation; the timesheet header is only responsible for workflow metadata. If application-layer workflow logic converts the rejected item back to a draft-ready state, ensure that is represented consistently in the timesheet status field and any downstream status handling used by the service layer. Also record an activity entry only if the wider application rules require review actions to be visible in the organization activity feed.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":timesheetId/reject")
  public async reject(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingTimesheet.IReject,
  ): Promise<IHrmTimeTrackingTimesheet> {
    try {
      return await postHrmTimeTrackingMemberTimesheetsTimesheetIdReject({
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
