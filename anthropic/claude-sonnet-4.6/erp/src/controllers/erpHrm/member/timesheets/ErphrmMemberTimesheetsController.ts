import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmTimesheet } from "../../../../api/structures/IErpHrmTimesheet";
import { IPageIErpHrmTimesheet } from "../../../../api/structures/IPageIErpHrmTimesheet";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteErpHrmMemberTimesheetsTimesheetId } from "../../../../providers/deleteErpHrmMemberTimesheetsTimesheetId";
import { getErpHrmMemberTimesheetsTimesheetId } from "../../../../providers/getErpHrmMemberTimesheetsTimesheetId";
import { patchErpHrmMemberTimesheets } from "../../../../providers/patchErpHrmMemberTimesheets";
import { postErpHrmMemberTimesheets } from "../../../../providers/postErpHrmMemberTimesheets";
import { postErpHrmMemberTimesheetsTimesheetIdApprove } from "../../../../providers/postErpHrmMemberTimesheetsTimesheetIdApprove";
import { postErpHrmMemberTimesheetsTimesheetIdReject } from "../../../../providers/postErpHrmMemberTimesheetsTimesheetIdReject";
import { postErpHrmMemberTimesheetsTimesheetIdSubmit } from "../../../../providers/postErpHrmMemberTimesheetsTimesheetIdSubmit";
import { putErpHrmMemberTimesheetsTimesheetId } from "../../../../providers/putErpHrmMemberTimesheetsTimesheetId";

