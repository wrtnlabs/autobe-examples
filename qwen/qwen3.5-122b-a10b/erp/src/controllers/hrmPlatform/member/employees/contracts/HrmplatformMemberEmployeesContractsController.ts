import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmPlatformContract } from "../../../../../api/structures/IHrmPlatformContract";
import { IPageIHrmPlatformContract } from "../../../../../api/structures/IPageIHrmPlatformContract";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { patchHrmPlatformMemberEmployeesEmployeeIdContracts } from "../../../../../providers/patchHrmPlatformMemberEmployeesEmployeeIdContracts";
import { postHrmPlatformMemberEmployeesEmployeeIdContracts } from "../../../../../providers/postHrmPlatformMemberEmployeesEmployeeIdContracts";

@Controller("/hrmPlatform/member/employees/:employeeId/contracts")
export class HrmplatformMemberEmployeesContractsController {
  /**
   * Create a new employment contract for a specific employee within the organization.
   *
   * This operation establishes or updates the employment agreement between the organization and an employee, recording critical compensation terms including pay rate, pay period, working hours per week, and optional notes about employment conditions.
   *
   * When a new contract is created, the system automatically handles the contract lifecycle by ending any existing active contract for the employee. The previous active contract's end date is set to one day before the new contract's start date, preserving the historical record of employment terms while ensuring only one contract remains active at any time.
   *
   * **Permission Requirements**
   *
   * Only users with the `employee:manage` permission can create contracts. This includes organization owners, managers, and users with custom roles that include the employee management capability. Employees cannot create contracts for themselves.
   *
   * **Contract Activation**
   *
   * The new contract becomes active immediately upon creation. The start date must be in the future or today, and cannot conflict with existing contract periods. The system validates date ranges to prevent overlapping contracts.
   *
   * **Historical Integrity**
   *
   * All contracts, including those that become inactive, are preserved as immutable historical records. Once a contract is ended (by end date or by a new contract), it cannot be edited. This ensures compliance with employment regulations and provides a complete audit trail of compensation changes.
   *
   * **Related Operations**
   *
   * - `GET /employees/{employeeId}/contracts` - Retrieve all contracts for an employee (active and historical)
   * - `PUT /employees/{employeeId}/contracts/{contractId}` - Update the currently active contract
   * - `GET /employees/{employeeId}/contracts/{contractId}` - Retrieve a specific contract's details
   *
   * @param connection
   * @param employeeId The employee's unique identifier (scoped to organization)
   * @param body Contract creation information including start date, compensation terms, and working hours
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement contract creation with the following logic:
   *
   * 1. **Authorization Check**: Verify the authenticated user has employee:manage permission for the employee's organization
   *
   * 2. **Employee Validation**:
   *    - Fetch the employee record by employeeId
   *    - Verify employee exists and belongs to the requesting user's organization
   *    - Verify employee status is 'active' (cannot create contract for deactivated employees)
   *
   * 3. **Existing Active Contract Handling**:
   *    - Query for any existing active contract (end_date IS NULL) for this employee
   *    - If found, update the existing contract's end_date to (new_contract.start_date - 1 day)
   *    - This automatically ends the previous contract and maintains historical integrity
   *
   * 4. **Contract Creation**:
   *    - Create new contract record with:
   *      - hrm_platform_employee_id: from path parameter
   *      - start_date: from request body (validate >= today)
   *      - end_date: null (active contract)
   *      - pay_rate: from request body (validate > 0)
   *      - pay_period: from request body (validate enum: hourly, daily, weekly, monthly)
   *      - working_hours_per_week: from request body (validate > 0)
   *      - notes: from request body (optional, nullable)
   *    - Set created_at and updated_at to current timestamp
   *    - Set deleted_at to null
   *
   * 5. **Transaction Management**: Wrap the contract end date update and new contract creation in a database transaction to ensure atomicity
   *
   * 6. **Error Handling**:
   *    - 404: Employee not found or not in organization
   *    - 403: User lacks employee:manage permission
   *    - 400: Invalid date range, pay rate, pay period, or working hours
   *    - 409: Employee already has an active contract with overlapping dates
   *
   * 7. **Response**: Return the created contract object with all fields
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("employeeId")
    employeeId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmPlatformContract.ICreate,
  ): Promise<IHrmPlatformContract> {
    try {
      return await postHrmPlatformMemberEmployeesEmployeeIdContracts({
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
   * Retrieve a filtered and paginated list of employment contracts for a specific employee. This operation provides access to the complete contract history, including both active and historical employment agreements.
   *
   * Each contract record contains comprehensive employment terms including the contract period (start_date and end_date), compensation details (pay_rate, pay_period, working_hours_per_week), and optional notes documenting additional employment conditions. Historical contracts with end_date values are immutable records preserved for compliance and audit trail purposes.
   *
   * Access control is strictly enforced based on organization membership: employees can retrieve their own complete contract history, while users with employee:view permission can access contracts for any employee within their organization. Requests from unauthorized users receive a 403 Forbidden response.
   *
   * The response includes paginated contract summaries sorted by start_date in descending order, with the most recent contracts appearing first. Empty result sets return pagination metadata indicating zero total results without error conditions.
   *
   * @param connection
   * @param employeeId Target employee's unique identifier (UUID scope within organization)
   * @param body Search criteria including date range filters, pay period type, and pagination parameters (page, pageSize, sortBy, sortOrder)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query hrm_platform_contracts table filtered by hrm_platform_employee_id. Apply pagination with cursor or offset-based pagination. Support filtering by date range (start_date, end_date), pay_period, and employment status. Join with hrm_platform_employees to verify organization context. Enforce permission checks: employee can view own contracts, users with employee:view permission can view any employee's contracts within organization. Return paginated contract summaries sorted by start_date descending (most recent first). Validate employee exists and belongs to requesting user's organization.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("employeeId")
    employeeId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmPlatformContract.IRequest,
  ): Promise<IPageIHrmPlatformContract.ISummary> {
    try {
      return await patchHrmPlatformMemberEmployeesEmployeeIdContracts({
        member,
        employeeId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
