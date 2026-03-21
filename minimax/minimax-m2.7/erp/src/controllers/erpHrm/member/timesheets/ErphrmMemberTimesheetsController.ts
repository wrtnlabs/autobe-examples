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
   * Create a new draft timesheet for the authenticated employee covering a specific work week.
   *
   * This endpoint creates a draft timesheet for the employee identified by the current session. The timesheet represents a work week from Monday to Sunday. When created, the system automatically includes all timelogs belonging to the employee that fall within the specified week date range.
   *
   * The created timesheet starts in draft status, allowing the employee to add or remove timelogs before submission. The total hours are calculated from all included timelogs. Only one timesheet can exist per employee per week (enforced by unique constraint on employee_id and week_start_date).
   *
   * Employees can create multiple draft timesheets for different weeks. The week_start_date must always be a Monday and week_end_date must always be the following Sunday of the same week.
   *
   * Security: Only authenticated members within an organization context can create timesheets. The employee ID is derived from the session, not provided in the request body. Users with time:approve permission cannot create timesheets on behalf of others through this endpoint.
   *
   * Related operations:
   * - GET /timesheets/{timesheetId} - Retrieve timesheet details including included timelogs
   * - PATCH /timesheets - List and filter timesheets with pagination
   * - PUT /timesheets/{timesheetId} - Submit timesheet for approval
   * - DELETE /timesheets/{timesheetId} - Cancel/delete a draft timesheet
   *
   * @param connection
   * @param body Week date range for the timesheet to be created
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Create a new draft timesheet for the authenticated employee.
   *
   * 1. Extract employee ID from the authenticated session (verified member in organization context).
   *
   * 2. Validate request body:
   *    - week_start_date: Required, must be a Monday (ISO weekday = 1)
   *    - week_end_date: Required, must be a Sunday (ISO weekday = 7), must be exactly 6 days after week_start_date
   *    - Calculate and store total_hours as 0 initially
   *    - Set status to 'draft'
   *
   * 3. Check for duplicate:
   *    - Query erp_hrm_timesheets table for existing record with same erp_hrm_employee_id AND week_start_date
   *    - If exists with status 'submitted' or 'approved', return conflict error
   *    - If exists with status 'draft' or 'rejected', return the existing draft (or allow overwrite - business decision)
   *
   * 4. Create timesheet record in erp_hrm_timesheets with:
   *    - id: Generated UUID
   *    - erp_hrm_employee_id: From session
   *    - week_start_date: From request
   *    - week_end_date: From request
   *    - status: 'draft'
   *    - total_hours: 0
   *    - submitted_at: null
   *    - reviewed_at: null
   *    - rejection_reason: null
   *    - created_at: Current timestamp
   *    - updated_at: Current timestamp
   *    - deleted_at: null
   *
   * 5. Auto-include timelogs:
   *    - Query erp_hrm_timelogs for all timelogs where:
   *      - erp_hrm_employee_id matches session employee
   *      - log_date >= week_start_date AND log_date <= week_end_date
   *      - NOT already linked to another timesheet
   *      - NOT locked (locked = false)
   *    - Create junction records in erp_hrm_timesheet_timelogs linking each timelog to new timesheet
   *    - Recalculate total_hours from included timelogs (SUM of duration)
   *
   * 6. Return the created timesheet with:
   *    - All basic fields
   *    - Included timelogs array (with details)
   *    - Calculated total_hours
   *    - Employee summary information
   *
   * Error handling:
   * - 400: Invalid date format or dates not Monday-Sunday
   * - 401: Not authenticated
   * - 403: Not a member of any organization
   * - 409: Timesheet already exists for this week
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
   * Retrieve a filtered and paginated list of timesheets within the organization.
   *
   * This operation provides advanced search capabilities for timesheets including filtering by workflow status (draft, submitted, approved, rejected), date range coverage, and employee ownership. The results are returned in a paginated format optimized for list displays.
   *
   * **Permission-Based Filtering**:
   *
   * When invoked by a member without time:approve permission, the operation automatically scopes results to timesheets owned by the authenticated employee. This ensures data isolation between employees.
   *
   * When invoked by a user with time:approve permission (typically managers or organization owners), the operation returns all timesheets within the organization regardless of ownership, allowing reviewers to access the approval queue.
   *
   * **Relationship to Database Schema**:
   *
   * This operation queries the erp_hrm_timesheets table which stores weekly timesheets with status tracking, week date boundaries (Monday-Sunday), total hours calculated from included timelogs, and reviewer information. The table enforces a composite unique constraint on employee_id and week_start_date to prevent duplicate timesheets for the same employee and week.
   *
   * **Usage Context**:
   *
   * Employees use this endpoint to view their own timesheet history and track submission status. Reviewers use this endpoint to access submitted timesheets awaiting approval. The response includes summary information optimized for list displays including status, total hours, and week date range.
   *
   * **Filtering Options**:
   *
   * Supports filtering by timesheet status (draft, submitted, approved, rejected), date range covering the week_start_date, and optionally by specific employee for authorized reviewers. Sorting options include creation date and week start date.
   *
   * @param connection
   * @param body Search criteria and pagination parameters for filtering timesheets
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query erp_hrm_timesheets table within the current organization context with the following implementation:
   *
   * 1. **Base Query**: Start with SELECT query on erp_hrm_timesheets filtered by organization context (via employee relationship)
   *
   * 2. **Authorization Filtering**:
   *    - If member lacks time:approve permission: Add WHERE clause filtering by erp_hrm_employee_id matching the authenticated user's employee record
   *    - If member has time:approve permission: Return all timesheets within the organization
   *
   * 3. **Search Criteria from Request Body** (apply all provided filters):
   *    - status: Filter by timesheet status field (draft, submitted, approved, rejected)
   *    - weekStartDateFrom/weekStartDateTo: Filter by week_start_date range
   *    - employeeId: Filter by erp_hrm_employee_id (only allowed for time:approve permission holders)
   *
   * 4. **Pagination**: Apply cursor-based or offset pagination using page/pageSize parameters
   *    - Default page size: 20
   *    - Maximum page size: 100
   *
   * 5. **Sorting**: Order by created_at DESC by default, optionally by week_start_date DESC
   *
   * 6. **Include Related Data**: Join with erp_hrm_employees to include employee name/email for reviewer views
   *
   * 7. **Response Construction**: Map results to IErpHrmTimesheet.ISummary format with essential fields:
   *    - id, weekStartDate, weekEndDate, status, totalHours, submittedAt, reviewedAt
   *    - Include employee summary info when viewing all timesheets
   *
   * 8. **Edge Cases**:
   *    - Empty result set returns empty pagination array
   *    - Invalid date ranges return validation error
   *    - Unauthorized employeeId filter attempts are silently ignored (not rejected) for members
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
   * Retrieve a specific timesheet by its unique identifier.
   *
   * This endpoint retrieves the complete details of a single timesheet, including its associated employee information, week date range, current workflow status, total hours calculated from included timelogs, submission timestamp, and review information if the timesheet has been approved or rejected.
   *
   * The timesheet must belong to the current organization context. Employees can only retrieve their own timesheets unless they possess the time:view_all permission, which grants the ability to view any employee's timesheets within the organization. Users with time:view_all permission can see timesheets in all states including draft, submitted, approved, and rejected.
   *
   * The response includes all timelog associations for the timesheet. When the timesheet status is approved, all included timelogs are locked from editing. When the status is rejected, the rejection_reason field contains the mandatory reason provided by the reviewer.
   *
   * For employees without time:view_all permission, attempting to access another employee's timesheet returns an access denied response. The system does not reveal whether a timesheet exists to unauthorized users.
   *
   * Related operations:
   * - PATCH /timesheets for listing timesheets with filters
   * - POST /timesheets for creating new draft timesheets
   * - PUT /timesheets/{timesheetId}/submit for submitting a draft timesheet
   * - PUT /timesheets/{timesheetId}/approve and /reject for the approval workflow
   *
   * @param connection
   * @param timesheetId Unique identifier of the timesheet to retrieve (UUID format)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Service Layer:
   * 1. Extract timesheetId from path parameters, validate as UUID format
   * 2. Query erp_hrm_timesheets table by id with soft-delete filter (deleted_at IS NULL)
   * 3. Verify organization context matches the timesheet's organization via employee relationship
   * 4. Authorization check:
   *    - If requester has time:view_all permission → allow access to any timesheet
   *    - Otherwise → verify timesheet.erp_hrm_employee_id matches current user's employee record
   * 5. If timesheet not found or unauthorized → return appropriate error response
   * 6. Load associated employee details for the timesheet owner
   * 7. Load reviewer employee details if reviewer_employee_id is not null
   * 8. Return complete timesheet with related employee and reviewer information
   *
   * Edge Cases:
   * - Invalid UUID format → 400 Bad Request
   * - Timesheet soft-deleted (deleted_at IS NOT NULL) → 404 Not Found
   * - Timesheet not found → 404 Not Found
   * - Unauthorized access attempt → 403 Forbidden (do not reveal existence)
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
   * Update an existing timesheet record to modify its properties.
   *
   * This operation allows modification of timesheet fields for employees working with their own draft timesheets. Only timesheets in draft status can be updated by the owning employee. Users with time:manage permission can update any timesheet regardless of status or ownership.
   *
   * The timesheet entity contains employee ownership (erp_hrm_employee_id), reviewer tracking (erp_hrm_reviewer_employee_id), week date boundaries (week_start_date must be Monday, week_end_date must be Sunday), workflow status, calculated total hours from included timelogs, submission and review timestamps, and optional rejection reason for rejected timesheets.
   *
   * Attempting to update a submitted or approved timesheet without time:manage permission returns an access denied error. The system validates that status transitions follow the defined workflow rules.
   *
   * @param connection
   * @param timesheetId Unique identifier of the timesheet to update
   * @param body Timesheet update payload containing fields to modify
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement timesheet update logic with the following steps:
   *
   * 1. Authentication: Extract authenticated user from session context.
   *
   * 2. Authorization Check:
   *    - Verify user has valid member session and active employee record in the organization.
   *    - If user has time:manage permission → allow update on any timesheet.
   *    - If user is the owning employee (erp_hrm_employee_id matches) → allow only draft status timesheets.
   *    - Otherwise → deny with 403 Forbidden.
   *
   * 3. Fetch Target Timesheet:
   *    - Query erp_hrm_timesheets by timesheetId (UUID).
   *    - Return 404 if not found or soft-deleted.
   *    - Include employee relation for ownership verification.
   *
   * 4. Validate Update Payload:
   *    - If updating week_start_date: must be a Monday.
   *    - If updating week_end_date: must be a Sunday.
   *    - week_start_date must be before or equal to week_end_date.
   *    - Cannot change status directly via this endpoint (use submit/approve/reject endpoints).
   *    - Cannot update rejection_reason directly.
   *
   * 5. Update Record:
   *    - Update only provided fields in request body.
   *    - Set updated_at to current timestamp.
   *    - If week dates change, recalculate and update total_hours from included timelogs.
   *
   * 6. Return updated timesheet with all relations loaded (employee, reviewerEmployee, included timelogs).
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
   * Removes a timesheet from the system by marking it as deleted.
   *
   * This operation performs a soft delete on the specified timesheet by setting its deleted_at timestamp, preserving the record for audit purposes while hiding it from active views. The timesheet must belong to the requesting user's organization context.
   *
   * **Authorization Requirements:**
   * The requesting user must either own the timesheet (be the employee who created it) or possess the time:manage permission to delete any employee's timesheet. Users without these permissions receive an access denied error.
   *
   * **Timesheet Status Handling:**
   * - Draft timesheets: Can be freely deleted by the owning employee or users with time:manage permission
   * - Submitted timesheets: Cannot be deleted; returns error indicating timesheet is pending approval
   * - Approved timesheets: Cannot be deleted; returns error indicating timesheet is already reviewed
   * - Rejected timesheets: Can be deleted by the owning employee or users with time:manage permission
   *
   * **Cascade Behavior:**
   * When a timesheet is deleted, all timelog associations in the erp_hrm_timesheet_timelogs junction table are permanently removed. This disconnects the timelog entries from the timesheet without deleting the actual timelog records themselves. The individual timelog entries remain available for inclusion in other timesheets.
   *
   * **Related Operations:**
   * - POST /timesheets to create a new timesheet
   * - PATCH /timesheets/{timesheetId}/submit to submit a draft timesheet for approval
   * - PATCH /timesheets/{timesheetId}/approve to approve a submitted timesheet
   * - PATCH /timesheets/{timesheetId}/reject to reject a submitted timesheet with reason
   *
   * @param connection
   * @param timesheetId Unique identifier of the timesheet to delete
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Extract timesheetId from path parameter and validate it is a valid UUID format
   * 2. Retrieve the current user's session and verify authentication
   * 3. Load the timesheet from erp_hrm_timesheets table using the timesheetId
   * 4. Verify the timesheet exists and belongs to the current organization context
   * 5. If timesheet not found, return 404 error with 'Timesheet not found'
   * 6. If timesheet is soft-deleted (deleted_at is not null), return 404 error
   * 7. Verify authorization:
   *    - Check if current user owns the timesheet (erp_hrm_employee_id matches user's employee)
   *    - OR check if current user has time:manage permission
   * 8. If not authorized, return 403 access denied error
   * 9. Check timesheet status:
   *    - If status is 'submitted', return 400 error: 'Cannot delete a submitted timesheet'
   *    - If status is 'approved', return 400 error: 'Cannot delete an approved timesheet'
   * 10. Begin database transaction:
   *     a. Delete all records from erp_hrm_timesheet_timelogs junction table where timesheet_id matches
   *     b. Set deleted_at = current timestamp on erp_hrm_timesheets record
   * 11. Commit transaction
   * 12. Return 204 No Content on success
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
   * Submit a draft timesheet for manager approval.
   *
   * This endpoint transitions a draft timesheet to submitted status, placing it in the approval queue for review by users with time approval permission. The submission process validates that the timesheet contains at least one timelog and that no duplicate submission exists for the same employee and week period.
   *
   * Upon successful submission, the timesheet status changes to submitted and the submitted_at timestamp is recorded. A submitted timesheet becomes locked and cannot be modified by the employee until it has been reviewed and either approved or rejected.
   *
   * The authenticated employee must own the timesheet being submitted. Timesheets belonging to other employees cannot be submitted through this endpoint.
   *
   * Related operations:
   * - PATCH /timesheets (index) - List timesheets with filtering by status
   * - GET /timesheets/{timesheetId} (at) - Retrieve single timesheet details
   * - POST /timesheets/{timesheetId}/approve - Approve a submitted timesheet
   * - POST /timesheets/{timesheetId}/reject - Reject a submitted timesheet with reason
   *
   * @param connection
   * @param timesheetId Unique identifier of the timesheet to submit
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Submit a draft timesheet for approval workflow.
   *
   * Implementation steps:
   * 1. Extract timesheetId from path parameter
   * 2. Retrieve timesheet from erp_hrm_timesheets table by ID
   * 3. Validate timesheet exists and is not soft-deleted (deleted_at is null)
   * 4. Validate timesheet belongs to the authenticated employee (via session employee context)
   * 5. Validate timesheet status is 'draft' - reject if already submitted, approved, or rejected
   * 6. Count associated timelogs via erp_hrm_timesheet_timelogs junction table
   * 7. If count is zero, reject with error: 'timesheet must contain at least one timelog before submission'
   * 8. Check for duplicate submission: query erp_hrm_timesheets where erp_hrm_employee_id matches, week_start_date equals, and status IN ('submitted', 'approved'), excluding current timesheet
   * 9. If duplicate found, reject with error: 'a timesheet for this week has already been submitted or approved'
   * 10. Update timesheet: set status to 'submitted', set submitted_at to current timestamp
   * 11. Return the updated timesheet with all related data
   *
   * Transaction: All validations and update should execute within a single database transaction.
   *
   * Error responses:
   * - 404: Timesheet not found or deleted
   * - 403: Timesheet does not belong to authenticated employee
   * - 409: Timesheet not in draft status OR duplicate submission exists
   * - 422: Timesheet contains no timelogs
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
   * Approve a submitted timesheet, transitioning it to approved status.
   *
   * This endpoint allows users with time:approve permission to formally accept a submitted timesheet. Upon approval, the timesheet status changes from submitted to approved, all contained timelogs become locked and cannot be edited or deleted, and the approval metadata (reviewer and timestamp) is recorded.
   *
   * The approval action is idempotent - approving an already-approved timesheet returns success without re-recording the approval. The reviewer_employee_id field is populated with the employee record of the approving user, and the reviewed_at timestamp records the exact moment of approval. This information is immutable once recorded.
   *
   * The timesheet must be in submitted status for approval to succeed. Draft timesheets cannot be approved directly - they must be submitted first by the owning employee. Rejected timesheets that have been corrected and re-submitted can be approved.
   *
   * Approval does not require a reason - only rejection requires mandatory justification. The rejection_reason field remains null for approved timesheets.
   *
   * This operation is part of the timesheet approval workflow alongside the reject action which requires a mandatory rejection reason. Users with time:approve permission can access both approval and rejection operations for any submitted timesheet within their organization.
   *
   * @param connection
   * @param timesheetId Unique identifier of the timesheet to approve. Must be a submitted timesheet belonging to an employee in the same organization as the approving user.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Retrieve the target timesheet by timesheetId from erp_hrm_timesheets table
   * 2. Validate timesheet exists and is not soft-deleted (deleted_at is null)
   * 3. Validate timesheet status is 'submitted' - return error if timesheet is in draft, approved, or rejected status
   * 4. Validate requesting user has time:approve permission in the organization context
   * 5. Verify the timesheet belongs to the same organization as the requesting user's employee record
   * 6. Begin database transaction
   * 7. Update timesheet: set status to 'approved', reviewer_employee_id to current user's employee ID, reviewed_at to current timestamp
   * 8. The total_hours field already contains the calculated value from included timelogs
   * 9. Commit transaction
   * 10. Return the updated timesheet with reviewer information included
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
   * Reject a submitted timesheet and return it to draft status.
   *
   * This operation allows authorized reviewers to reject timesheets that require corrections. When a timesheet is rejected, it transitions from submitted status back to draft status, allowing the employee to make the necessary changes and resubmit.
   *
   * The rejection requires a mandatory reason that explains why the timesheet was rejected. This reason is stored with the timesheet and displayed to the employee when viewing the rejected timesheet. The reviewer information is recorded for audit trail purposes.
   *
   * When a timesheet is rejected, all timelogs that were included in the timesheet become unlocked again. This allows the employee to edit or remove timelogs before resubmitting the timesheet for approval.
   *
   * The operation requires the time:approve permission within the current organization context. Users without this permission receive an access denied error.
   *
   * @param connection
   * @param timesheetId Unique identifier of the timesheet to reject
   * @param body Rejection reason explaining why the timesheet is being rejected (required)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query the erp_hrm_timesheets table to find the timesheet by timesheetId. Verify the timesheet exists and belongs to the current organization context. Verify the timesheet status is 'submitted'. If status is not submitted, return an error indicating the timesheet cannot be rejected because it is not in submitted status.
   *
   * Validate that the request body contains a non-empty rejection_reason field. If rejection_reason is missing or empty, return a validation error requiring the rejection reason.
   *
   * Update the timesheet record: set status to 'rejected', store the rejection_reason from request body, set reviewed_at to current timestamp, set reviewer_employee_id to the authenticated user's employee ID.
   *
   * Update all timelogs associated with this timesheet via erp_hrm_timesheet_timelogs junction table: remove the timesheet association or unlock the timelogs for editing.
   *
   * Return the complete updated timesheet including the rejection_reason and reviewer information.
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