@Controller("/erpHrm/member/timesheets")
export class ErphrmMemberTimesheetsController {
  /**
   * Create a new timesheet for the authenticated organization member, covering a specific calendar week.
   *
   * A timesheet is a formal weekly record that groups an employee's timelogs for a single calendar week (Monday through Sunday) and submits them for managerial review and approval. This operation creates a new timesheet in 'draft' status for the currently authenticated organization member. The timesheet's week is defined by its `weekStartDate` (always a Monday) and `weekEndDate` (always the following Sunday).
   *
   * According to the erp_hrm_timesheets schema, no two timesheets for the same `organization_member_id` may share the same `week_start_date` (enforced by a unique composite index on `[organization_member_id, week_start_date]`). Attempting to create a timesheet for a week that already has an existing timesheet for the same member will result in an error.
   *
   * Only active organization members may create timesheets. Deactivated members retain their historical records but cannot initiate new work entries, including new timesheets. The authenticated member's `organization_member_id` is automatically derived from the current session context and does not need to be supplied in the request body.
   *
   * Upon successful creation, the timesheet is placed in 'draft' status and returned with all its fields, including null values for `reviewer_id`, `submitted_at`, `reviewed_at`, and `rejection_reason`, since these fields are only populated upon review actions. The employee may subsequently attach timelogs to this timesheet and then submit it for review via the separate timesheet submission endpoint.
   *
   * Related operations:
   * - `PATCH /timesheets` — Browse and search existing timesheets with filter and pagination.
   * - `GET /timesheets/{timesheetId}` — Retrieve the detail of a specific timesheet by ID.
   * - `PUT /timesheets/{timesheetId}/submit` — Submit a draft timesheet for manager review.
   * - `PUT /timesheets/{timesheetId}/approve` — Approve a submitted timesheet (requires time approve permission).
   * - `PUT /timesheets/{timesheetId}/reject` — Reject a submitted timesheet with a written reason (requires time approve permission).
   *
   * @param connection
   * @param body Information required to create a new draft timesheet for the authenticated member, specifying the calendar week to cover.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   *
   * 1. Authenticate the requesting member and resolve their `organization_member_id` from the session context. Confirm the member's `status` is 'active' in erp_hrm_organization_members; if 'deactivated', return 403 Forbidden.
   *
   * 2. Validate the request body:
   *    - `weekStartDate` must be a Monday (ISO weekday === 1). If not, return 422 Unprocessable Entity.
   *    - `weekEndDate` must be exactly 6 days after `weekStartDate` (i.e., the Sunday of that same week). If not, return 422 Unprocessable Entity.
   *    - Both dates must be valid date values.
   *
   * 3. Check uniqueness constraint: query erp_hrm_timesheets WHERE `organization_member_id` = resolved member id AND `week_start_date` = provided weekStartDate. If a record already exists (regardless of status, except deleted/irrelevant states — the unique index applies unconditionally), return 409 Conflict indicating a timesheet already exists for that week.
   *
   * 4. Insert a new record into erp_hrm_timesheets:
   *    - `id`: generate a new UUID v4
   *    - `organization_member_id`: from session
   *    - `reviewer_id`: null
   *    - `status`: 'draft'
   *    - `week_start_date`: from request body
   *    - `week_end_date`: from request body
   *    - `submitted_at`: null
   *    - `reviewed_at`: null
   *    - `rejection_reason`: null
   *    - `created_at`: current timestamp (UTC)
   *    - `updated_at`: current timestamp (UTC)
   *
   * 5. Return the newly created timesheet record as IErpHrmTimesheet, including all fields populated as above, plus any joined reviewer/owner summary if the response DTO includes them.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmTimesheet.ICreate,
  ): Promise<IErpHrmTimesheet> {
    try {
      return await postErpHrmMemberTimesheets({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a paginated and filtered list of timesheets within the organization.
   *
   * This operation returns a bounded, paginated collection of timesheet records from the `erp_hrm_timesheets` table. A timesheet represents a formal weekly (Monday–Sunday) grouping of an employee's timelogs, submitted for managerial review and approval. Each timesheet is owned by exactly one `erp_hrm_organization_members` record and progresses through a status lifecycle: **draft** → **submitted** → **approved** or **rejected**.
   *
   * Access to timesheets is strictly permission-gated. An authenticated member (employee) may only view timesheets that belong to themselves — i.e., records where `organization_member_id` matches the caller's own organization member ID. Attempting to list another employee's timesheets without elevated privileges is denied. Members who hold the **time approve** permission may view all timesheets across the organization, particularly those in the `submitted` state, to perform approval or rejection actions. Members who hold the **time view all** permission may view every timesheet regardless of status for any employee in the organization.
   *
   * Results can be filtered by **status**, restricting the list to timesheets matching one or more of the four allowed statuses: `draft`, `submitted`, `approved`, or `rejected`. Results can also be filtered by a **date range**, limiting results to timesheets whose calendar week falls within the specified start and end boundaries (aligned to the `week_start_date` and `week_end_date` columns). Both filters may be combined simultaneously, in which case only timesheets satisfying all criteria are returned.
   *
   * For timesheets that have been approved or rejected, the response summary includes the reviewer's identity (reviewer `erp_hrm_organization_members` reference) and the `reviewed_at` timestamp, giving employees and managers visibility into who acted and when. If a timesheet was rejected, the `rejection_reason` is also accessible.
   *
   * The total hours for each timesheet are derived from the sum of durations of the associated `erp_hrm_timelogs` records; this is a computed value and is not stored directly on the timesheet row.
   *
   * Pagination is cursor/page-based and returns a bounded set of results per page. The caller may control page size and sort order within the request body. This operation should typically be preceded by reviewing organization member context to understand which employee's timesheets are being browsed.
   *
   * @param connection
   * @param body Search criteria including status filter, date range filter, and pagination parameters for listing timesheets.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Authenticate the caller and resolve their organization_member_id from the active session and current organization context.
   * 2. Determine access scope:
   *    - If the caller has 'time_view_all' permission: query all timesheets within the organization (join erp_hrm_organization_members on organization_member_id to scope by organization_id).
   *    - Else if the caller has 'time_approve' permission: same broad access (can view all statuses org-wide).
   *    - Else: restrict query to timesheets where organization_member_id = caller's own organization_member_id.
   * 3. Apply filters from the request body:
   *    - status filter: WHERE status IN (requested statuses), if provided.
   *    - date range filter: WHERE week_start_date >= rangeStart AND week_end_date <= rangeEnd, if provided.
   * 4. Join with erp_hrm_organization_members (reviewer) to attach reviewer information (reviewer_id, reviewed_at, rejection_reason) for approved/rejected timesheets.
   * 5. Compute total_hours per timesheet by summing duration from erp_hrm_timelogs WHERE timesheet_id = timesheet.id (either as a subquery or aggregated join).
   * 6. Apply pagination: use page + limit or cursor-based pagination as specified in request body.
   * 7. Apply sorting: default sort by week_start_date DESC (most recent week first), or as specified in request body.
   * 8. Return paginated results as IPageIErpHrmTimesheet.ISummary with pagination metadata (total count, current page, page size).
   * 9. Edge cases:
   *    - If the caller lacks permission and requests another member's timesheets, return 403.
   *    - If no timesheets match the criteria, return an empty page (not 404).
   *    - Deleted organization members (deleted_at IS NOT NULL) should still appear as historical owners but clearly marked.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmTimesheet.IRequest,
  ): Promise<IPageIErpHrmTimesheet.ISummary> {
    try {
      return await patchErpHrmMemberTimesheets({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single timesheet record by its unique identifier.
   *
   * This operation returns the full details of a timesheet belonging to an organization member, including its current status in the review lifecycle (draft, submitted, approved, or rejected), the calendar week it covers (week_start_date always being a Monday, week_end_date always being the following Sunday), and all associated timelog entries that contribute to the total hours calculation.
   *
   * Access to a timesheet is governed by strict permission rules. An employee may only retrieve a timesheet they own (i.e., where their organization member ID matches the timesheet's organization_member_id). Attempting to access another employee's timesheet without sufficient privilege results in a permission denial. Users who hold the `time:approve` permission code within the organization may view all submitted timesheets to facilitate the approval and rejection workflow. Users who hold the `time:view_all` permission code may view all timesheets across the organization regardless of status. Any access attempt by a member who lacks both of these elevated permissions and is not the timesheet owner is rejected.
   *
   * When the timesheet has been approved or rejected, the response includes the reviewer's organization member identity (reviewer_id) and the timestamp at which the review action was taken (reviewed_at), providing a clear audit trail. If the timesheet was rejected, the rejection_reason field will contain the mandatory textual explanation provided by the reviewer, enabling the employee to understand what corrections are required before resubmission.
   *
   * The total hours figure is not stored as a direct column on the erp_hrm_timesheets table; it is computed from the sum of duration_minutes across all erp_hrm_timelogs records linked to this timesheet. The service layer must derive this calculated value and include it in the response.
   *
   * Related operations: use PATCH /timesheets to list and search timesheets with filters. Use POST /timesheets to create a new draft timesheet. Use PUT /timesheets/{timesheetId} to submit, approve, or reject a timesheet.
   *
   * @param connection
   * @param timesheetId The UUID of the target timesheet to retrieve.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Extract the authenticated member's organization_member_id from the current session context.
   * 2. Query erp_hrm_timesheets WHERE id = timesheetId. If no record is found, return 404.
   * 3. Authorization check:
   *    a. If the requesting member's organization_member_id equals the timesheet's organization_member_id → allow.
   *    b. Else, look up the member's role permissions. If the role includes 'time_approve' OR 'time_view_all' permission codes → allow.
   *    c. Otherwise → return 403 Forbidden.
   * 4. Also verify that the timesheet belongs to the same organization as the requesting member (organization scope isolation via erp_hrm_organization_members.organization_id).
   * 5. Join erp_hrm_timelogs WHERE timesheet_id = timesheetId to retrieve all associated timelogs. Compute total_minutes = SUM(duration_minutes) over the linked timelogs.
   * 6. If reviewer_id is not null, optionally join erp_hrm_organization_members for reviewer identity details to include in the response.
   * 7. Construct and return the IErpHrmTimesheet response DTO including: id, organization_member_id, reviewer_id, status, week_start_date, week_end_date, submitted_at, reviewed_at, rejection_reason, total_minutes (computed), timelogs list, created_at, updated_at.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":timesheetId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmTimesheet> {
    try {
      return await getErpHrmMemberTimesheetsTimesheetId({
        member,
        timesheetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the status and review details of an existing timesheet record.
   *
   * This operation advances a timesheet through its review lifecycle. A timesheet begins in the 'draft' state and can be progressed to 'submitted' by the owning employee, then to 'approved' or 'rejected' by a reviewer with the time approval permission. A rejected timesheet enters the 'rejected' state, which is editable — the employee may revise their timelogs and resubmit, transitioning the timesheet back to 'submitted' for another review cycle.
   *
   * The `erp_hrm_timesheets` table records the full audit trail of each status transition. When an employee submits their timesheet, the `submitted_at` timestamp is recorded. When a reviewer approves or rejects the timesheet, the `reviewer_id` (referencing the reviewing `erp_hrm_organization_members` record), `reviewed_at` timestamp, and, for rejections, a mandatory `rejection_reason` are all persisted to the timesheet record.
   *
   * Access control is strictly enforced: an employee (the timesheet owner) may only transition their own timesheet from 'draft' to 'submitted', or from 'rejected' to 'submitted' (resubmission). Users holding the time approval permission may transition a 'submitted' timesheet to 'approved' or 'rejected'. Any attempt to perform an unauthorized status transition, or to update a timesheet belonging to another member without the appropriate permission, is rejected.
   *
   * Business rules enforced by this operation include: (1) A timelog included in an approved timesheet is locked — no edits or deletions are permitted while the timesheet remains approved. (2) Timesheets in 'submitted' status block organization deletion. (3) Rejection requires a non-empty `rejection_reason` explaining what the employee must correct before resubmitting.
   *
   * Approving or rejecting a timesheet automatically generates a corresponding activity log entry ('Timesheet approved' or 'Timesheet rejected') within the organization's audit trail, including the reviewer identity and, for rejections, the rejection reason. These entries are visible to authorized members via the organization activity log.
   *
   * Related operations: Use `PATCH /timesheets` to list and filter timesheets with pagination. Use `GET /timesheets/{timesheetId}` to retrieve a single timesheet's full detail including linked timelogs. Use `POST /timesheets` to create a new draft timesheet for the current week.
   *
   * @param connection
   * @param timesheetId The UUID of the target timesheet record to update.
   * @param body Status update payload for the timesheet, including intended status transition and optional rejection reason.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Authenticate the calling member session and resolve the current organization context.
   * 2. Fetch the erp_hrm_timesheets record by the provided timesheetId (UUID). Return 404 if not found.
   * 3. Resolve the calling member's erp_hrm_organization_members record within the current organization.
   * 4. Validate the requested status transition against the current timesheet status:
   *    - 'draft' → 'submitted': Allowed only for the timesheet owner (organization_member_id matches caller). Record submitted_at = now().
   *    - 'submitted' → 'approved': Allowed only for callers with the time approval permission. Record reviewer_id = caller's organization_member_id, reviewed_at = now().
   *    - 'submitted' → 'rejected': Same permission as approve. rejection_reason must be non-empty. Record reviewer_id, reviewed_at, rejection_reason, and reset status to 'draft' after rejection (or set status = 'rejected' per schema — the schema stores 'rejected' as a status and the employee can resubmit after edits).
   *    - Any other transition is invalid and should return 422 Unprocessable Entity.
   * 5. Check authorization: if caller is not the owner and does not hold the time approval permission, return 403 Forbidden.
   * 6. For 'submitted' → 'rejected', ensure rejection_reason is provided and non-empty; return 422 if missing.
   * 7. Within a database transaction, update the erp_hrm_timesheets record: set status, submitted_at (if submitting), reviewer_id (if approving/rejecting), reviewed_at (if approving/rejecting), rejection_reason (if rejecting), and updated_at = now().
   * 8. Return the fully updated erp_hrm_timesheets record as IErpHrmTimesheet, including related reviewer identity information.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":timesheetId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimesheet.IUpdate,
  ): Promise<IErpHrmTimesheet> {
    try {
      return await putErpHrmMemberTimesheetsTimesheetId({
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
   * Permanently removes a timesheet record from the system.
   *
   * A timesheet is a weekly (Monday–Sunday) collection of timelogs owned by an organization member (`erp_hrm_timesheets.organization_member_id`), submitted for managerial review and approval. The status lifecycle of a timesheet progresses through: **draft** → **submitted** → **approved** or **rejected**. A rejected timesheet returns to draft status, allowing the employee to revise and resubmit.
   *
   * This operation may only be performed on timesheets that are currently in **draft** status. Timesheets in `submitted` or `approved` status are considered active or locked and cannot be deleted. A rejected timesheet that has reverted to draft is eligible for deletion. If the requested timesheet is found in submitted or approved status, the system rejects the deletion request.
   *
   * Only the owning organization member (`erp_hrm_timesheets.organization_member_id`) may delete their own timesheet. Members holding a role with the `time:manage` permission may delete any employee's timesheet within their organization, bypassing the standard ownership restriction, but the status constraint (draft only) still applies.
   *
   * When the timesheet is deleted, all associated timelog records that reference this timesheet via `erp_hrm_timelogs.timesheet_id` are **permanently deleted** from the database as a consequence of the `onDelete: Cascade` constraint defined on the `erp_hrm_timelogs` foreign key. This is an irreversible side-effect: any timelog entries included in the deleted timesheet cannot be recovered after deletion.
   *
   * This operation results in permanent data removal. The `erp_hrm_timesheets` record identified by `timesheetId` is irreversibly deleted from the database, and all associated timelogs are cascade-deleted along with it. No response body is returned upon success.
   *
   * Prerequisite: The caller must be an authenticated member (`erp_hrm_organization_members`) within the same organization as the target timesheet. To retrieve the current status of a timesheet before attempting deletion, use `GET /erpHrm/member/timesheets/{timesheetId}`.
   *
   * @param connection
   * @param timesheetId The unique identifier (UUID) of the timesheet to be deleted.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Authenticate the requesting member and resolve their organization_member record.
   * 2. Fetch the erp_hrm_timesheets row by the given timesheetId (UUID). Return 404 if not found.
   * 3. Verify the timesheet belongs to the same organization as the requesting member. Return 403 if not.
   * 4. Authorization check:
   *    a. If the requesting member is the timesheet owner (organization_member_id matches), allow proceed to status check.
   *    b. If the requesting member holds a role with 'time:manage' permission within the organization, also allow proceed to status check.
   *    c. Otherwise, return 403 Forbidden.
   * 5. Status check: verify that the timesheet's status is 'draft'. If status is 'submitted' or 'approved', reject the request with a 409 Conflict or 422 Unprocessable Entity, indicating the timesheet cannot be deleted in its current state. A 'rejected' timesheet reverts to 'draft' per business rules, so it is eligible.
   * 6. Perform the deletion:
   *    a. Delete the erp_hrm_timesheets record by id.
   *    b. Due to the Cascade relationship on erp_hrm_timelogs.timesheet_id, associated timelogs will have their timesheet_id cleared or be cascade-deleted per the configured database constraint. Verify and handle accordingly to avoid unintended data loss of timelog records.
   * 7. Return HTTP 204 No Content on success.
   * 8. Wrap the operation in a database transaction to ensure atomicity.
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
      return await deleteErpHrmMemberTimesheetsTimesheetId({
        member,
        timesheetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Submit a draft timesheet for managerial review and approval, transitioning its status from 'draft' to 'submitted'.
   *
   * This operation is the formal act through which an employee presents their weekly time records to a reviewer. Once submitted, the timesheet enters the 'submitted' state and cannot be modified by the employee until the reviewer either approves it (locking it permanently) or rejects it (returning it to 'draft' for revision). The submission timestamp (`submitted_at`) is recorded upon this action.
   *
   * The target timesheet is identified by its UUID (`timesheetId`). The authenticated member must be the owner of the timesheet; submission on behalf of other employees is not permitted. Additionally, the member must currently be in 'active' status — deactivated members are blocked from initiating new work-related actions, including timesheet submission.
   *
   * Several validation rules are enforced before the status transition is allowed. First, the timesheet must be in 'draft' status; a timesheet already in 'submitted' or 'approved' state cannot be re-submitted. Second, the timesheet must contain at least one timelog (`erp_hrm_timelogs` rows linked via `timesheet_id`); an empty timesheet cannot be submitted. Third, no other timesheet belonging to the same employee and covering the same calendar week may currently be in 'submitted' or 'approved' status — only one active submission per week per employee is allowed. Fourth, every timelog included in the timesheet must have a `work_date` that falls within the timesheet's defined week (`week_start_date` to `week_end_date`); timelogs outside the week range will cause the submission to be rejected.
   *
   * The `erp_hrm_timesheets` table stores the weekly boundaries as `week_start_date` (Monday) and `week_end_date` (Sunday), enforced by the unique constraint on `(organization_member_id, week_start_date)`. The `status` field reflects the current position in the lifecycle: draft → submitted → approved or rejected.
   *
   * After a successful submission, the caller receives the full updated timesheet entity, including the newly set `status` ('submitted') and `submitted_at` timestamp. Clients should use this response to update the local state of the timesheet display. To view the list of timesheets or check their current state prior to submission, use `PATCH /timesheets` (the index operation). To approve or reject a submitted timesheet, users with the `time:approve` permission use the respective approve or reject endpoints.
   *
   * @param connection
   * @param timesheetId The UUID of the timesheet to be submitted for review.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Authenticate the calling member from the session context and resolve their active OrganizationMember record.
   * 2. Look up the erp_hrm_timesheets row by the provided timesheetId. If not found, return 404.
   * 3. Verify that the timesheet's organization_member_id matches the authenticated member's OrganizationMember id. If not, return 403.
   * 4. Check the OrganizationMember's status field; if it is 'deactivated', reject the submission with an appropriate error.
   * 5. Verify the timesheet's current status is 'draft'. If it is 'submitted' or 'approved', reject with a conflict error explaining the timesheet is not in a revisable state.
   * 6. Count the number of erp_hrm_timelogs rows where timesheet_id = timesheetId. If the count is 0, reject the request — a timesheet must contain at least one timelog before it can be submitted.
   * 7. Check for duplicate-week conflict: query erp_hrm_timesheets for any row where organization_member_id = current member's id AND week_start_date = this timesheet's week_start_date AND status IN ('submitted', 'approved') AND id != timesheetId. If such a row exists, reject the submission.
   * 8. Optionally verify that all timelogs linked to this timesheet have a work_date falling within [week_start_date, week_end_date]. If any timelog falls outside the week range, reject the submission.
   * 9. Within a database transaction, update erp_hrm_timesheets: set status = 'submitted', submitted_at = now(), updated_at = now().
   * 10. Return the full timesheet record including all updated fields.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":timesheetId/submit")
  public async submit(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmTimesheet> {
    try {
      return await postErpHrmMemberTimesheetsTimesheetIdSubmit({
        member,
        timesheetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Approve a submitted timesheet on behalf of an authorized reviewer.
   *
   * This operation transitions the target timesheet from `submitted` status to `approved` status. It is exclusively available to organization members who hold the `time:approve` permission within the organization. Once approved, the timesheet's `reviewer_id` is set to the acting member, and the `reviewed_at` timestamp is recorded to form a clear audit trail as defined in the `erp_hrm_timesheets` schema.
   *
   * The timesheet must be in `submitted` status for this action to succeed. If the timesheet is still in `draft` status, already in `approved` status, or in `rejected` status (returned to draft for revision), the request is rejected. Only timesheets actively awaiting review can be approved.
   *
   * The acting member must hold the `time:approve` permission in the organization that owns the timesheet. Members without this permission are denied, regardless of any other roles or permissions they may hold. This permission check is enforced on every approval request.
   *
   * Self-approval is strictly prohibited. Even if the acting member holds `time:approve` permission, they may not approve a timesheet for which they are the owner (`organization_member_id`). The system compares the identity of the acting member with the timesheet owner and denies the request if they match.
   *
   * Upon successful approval, the system updates the `status` column to `approved`, sets `reviewer_id` to the acting organization member's ID, and records the current timestamp in `reviewed_at`. The fully updated `erp_hrm_timesheets` record is returned to the caller.
   *
   * Related operations: Use `PATCH /timesheets` to browse and filter timesheets awaiting approval. Use `POST /timesheets/{timesheetId}/reject` to reject a submitted timesheet instead. Use `GET /timesheets/{timesheetId}` to retrieve the current state of a timesheet before taking action.
   *
   * @param connection
   * @param timesheetId The UUID of the target timesheet to approve. The timesheet must be in submitted status and must not be owned by the acting reviewer.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Authenticate the acting member from the session and resolve their organization membership record (`erp_hrm_organization_members`).
   * 2. Load the target timesheet from `erp_hrm_timesheets` by `timesheetId` (UUID). If not found, return 404.
   * 3. Verify the timesheet belongs to the same organization as the acting member. If not, return 403.
   * 4. Check that the acting member's role has the `time:approve` permission by querying `erp_hrm_role_permissions`. If missing, return 403.
   * 5. Compare the acting member's `id` with the timesheet's `organization_member_id`. If they match (self-approval), return 403.
   * 6. Verify the timesheet `status` is exactly `'submitted'`. If it is `'draft'`, `'approved'`, or `'rejected'`, return 422 with an appropriate error message.
   * 7. Within a database transaction:
   *    a. Update `erp_hrm_timesheets` SET `status = 'approved'`, `reviewer_id = <acting_member_id>`, `reviewed_at = NOW()`, `updated_at = NOW()` WHERE `id = timesheetId`.
   * 8. Reload the updated timesheet record with associated relations (owner member, reviewer member, timelogs) and return it as `IErpHrmTimesheet`.
   * 9. Edge cases:
   *    - Concurrent approval attempts: rely on the status check within the transaction to prevent double-processing.
   *    - Deactivated reviewer: if the acting member's `status` is `'deactivated'`, treat as unauthorized (403).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":timesheetId/approve")
  public async approve(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmTimesheet> {
    try {
      return await postErpHrmMemberTimesheetsTimesheetIdApprove({
        member,
        timesheetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Reject a submitted timesheet on behalf of an authorized reviewer, returning it to draft status with a mandatory written reason.
   *
   * This operation allows organization members who hold the `time:approve` permission to reject a timesheet that is currently in the `submitted` status. Upon successful rejection, the timesheet's `status` is transitioned back to `draft`, the `reviewer_id` is set to the acting reviewer's organization member ID, the `reviewed_at` timestamp is recorded, and the provided `rejection_reason` is persisted on the record.
   *
   * Access is strictly restricted to members with the `time:approve` permission within the organization. Members without this permission — regardless of their role or any other permissions they hold — will have their request denied. Additionally, reviewers cannot act on their own timesheets; self-rejection is not permitted.
   *
   * A non-empty `rejection_reason` is required. If the caller omits or provides a blank reason, the system rejects the request and the timesheet remains in `submitted` status unchanged. This ensures employees always receive actionable feedback explaining what must be corrected before resubmission.
   *
   * The timesheet must be in `submitted` status. Attempting to reject a timesheet that is in `draft`, `approved`, or already `rejected` status will result in an error without any state change.
   *
   * After rejection, the timesheet returns to `draft` status, unlocking its associated timelogs so the employee may edit them. The employee may then add or remove timelogs before resubmitting, following the same submission rules (at least one timelog, all timelogs within the same calendar week, no duplicate submitted or approved timesheets for the same week).
   *
   * Related operations: `PATCH /timesheets` to browse timesheets, `GET /timesheets/{timesheetId}` to retrieve a specific timesheet, `POST /timesheets/{timesheetId}/approve` to approve a submitted timesheet, and `POST /timesheets/{timesheetId}/submit` for the employee to submit a draft timesheet.
   *
   * @param connection
   * @param timesheetId The UUID of the timesheet to reject. The timesheet must be in 'submitted' status.
   * @param body Rejection details including the mandatory written reason for declining the timesheet.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Authenticate the calling member session and resolve their current organization context.
   * 2. Load the target timesheet from `erp_hrm_timesheets` by the provided `timesheetId`. Return 404 if not found.
   * 3. Verify that the timesheet belongs to the same organization as the calling reviewer (via `organization_member_id` → `erp_hrm_organization_members.organization_id`).
   * 4. Check that the calling member's role has the `time:approve` permission by querying `erp_hrm_role_permissions`. Return 403 if not granted.
   * 5. Ensure the timesheet `status` is exactly `submitted`. Return 422 with an appropriate error message if it is `draft`, `approved`, or `rejected`.
   * 6. Validate that `rejection_reason` in the request body is non-null and non-empty (after trimming whitespace). Return 422 if the reason is missing or blank.
   * 7. In a single database transaction:
   *    a. Update `erp_hrm_timesheets` SET `status` = 'rejected', `reviewer_id` = (calling reviewer's organization_member id), `reviewed_at` = NOW(), `rejection_reason` = (provided reason), `updated_at` = NOW() WHERE `id` = `timesheetId`.
   *    b. No changes are needed to individual timelogs at this step; locking/unlocking is managed by the submission/approval lifecycle.
   * 8. Return the fully populated `IErpHrmTimesheet` record including owner, reviewer details, all timestamps, and the stored rejection_reason.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":timesheetId/reject")
  public async reject(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimesheet.IReject,
  ): Promise<IErpHrmTimesheet> {
    try {
      return await postErpHrmMemberTimesheetsTimesheetIdReject({
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
