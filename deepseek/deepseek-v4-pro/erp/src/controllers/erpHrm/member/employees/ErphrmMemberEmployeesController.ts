import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmEmployee } from "../../../../api/structures/IErpHrmEmployee";
import { IPageIErpHrmEmployee } from "../../../../api/structures/IPageIErpHrmEmployee";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteErpHrmMemberEmployeesEmployeeId } from "../../../../providers/deleteErpHrmMemberEmployeesEmployeeId";
import { getErpHrmMemberEmployeesEmployeeId } from "../../../../providers/getErpHrmMemberEmployeesEmployeeId";
import { patchErpHrmMemberEmployees } from "../../../../providers/patchErpHrmMemberEmployees";
import { postErpHrmMemberEmployees } from "../../../../providers/postErpHrmMemberEmployees";
import { postErpHrmMemberEmployeesEmployeeIdDeactivate } from "../../../../providers/postErpHrmMemberEmployeesEmployeeIdDeactivate";
import { postErpHrmMemberEmployeesEmployeeIdReactivate } from "../../../../providers/postErpHrmMemberEmployeesEmployeeIdReactivate";
import { putErpHrmMemberEmployeesEmployeeId } from "../../../../providers/putErpHrmMemberEmployeesEmployeeId";

@Controller("/erpHrm/member/employees")
export class ErphrmMemberEmployeesController {
  /**
   * Invite a new employee to join the organization by providing their email address.
   *
   * This endpoint initiates the employee onboarding flow. When the invited email address belongs to an existing user account, the system immediately adds that user as an employee of the organization with the specified role, department placement, position title, and employment type classification. The new employee becomes active immediately and can begin time tracking and project participation.
   *
   * When the invited email address does not match any existing user account, a pending invitation is created. The invitation will be automatically resolved when the invited person signs up with the matching email address, at which point they become an employee with the pre-configured role and settings.
   *
   * Only users with the employee management permission can invite new employees. The operation is scoped to the currently selected organization context. Self-invitation is blocked — an employee cannot invite their own email address.
   *
   * @param connection
   * @param body Employee invitation details including the invitee's email address, assigned role identifier, optional department placement, optional position title, and employment type classification.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Invite a new employee to join the organization by
     *   providing their email address.
   *
   * **Flow**:
   * 1. Validate that the authenticated user holds the `employee:manage` permission. Return 403 Forbidden if not.
   * 2. Validate the request body:
   *    - `email`: Must be a valid email format. Cannot be empty. Must not match the authenticated user's own email (self-invitation is rejected with 422 Unprocessable Entity).
   *    - `erp_hrm_role_id`: Must reference an existing, non-deleted role (`deleted_at IS NULL`) in the current organization (`erp_hrm_organization_id` matches session).
   *    - `erp_hrm_department_id` (optional): If provided, must reference an existing, non-deleted department (`deleted_at IS NULL`) in the current organization.
   *    - `employment_type`: Must be one of `full-time`, `part-time`, `contractor`, `intern`.
   *    - `position`: Optional free-text string for the employee's job title.
   * 3. Query `erp_hrm_members` by the provided email address:
   *    - **Member found**: Check that the member's account is not soft-deleted (`deleted_at IS NULL`). If soft-deleted, return 422 Unprocessable Entity. Check that the member is not already an employee in the current organization (enforced by `@@unique([erp_hrm_member_id, erp_hrm_organization_id])`). If already an employee, return 409 Conflict. Otherwise, create an `erp_hrm_employees` record with `status = 'active'`, link to the member via `erp_hrm_member_id`, and set the organization context from the session. Return 201 Created with the full employee record including joined member profile (display_name, email, avatar_image).
   *    - **Member not found**: Create a pending `erp_hrm_invitations` record for the provided email address with the specified role, department, position, and employment type. Return 202 Accepted with a response indicating the invitation is pending. The invitation will be resolved when the invited person signs up with a matching email.
   *
   * **Data Isolation**: The `erp_hrm_organization_id` is always derived from the authenticated user's currently selected organization context. All role and department lookups are scoped to this organization.
   *
   * **Real-time Event**: Upon successful employee creation, emit an `employee.created` event scoped to the organization.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmEmployee.ICreate,
  ): Promise<IErpHrmEmployee> {
    try {
      return await postErpHrmMemberEmployees({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Returns a paginated list of all employees within the currently selected organization.
   *
   * This endpoint provides the primary employee directory view, enabling users with the employee view or employee management permission to browse the workforce. The listing supports simultaneous filtering by department, employment type, and status, as well as name-based free-text search to locate specific individuals.
   *
   * When multiple filter criteria and a search term are applied together, the results include only employees who match all specified conditions. The response includes each employee's display name, position, employment type, current status, department assignment, and role — providing a comprehensive at-a-glance view suitable for administrative list displays and workforce overviews.
   *
   * Department assignment is optional — employees without a department are included in unfiltered results and excluded only when a specific department filter is active. Deactivated employees appear in results only when explicitly requested via the status filter.
   *
   * @param connection
   * @param body Search and filter criteria for browsing the employee list, including optional department filter, employment type filter, status filter, free-text name search, pagination parameters, and sort ordering.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Query the erp_hrm_employees table scoped to the
     *   currently selected organization (erp_hrm_organization_id). Exclude
     *   soft-deleted records (deleted_at IS NOT NULL).
   *
   * Apply filters from the request body:
   * - department filter: WHERE erp_hrm_department_id matches the provided department UUID
   * - employment_type filter: WHERE employment_type equals the provided value (full-time, part-time, contractor, or intern)
   * - status filter: WHERE status equals 'active' or 'deactivated'
   * - name search: JOIN erp_hrm_members and match against the member's display_name using ILIKE or trigram similarity (%search%)
   *
   * When multiple filters and a search term are applied simultaneously, combine them with AND so only employees matching all criteria are returned.
   *
   * Support cursor-based or offset pagination. Return employee summary records including: id, display name (joined from member), position, employment_type, status, department name (joined from department), role name (joined from role).
   *
   * Order results by display name ascending by default. Allow sort ordering by name, employment_type, status, or created_at via the request body.
   *
   * Enforce permission: require employee:view or employee:manage permission on the organization context.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmEmployee.IRequest,
  ): Promise<IPageIErpHrmEmployee.ISummary> {
    try {
      return await patchErpHrmMemberEmployees({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieves the complete profile of a single employee within the currently selected organization.
   *
   * The response includes the employee's organizational identity: their assigned role (with the role's name, built-in status, and description), optional department membership, position title, employment type classification (full-time, part-time, contractor, or intern), and current activity status (active or deactivated). The employee's user profile — display name and avatar from their global account — is also included.
   *
   * This endpoint requires the employee:view or employee:manage permission. Employees without either permission receive a 403 error. The employee record is strictly scoped to the active organization context; attempting to access an employee from another organization returns a 404 response.
   *
   * Deactivated employees are returned with their full historical data intact — deactivation only prevents new time tracking and timesheet submission, not record visibility.
   *
   * @param connection
   * @param employeeId Unique identifier of the employee within the current organization (UUID format).
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Query the erp_hrm_employees table by id within
     *   the current organization context (erp_hrm_organization_id = session
     *   organization).
   *
   * Join erp_hrm_roles on erp_hrm_role_id to include the assigned role's name, is_builtin flag, and description. Join erp_hrm_departments (LEFT JOIN — department is optional) on erp_hrm_department_id to include the department name if assigned. Join erp_hrm_members on erp_hrm_member_id to include the user's display name and avatar from their global profile.
   *
   * Authorization: require employee:view OR employee:manage permission. Reject with 403 if the requesting user lacks both permissions.
   *
   * Scope: the query must filter by erp_hrm_organization_id matching the session's active organization. If the employeeId exists but belongs to a different organization, return 404 (not found) rather than 403 to avoid leaking information about other organizations.
   *
   * Exclude soft-deleted employees (deleted_at IS NOT NULL) from results — return 404 if the employee has been soft-deleted.
   *
   * Return all columns: id, position, employment_type, status, created_at, updated_at, plus the joined member display name and avatar, role name/is_builtin/description, and department name (null if no department).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":employeeId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("employeeId")
    employeeId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmEmployee> {
    try {
      return await getErpHrmMemberEmployeesEmployeeId({
        member,
        employeeId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Updates an existing employee record within the currently selected organization.
   *
   * Modifies the employee's organizational attributes including role assignment, department placement, position title, employment type classification, and activity status. Role changes take effect immediately — the employee's permissions reflect the new role the moment the update is saved. Department reassignment affects how the employee appears in department-filtered lists and reports but carries no permission implications.
   *
   * When an employee's status is changed to deactivated, they can no longer create timelogs, submit timesheets, or participate in new project assignments, but all historical data (timelogs, timesheets, contracts, project memberships) is preserved intact. Deactivated employees can be reactivated by setting status back to active.
   *
   * This operation requires the employee:manage permission. The target employee must belong to the currently selected organization.
   *
   * @param connection
   * @param employeeId UUID of the employee record to update within the currently selected organization.
   * @param body Fields to update on the employee record. All fields are optional — only provided fields are modified; omitted fields retain their current values. Includes role assignment, department placement, position title, employment type classification, and activity status.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Update the erp_hrm_employees record identified by
     *   {employeeId}.
   *
   * **Authorization & Scoping**:
   * - Require employee:manage permission on the current organization.
   * - The target employee's erp_hrm_organization_id must match the current session's selected organization. Reject with 404 if the employee does not exist or belongs to a different organization.
   * - Exclude soft-deleted records (deleted_at IS NOT NULL) from lookup.
   *
   * **Field Validation**:
   * - erp_hrm_role_id (if provided): Must reference an existing erp_hrm_roles record belonging to the same organization. Reject with 422 if the role is not found in the organization.
   * - erp_hrm_department_id (if provided, nullable): Must reference an existing erp_hrm_departments record belonging to the same organization. Reject with 422 if the department is not found. Accept null to clear the department assignment.
   * - position (if provided, nullable): Free-text job title. Accept null to clear. No format constraints beyond max length.
   * - employment_type (if provided): Must be one of: full-time, part-time, contractor, intern. Reject with 422 for invalid values.
   * - status (if provided): Must be one of: active, deactivated. Reject with 422 for invalid values.
   *
   * **Database Operation**:
   * - UPDATE erp_hrm_employees SET the provided fields, touch updated_at to current timestamp.
   * - Only update fields that are present in the request body (partial update semantics — omitted fields retain their current values).
   * - Return the full updated record after the write completes.
   *
   * **Edge Cases**:
   * - Updating an already-deactivated employee's status to deactivated is idempotent — succeed without error.
   * - Changing role on a deactivated employee is permitted — the new role takes effect if/when the employee is reactivated.
   * - If the request body is empty (no fields to update), return the current record without modification.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":employeeId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("employeeId")
    employeeId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmEmployee.IUpdate,
  ): Promise<IErpHrmEmployee> {
    try {
      return await putErpHrmMemberEmployeesEmployeeId({
        member,
        employeeId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently erases an employee record from the organization while preserving all associated historical data for audit integrity.
   *
   * The erase operation performs a soft-delete by marking the employee record as removed. All timelogs, timesheets, contracts, and task history entries belonging to the employee remain intact and accessible through reports and historical views, ensuring that organizational time tracking and financial records are never compromised by employee removal.
   *
   * Upon erasure, the employee is immediately removed from all projects across the organization — their project membership records are permanently deleted. Any tasks previously assigned to the employee become unassigned but remain in their respective projects. Any running timer owned by the employee is silently discarded without creating a timelog.
   *
   * The erased employee will no longer appear in any employee list views, including when filtered by deactivated status. This is distinct from deactivation, which preserves the employee record in filtered views while blocking new actions.
   *
   * This operation requires the employee management permission and is scoped strictly to the currently selected organization context. The operation is blocked if the employee is the sole remaining Owner of the organization, ensuring at least one Owner remains at all times.
   *
   * @param connection
   * @param employeeId Unique identifier (UUID) of the employee record to erase within the current organization context.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Soft-delete an employee record by setting its
     *   deleted_at timestamp to the current time. This permanently removes the
     *   employee from all organizational views while preserving historical data
     *   for audit integrity.
   *
   * **Authorization**: Requires `employee:manage` permission. The Owner role implicitly holds all permissions and may perform this operation.
   *
   * **Organization Context**: The employee must belong to the currently selected organization. Cross-organization access is rejected.
   *
   * **Sole-Owner Restriction**: If the target employee holds the Owner role and is the sole remaining Owner of the organization, the operation SHALL be rejected. At least one Owner must remain in the organization after the erasure.
   *
   * **Implementation Steps**:
   * 1. Verify the requesting user holds `employee:manage` permission for the current organization.
   * 2. Query erp_hrm_employees for a record matching the given employeeId AND the current organization's erp_hrm_organization_id, where deleted_at IS NULL.
   * 3. If no matching record, return 404 not-found.
   * 4. If the employee is the sole Owner, query erp_hrm_employees for other employees with the Owner role in the same organization where deleted_at IS NULL. If none exist, return 409 conflict with a message indicating a successor Owner must be assigned first.
   * 5. Discard any running timer (erp_hrm_timers) belonging to this employee without creating a timelog.
   * 6. Set the employee's deleted_at to the current timestamp and persist.
   * 7. Delete all project membership records (erp_hrm_project_members) where erp_hrm_employee_id matches the employee.
   * 8. For all tasks (erp_hrm_tasks) assigned to this employee within the organization, set erp_hrm_employee_id to null — tasks remain in their projects but become unassigned.
   * 9. Do NOT cascade to timelogs, timesheets, contracts, or task history entries — these remain immutable historical records.
   *
   * **Edge Cases**:
   * - If the employee is already soft-deleted (deleted_at IS NOT NULL), return 404.
   * - Active contracts and pending timesheets do not block erasure — historical data is preserved intact.
   * - The employee's user account is unaffected; the user may still belong to other organizations.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":employeeId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("employeeId")
    employeeId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteErpHrmMemberEmployeesEmployeeId({
        member,
        employeeId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Deactivates an active employee, immediately suspending their ability to log time entries and submit timesheets within the organization.
   *
   * Deactivation is a reversible status change that marks the employee as inactive while preserving all historical records without modification. Timelogs, timesheets, contract records, and project assignments remain fully intact and can be accessed through appropriate read endpoints.
   *
   * This action requires the `employee:manage` permission. The operation is scoped to the acting user's currently selected organization — only employees within that organization can be deactivated.
   *
   * If the target employee is already deactivated, the operation completes successfully as a no-op, returning the employee's current state without any data modification.
   *
   * @param connection
   * @param employeeId UUID of the employee to deactivate. Scoped to the acting user's current organization context.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Deactivate an active employee by setting their
     *   status to 'deactivated'.
   *
   * **Authorization**: Requires `employee:manage` permission. The operation is scoped to the session's current organization (`erp_hrm_organization_id`).
   *
   * **Implementation steps**:
   * 1. Look up the employee by `employeeId` UUID within the session's current organization. Return 404 if the employee is not found or if `deleted_at` is set (soft-deleted records are excluded).
   * 2. If the employee's current `status` is already 'deactivated', return 200 with the existing employee record and a no-op indication — no database write is performed.
   * 3. Otherwise, update the employee record: set `status` to 'deactivated', set `updated_at` to the current timestamp.
   * 4. Return 200 with the updated employee record.
   *
   * **Side effects**: The deactivated employee can no longer create timelogs, edit existing timelogs, or submit timesheets. Existing project and task assignments are retained but effectively suspended. All historical data — timelogs, timesheets, contracts — is preserved without modification or deletion.
   *
   * **Edge cases**:
   * - Deactivating an already-deactivated employee → no-op, return current state.
   * - Employee belongs to a different organization → 404.
   * - Employee is soft-deleted → 404.
   * - Insufficient permissions → 403.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":employeeId/deactivate")
  public async deactivate(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("employeeId")
    employeeId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmEmployee> {
    try {
      return await postErpHrmMemberEmployeesEmployeeIdDeactivate({
        member,
        employeeId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Reactivates a previously deactivated employee, restoring their ability to log time entries, submit timesheets, and participate in projects and tasks within the organization.
   *
   * Reactivation is the inverse of deactivation. It restores an employee to active status without modifying any of their existing data — role assignment, department membership, position, employment type, and all historical records remain exactly as they were before deactivation. The reactivated employee's permissions take effect immediately based on their assigned role.
   *
   * If the employee is already active at the time of the request, the operation completes successfully without any changes to the record (no-op).
   *
   * Only users with the employee management permission can perform this operation.
   *
   * @param connection
   * @param employeeId UUID identifying the employee to reactivate within the currently selected organization.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Locate the employee by `employeeId` UUID within
     *   the currently selected organization context
     *   (`erp_hrm_organization_id`). Verify the employee record exists and
     *   belongs to the calling user's active organization — return 404 if not
     *   found or if the record has a non-null `deleted_at` timestamp.
   *
   * Authorization: the calling user must hold the `employee:manage` permission within the organization. Return 403 if the permission is absent.
   *
   * Check the current `status` column:
   * - If already `active`, respond with 200 and the employee record as-is (no-op — per Section 210). No database write occurs.
   * - If `deactivated`, update the `status` column to `active` and set `updated_at` to the current timestamp. Return 200 with the updated employee record.
   *
   * No other fields are modified during reactivation. The employee retains their existing role (`erp_hrm_role_id`), department (`erp_hrm_department_id`), position, and employment type. All historical data — timelogs, timesheets, contracts, and project memberships — is already preserved and requires no action.
   *
   * After reactivation, the employee can immediately log time entries, submit timesheets, and be assigned to projects and tasks per their role permissions.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":employeeId/reactivate")
  public async reactivate(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("employeeId")
    employeeId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmEmployee> {
    try {
      return await postErpHrmMemberEmployeesEmployeeIdReactivate({
        member,
        employeeId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
