import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmPlatformTimesheet } from "../../../../api/structures/IHrmPlatformTimesheet";
import { IPageIHrmPlatformTimesheet } from "../../../../api/structures/IPageIHrmPlatformTimesheet";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteHrmPlatformMemberTimesheetsTimesheetId } from "../../../../providers/deleteHrmPlatformMemberTimesheetsTimesheetId";
import { getHrmPlatformMemberTimesheetsTimesheetId } from "../../../../providers/getHrmPlatformMemberTimesheetsTimesheetId";
import { patchHrmPlatformMemberTimesheets } from "../../../../providers/patchHrmPlatformMemberTimesheets";
import { postHrmPlatformMemberTimesheets } from "../../../../providers/postHrmPlatformMemberTimesheets";
import { putHrmPlatformMemberTimesheetsTimesheetId } from "../../../../providers/putHrmPlatformMemberTimesheetsTimesheetId";

@Controller("/hrmPlatform/member/timesheets")
export class HrmplatformMemberTimesheetsController {
  /**
   * Create a new draft timesheet for the authenticated employee covering a specific calendar week.
   *
   * This operation initializes a weekly timesheet record that aggregates all time entries (timelogs) logged by the employee during the specified week. The timesheet begins in draft status, allowing the employee to review and modify the included time entries before submission for approval.
   *
   * The timesheet covers a full calendar week from Monday through Sunday, with the week_start_date parameter specifying the Monday that begins the week. Upon creation, the system automatically calculates total hours by summing all timelog durations for that week and associates them with the new timesheet.
   *
   * Security: Only authenticated members with employee records can create timesheets. Each employee can only create timesheets for their own work records. The system prevents creation of duplicate timesheets for the same week if another timesheet already exists in submitted or approved status.
   *
   * Business rules enforced:
   * - Only one timesheet per employee per week can exist in submitted or approved status
   * - Timesheets must be created for complete weeks (Monday to Sunday)
   * - Draft timesheets can be modified before submission
   * - The timesheet automatically includes all timelogs for the specified week
   *
   * Related operations:
   * - PATCH /timesheets to list and filter timesheets
   * - GET /timesheets/{timesheetId} to view specific timesheet details
   * - PUT /timesheets/{timesheetId}/submit to submit for approval
   * - PUT /timesheets/{timesheetId}/approve to approve a timesheet
   *
   * @param connection
   * @param body Timesheet creation data specifying the week to cover
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Service layer implementation for creating draft timesheets:
   *
   * 1. Authentication & Authorization:
   *    - Extract authenticated member ID from JWT session
   *    - Retrieve employee record for the authenticated member in the current organization context
   *    - Validate employee status is 'active' (deactivated employees cannot create timesheets)
   *
   * 2. Input Validation:
   *    - Validate week_start_date is a valid Monday date
   *    - Ensure week_start_date is not in the future (prevent future timesheet creation)
   *    - Check week_start_date format and timezone handling
   *
   * 3. Duplicate Prevention:
   *    - Query existing timesheets for the same employee and week_start_date
   *    - If a timesheet exists with status 'submitted' or 'approved', reject creation
   *    - Allow creation if existing timesheet is in 'draft' or 'rejected' status (will be updated instead)
   *
   * 4. Timelog Aggregation:
   *    - Query all timelogs for the employee within the week date range (Monday 00:00 to Sunday 23:59:59)
   *    - Calculate total_hours by summing duration (in minutes) and converting to decimal hours
   *    - Store list of included timelog IDs for reference
   *
   * 5. Timesheet Creation:
   *    - Create new timesheet record with:
   *      - hrm_platform_employee_id: authenticated employee
   *      - week_start_date: provided Monday date
   *      - status: 'draft'
   *      - total_hours: calculated sum from timelogs
   *      - submitted_at, approved_at, rejected_at: null
   *      - approver_id: null
   *      - rejection_reason: null
   *    - Set created_at and updated_at timestamps
   *
   * 6. Response:
   *    - Return complete timesheet object with included timelog summaries
   *    - Include calculated total hours and week date range
   *
   * Edge cases:
   * - Handle case where no timelogs exist for the week (create empty draft, but prevent submission)
   * - Handle timezone conversions for week boundary calculations
   * - Ensure atomic transaction for timesheet creation and timelog association
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IHrmPlatformTimesheet.ICreate,
  ): Promise<IHrmPlatformTimesheet> {
    try {
      return await postHrmPlatformMemberTimesheets({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of weekly timesheets for time tracking and approval management.
   *
   * This operation provides comprehensive search capabilities for timesheets, allowing users to filter by status (draft, submitted, approved, rejected), date range, and employee. Each timesheet represents a week's worth of time entries (Monday to Sunday) aggregated for a specific employee.
   *
   * Authorization is role-based: employees can view their own timesheets, while users with time approve permission can view all submitted timesheets in the organization. Admins have full visibility across all timesheets.
   *
   * The response includes timesheet summary information such as week start date, status, total hours worked, employee details, and approval information. For rejected timesheets, the rejection reason is included to help employees understand necessary corrections.
   *
   * Related operations include creating draft timesheets (POST /timesheets), viewing individual timesheet details (GET /timesheets/{timesheetId}), submitting timesheets for approval (PUT /timesheets/{timesheetId}/submit), and approving or rejecting timesheets (PUT /timesheets/{timesheetId}/approve, PUT /timesheets/{timesheetId}/reject).
   *
   * @param connection
   * @param body Search criteria and pagination parameters for timesheet listing
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query hrm_platform_timesheets table with pagination and filtering.
   *
   * 1. Extract search criteria from request body: status filter, date range (week_start_date), employee_id filter, organization_id from current user context.
   *
   * 2. Apply authorization filters:
   *    - For regular employees: filter by hrm_platform_employee_id = current user's employee_id
   *    - For users with time approve permission: allow viewing all timesheets in organization
   *    - For admins: allow viewing all timesheets across organization
   *
   * 3. Apply status filter if provided (draft, submitted, approved, rejected).
   *
   * 4. Apply date range filter on week_start_date field if provided.
   *
   * 5. Apply employee_id filter if provided (for managers viewing specific employee's timesheets).
   *
   * 6. Join with hrm_platform_employees to get employee name and approver name.
   *
   * 7. Calculate total_hours is already stored in timesheet table.
   *
   * 8. Apply pagination: limit and offset based on request parameters.
   *
   * 9. Apply sorting: default by week_start_date descending, allow custom sorting.
   *
   * 10. Return paginated response with timesheet summaries including:
   *     - id, week_start_date, status, total_hours
   *     - employee information (id, name)
   *     - approver information if approved/rejected
   *     - submitted_at, approved_at, rejected_at timestamps
   *     - rejection_reason if rejected
   *
   * 11. Handle edge cases:
   *     - Empty result set returns empty data array with pagination info
   *     - Invalid status values return 400 error
   *     - Missing organization context returns 401 error
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IHrmPlatformTimesheet.IRequest,
  ): Promise<IPageIHrmPlatformTimesheet.ISummary> {
    try {
      return await patchHrmPlatformMemberTimesheets({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information for a specific timesheet by its unique identifier.
   *
   * This operation returns complete timesheet data including the employee who owns the timesheet, the approver (if approved or rejected), the week start date, current status, total hours worked, and all approval workflow timestamps. The response includes the rejection reason if the timesheet was rejected by an authorized reviewer.
   *
   * Timesheets progress through four distinct status states: draft (initial state, editable by employee), submitted (awaiting approval), approved (finalized, timelogs locked), and rejected (returned to draft with rejection reason). The status field indicates the current position in this approval workflow.
   *
   * Authorization is enforced based on role permissions. Members can view timesheets they own. Users with the time:view_all permission or admin roles can view all timesheets within their organization context. The approver relationship shows which employee performed the approval or rejection action.
   *
   * Related operations include listing timesheets with filtering (PATCH /timesheets), and viewing individual timelogs that comprise the timesheet. The total hours field is calculated by summing all timelog durations included in this timesheet and is displayed as decimal hours.
   *
   * @param connection
   * @param timesheetId Unique identifier of the timesheet to retrieve
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query the hrm_platform_timesheets table for a single record matching the provided timesheetId UUID.
   *
   * Perform authorization check: verify the authenticated user either owns the timesheet (matches hrm_platform_employee_id) or has time:view_all permission or admin role. Deny access if neither condition is met.
   *
   * Join with hrm_platform_employees table twice: once for the employee owner (hrm_platform_employee_id) and once for the approver (approver_id, optional). Include employee details in the response.
   *
   * Return the timesheet record with all fields: id, hrm_platform_employee_id, approver_id, week_start_date, status, total_hours, submitted_at, approved_at, rejected_at, rejection_reason, created_at, updated_at.
   *
   * Handle soft-deleted records: exclude timesheets where deleted_at is not null from the query results.
   *
   * Return 404 Not Found if no timesheet exists with the given ID or if the timesheet is soft-deleted.
   *
   * Return 403 Forbidden if the user is not authorized to view this timesheet.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":timesheetId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
  ): Promise<IHrmPlatformTimesheet> {
    try {
      return await getHrmPlatformMemberTimesheetsTimesheetId({
        member,
        timesheetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing timesheet with new information.
   *
   * This operation allows modification of timesheet properties for timesheets that are in draft status. Once a timesheet is submitted, approved, or rejected, it cannot be modified through this endpoint - specific action endpoints must be used instead (submit, approve, reject).
   *
   * The primary use case for this operation is to adjust the week_start_date of a draft timesheet if it was created for the wrong week. When the week_start_date is changed, the system automatically recalculates the total_hours by aggregating all timelogs that fall within the new week range.
   *
   * Security considerations: Only the employee who owns the timesheet or users with time:manage permission can update timesheets. The operation validates that the timesheet is in draft status before allowing any modifications. Attempting to update a submitted, approved, or rejected timesheet will result in an error.
   *
   * Related operations: Use POST /timesheets/{timesheetId}/submit to submit a draft timesheet for approval. Use POST /timesheets/{timesheetId}/approve or POST /timesheets/{timesheetId}/reject for approval actions. Use GET /timesheets/{timesheetId} to view timesheet details.
   *
   * @param connection
   * @param timesheetId Unique identifier of the timesheet to update
   * @param body Updated timesheet information
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Update a timesheet identified by timesheetId.
   *
   * 1. Validate the timesheetId exists and belongs to the requesting employee's organization.
   * 2. Verify the timesheet status is 'draft' - only draft timesheets can be updated.
   * 3. If status is not 'draft', return 400 Bad Request with appropriate error message.
   * 4. Validate the request body fields:
   *    - week_start_date: Must be a Monday, must not overlap with existing submitted/approved timesheets for this employee
   * 5. Update the timesheet fields in hrm_platform_timesheets table.
   * 6. Recalculate total_hours by summing all timelog durations for the week if week_start_date changed.
   * 7. Update updated_at timestamp.
   * 8. Record the update in activity_logs.
   * 9. Return the updated timesheet with full details including timelogs.
   *
   * Authorization: Only the timesheet owner (employee) or users with time:manage permission can update timesheets.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":timesheetId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmPlatformTimesheet.IUpdate,
  ): Promise<IHrmPlatformTimesheet> {
    try {
      return await putHrmPlatformMemberTimesheetsTimesheetId({
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
   * Delete a timesheet record from the system.
   *
   * This operation allows employees and authorized users to remove timesheet records that are in draft status. Timesheets that have been submitted for approval or already approved cannot be deleted to preserve audit trails and maintain data integrity for payroll and reporting purposes.
   *
   * Only timesheets with 'draft' status can be deleted. Attempting to delete a timesheet with 'submitted', 'approved', or 'rejected' status will result in an error. The system validates that the requesting user has appropriate permissions - either they own the timesheet (are the associated employee) or they have time management permissions that allow them to manage timesheets for other employees.
   *
   * When a timesheet is successfully deleted, all associated timelog records that are not part of other timesheets are also removed. The deletion event is recorded in the activity log for audit purposes. This operation is irreversible - once a timesheet is deleted, it cannot be recovered.
   *
   * Related operations include GET /timesheets/{timesheetId} for viewing timesheet details, PATCH /timesheets for listing timesheets with filters, and POST /timesheets for creating new timesheets.
   *
   * @param connection
   * @param timesheetId Target timesheet's unique identifier
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query the hrm_platform_timesheets table for the timesheet with the given ID.
   *
   * Validate that the timesheet exists and belongs to the requesting user's organization.
   *
   * Check authorization: verify the requesting employee is either the timesheet owner (employee_id matches) or has time management permission.
   *
   * Validate timesheet status: only allow deletion if status is 'draft'. Reject deletion attempts for 'submitted', 'approved', or 'rejected' timesheets with appropriate error message.
   *
   * Before deletion, check if any timelogs in this timesheet are referenced by other timesheets. If so, handle appropriately.
   *
   * Delete the timesheet record from hrm_platform_timesheets table.
   *
   * Delete associated timelog records from hrm_platform_timelogs table that are only referenced by this timesheet.
   *
   * Create an activity log entry in hrm_platform_activity_logs table recording the deletion event with user, timestamp, and affected timesheet ID.
   *
   * Return 204 No Content on successful deletion.
   *
   * Return 404 Not Found if timesheet does not exist.
   *
   * Return 403 Forbidden if user lacks authorization.
   *
   * Return 409 Conflict if timesheet status is not 'draft'.
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
      return await deleteHrmPlatformMemberTimesheetsTimesheetId({
        member,
        timesheetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
