import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmPlatformEmployee } from "../../../../api/structures/IHrmPlatformEmployee";
import { IPageIHrmPlatformEmployee } from "../../../../api/structures/IPageIHrmPlatformEmployee";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteHrmPlatformMemberEmployeesEmployeeId } from "../../../../providers/deleteHrmPlatformMemberEmployeesEmployeeId";
import { getHrmPlatformMemberEmployeesEmployeeId } from "../../../../providers/getHrmPlatformMemberEmployeesEmployeeId";
import { patchHrmPlatformMemberEmployees } from "../../../../providers/patchHrmPlatformMemberEmployees";
import { postHrmPlatformMemberEmployees } from "../../../../providers/postHrmPlatformMemberEmployees";
import { putHrmPlatformMemberEmployeesEmployeeId } from "../../../../providers/putHrmPlatformMemberEmployeesEmployeeId";

@Controller("/hrmPlatform/member/employees")
export class HrmplatformMemberEmployeesController {
  /**
   * Create a new employee record within an organization, establishing the employment relationship between a user account and the organization.
   *
   * This operation requires the employee:manage permission and is typically used by organization owners, managers, or administrators to add new team members to the organization. The employee record links an existing user account to the organization with a specific role assignment, department placement, position title, employment type, and initial status.
   *
   * The employee record serves as the primary entity for time tracking, project membership, contract management, and activity logging within the organization. Each user can have at most one employee record per organization, enforced by a unique constraint on the organization and user combination.
   *
   * When creating an employee, you must specify the user to associate (by user ID), the role to assign within the organization, and the employment details including employment type (full-time, part-time, contractor, or intern) and initial status (active or deactivated). The department assignment is optional and can be left null if the employee is not assigned to a specific department.
   *
   * Related operations include: GET /employees to retrieve the employee list, GET /employees/{employeeId} to retrieve employee details, PUT /employees/{employeeId} to update employee information, and DELETE /employees/{employeeId} to deactivate or remove an employee record.
   *
   * @param connection
   * @param body Employee creation information including user reference, role assignment, department, position, employment type, and initial status
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Service layer implementation:
   *
   * 1. Validate authentication: Ensure request is from authenticated member actor
   * 2. Validate permission: Check user has employee:manage permission in the organization context
   * 3. Validate user existence: Verify hrm_platform_user_id references an existing member account
   * 4. Validate organization context: Ensure organization_id from session exists and is not deleted
   * 5. Validate role existence: Verify hrm_platform_role_id references a valid role in the organization
   * 6. Validate uniqueness: Check no existing employee record with same [organization_id, user_id] combination (including soft-deleted records if soft-delete is enforced)
   * 7. Validate employment_type: Must be one of 'full-time', 'part-time', 'contractor', 'intern'
   * 8. Validate status: Must be one of 'active', 'deactivated'
   * 9. Validate department (if provided): Must exist in organization or be null
   * 10. Create employee record with:
   *     - Generate UUID for id
   *     - Set hrm_platform_user_id from request
   *     - Set hrm_platform_organization_id from session context
   *     - Set hrm_platform_role_id from request
   *     - Set hrm_platform_department_id from request (nullable)
   *     - Set position from request (nullable)
   *     - Set employment_type from request
   *     - Set status from request (default: 'active')
   *     - Set created_at and updated_at to current timestamp
   *     - Set deleted_at to null
   * 11. Record activity log entry for employee creation
   * 12. Return created employee entity with all fields
   *
   * Edge cases:
   * - User already has employee record in this organization: Return 409 Conflict
   * - Invalid role ID: Return 400 Bad Request
   * - Invalid employment type: Return 400 Bad Request
   * - Invalid status: Return 400 Bad Request
   * - Department not in organization: Return 400 Bad Request
   * - User not found: Return 404 Not Found
   * - Organization not found or deleted: Return 404 Not Found
   * - Missing employee:manage permission: Return 403 Forbidden
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IHrmPlatformEmployee.ICreate,
  ): Promise<IHrmPlatformEmployee> {
    try {
      return await postHrmPlatformMemberEmployees({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of employee records within the current organization context.
   *
   * This operation provides comprehensive search capabilities for browsing employees across the organization. Users can filter by department assignment, employment type, and employment status to narrow the result set. Name-based search enables finding specific employees through partial text matching on the associated user's display name.
   *
   * The response includes employee summary information optimized for list displays, containing essential fields such as employee identifier, role, department, position, employment type, and current status. All results are scoped to the organization context provided in the request authentication.
   *
   * Access to this endpoint requires the employee:view permission. Users without this permission will receive an authorization error. The operation supports cursor-based pagination for efficient handling of large employee datasets.
   *
   * @param connection
   * @param body Search criteria, pagination, and sorting parameters for employee list retrieval
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query hrm_platform_employees table with organization context filtering.
   *
   * Implement cursor-based pagination with configurable page size (default 20, max 100).
   *
   * Apply search filters:
   * - name: JOIN hrm_platform_members table, filter by display_name using ILIKE with wildcard
   * - departmentId: Filter by hrm_platform_department_id (nullable)
   * - employmentType: Filter by employment_type exact match
   * - status: Filter by status exact match ('active' or 'deactivated')
   *
   * Sort by createdAt descending by default, support custom sort fields.
   *
   * Validate user has employee:view permission before executing query.
   *
   * Return paginated response with cursor pagination tokens and total count.
   *
   * Include role and department summary objects in response by joining hrm_platform_roles and hrm_platform_departments tables.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IHrmPlatformEmployee.IRequest,
  ): Promise<IPageIHrmPlatformEmployee.ISummary> {
    try {
      return await patchHrmPlatformMemberEmployees({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information for a specific employee record within an organization.
   *
   * This operation provides comprehensive employee data including personal information, role assignment, department membership, position title, employment type, and current status. The employee record serves as the central entity connecting users to their organizational context and enabling time tracking, project membership, and contract management.
   *
   * Access to this endpoint requires the member actor to have the employee:view permission within the target organization. Users with employee:manage permission can also access this endpoint and additionally have rights to modify employee records through the update operation.
   *
   * The response includes embedded summaries of the employee's assigned role and department, providing complete context without requiring additional API calls. For employees without department assignment, the department field will be null.
   *
   * Related operations include PATCH /employees for listing and searching employees, PUT /employees/{employeeId} for updating employee records, and GET /employees/{employeeId}/contracts for retrieving the employee's contract history.
   *
   * @param connection
   * @param employeeId Target employee's unique identifier (UUID)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query the hrm_platform_employees table by employeeId UUID within the authenticated organization context.
   *
   * Validate the requesting user has employee:view permission for the target organization.
   *
   * Perform JOIN operations to fetch related role (hrm_platform_roles) and department (hrm_platform_departments) information.
   *
   * Include soft-deleted employee records in results but mark them appropriately - deactivated employees have status='deactivated' and may have deleted_at timestamp.
   *
   * Return 404 if employeeId does not exist or does not belong to the authenticated organization.
   *
   * Return 403 if user lacks employee:view permission.
   *
   * Response includes: id, userId, organizationId, roleId, departmentId, position, employmentType, status, createdAt, updatedAt, deletedAt, plus embedded role and department summary objects.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":employeeId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("employeeId")
    employeeId: string & tags.Format<"uuid">,
  ): Promise<IHrmPlatformEmployee> {
    try {
      return await getHrmPlatformMemberEmployeesEmployeeId({
        member,
        employeeId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing employee record within an organization.
   *
   * This operation allows authorized users to modify specific employee attributes including department assignment, job position/title, and employment type. The operation is scoped to the organization context and requires employee management permission.
   *
   * Users with employee:manage permission can update the department assignment for any employee in the organization, allowing reassignment to different organizational units. The position or title field can be updated to reflect changes in the employee's job role. Employment type can be modified to reflect changes in work arrangement (full-time, part-time, contractor, or intern).
   *
   * The system enforces strict permission validation before allowing any modifications. Users without employee:manage permission will receive an authorization error. The employee's status and user account reference cannot be modified through this operation - status changes require separate deactivate/reactivate operations, and the user reference is immutable after employee creation.
   *
   * All changes to employee records are automatically recorded in the activity log with timestamp and the identity of the user who made the change, ensuring audit trail compliance. The operation validates that the target department exists within the organization before assigning it to the employee.
   *
   * Related operations include GET /employees/{employeeId} for retrieving employee details, PATCH /employees for listing employees with filters, and POST /employees for creating new employee records.
   *
   * @param connection
   * @param employeeId Unique identifier of the employee to update (global scope)
   * @param body Employee update information containing optional fields for department, position, and employment type
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement PUT operation for updating employee records in hrm_platform_employees table.
   *
   * Service layer logic:
   * 1. Validate organization context from authentication token
   * 2. Verify user has employee:manage permission in the organization
   * 3. Fetch employee record by employeeId and organizationId
   * 4. Validate employee exists and belongs to the organization
   * 5. Validate employee is not soft-deleted (deleted_at is null)
   * 6. For each provided field in request body:
   *    - departmentId: Validate department exists in organization, update hrm_platform_department_id
   *    - position: Update position string field if provided
   *    - employmentType: Validate against allowed values (full-time, part-time, contractor, intern), update employment_type field
   * 7. Do NOT modify hrm_platform_user_id or status fields
   * 8. Update updated_at timestamp to current time
   * 9. Save changes to database
   * 10. Log activity to hrm_platform_activity_logs with action type 'employee.update'
   * 11. Return updated employee entity
   *
   * Validation rules:
   * - employeeId must be valid UUID format
   * - departmentId (if provided) must reference existing department in same organization
   * - employmentType must be one of: full-time, part-time, contractor, intern
   * - position (if provided) must not exceed database column length limit
   *
   * Error scenarios:
   * - 401 Unauthorized: User not authenticated
   * - 403 Forbidden: User lacks employee:manage permission
   * - 404 Not Found: Employee not found or soft-deleted
   * - 400 Bad Request: Invalid departmentId or employmentType value
   * - 409 Conflict: Employee record modified concurrently
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":employeeId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("employeeId")
    employeeId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmPlatformEmployee.IUpdate,
  ): Promise<IHrmPlatformEmployee> {
    try {
      return await putHrmPlatformMemberEmployeesEmployeeId({
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
   * Deactivate an employee record within the current organization context.
   *
   * This operation performs a soft delete on the employee record, preserving all historical data for compliance and audit purposes. The employee's user account remains active globally, but their employment relationship with this specific organization is terminated.
   *
   * When an employee is deactivated, they immediately lose access to organization-specific resources including time tracking, timesheet submission, and project participation. All existing timelogs, timesheets, contracts, and project memberships are preserved and remain visible in historical reports.
   *
   * The operation requires the requesting user to have either employee:manage or org:manage permission within the organization. If the employee being deactivated is the sole owner of the organization, ownership must be transferred to another employee before deletion can proceed.
   *
   * This is a soft delete operation: the employee record is marked as deleted (deleted_at timestamp set) and status changed to 'deactivated', but the record remains in the database for historical reference. The employee can be reactivated through a separate reactivation endpoint if needed.
   *
   * Related operations:
   * - `GET /employees/{employeeId}` to retrieve employee details before deletion
   * - `PATCH /employees/{employeeId}/reactivate` to restore a deactivated employee
   *
   * @param connection
   * @param employeeId UUID of the employee record to deactivate (scoped to current organization)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Validate employeeId exists in hrm_platform_employees table
   * 2. Verify employee belongs to current organization context
   * 3. Check user has employee:manage or org:manage permission
   * 4. Validate employee is not the sole owner (if owner, transfer ownership first)
   * 5. Set deleted_at to current timestamp (soft delete)
   * 6. Set status to 'deactivated'
   * 7. Cascade effects: employee cannot log time or submit timesheets
   * 8. Preserve all historical data: timelogs, timesheets, contracts, project memberships
   * 9. Return 204 No Content on success
   * 10. Return 404 if employee not found
   * 11. Return 403 if insufficient permissions
   * 12. Return 409 if employee is sole organization owner
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
      return await deleteHrmPlatformMemberEmployeesEmployeeId({
        member,
        employeeId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
