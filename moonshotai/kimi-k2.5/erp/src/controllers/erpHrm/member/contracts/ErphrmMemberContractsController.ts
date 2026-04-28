import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IErpHrmContract } from "../../../../api/structures/IErpHrmContract";
import { IPageIErpHrmContract } from "../../../../api/structures/IPageIErpHrmContract";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteErpHrmMemberContractsContractId } from "../../../../providers/deleteErpHrmMemberContractsContractId";
import { getErpHrmMemberContractsContractId } from "../../../../providers/getErpHrmMemberContractsContractId";
import { patchErpHrmMemberContracts } from "../../../../providers/patchErpHrmMemberContracts";
import { postErpHrmMemberContracts } from "../../../../providers/postErpHrmMemberContracts";
import { putErpHrmMemberContractsContractId } from "../../../../providers/putErpHrmMemberContractsContractId";

@Controller("/erpHrm/member/contracts")
export class ErphrmMemberContractsController {
  /**
   * Create a new employment contract for an organization member.
   *
   * This endpoint establishes formal employment agreements between the organization and an employee, capturing compensation terms, working hours, and employment periods. Contracts serve as the authoritative source for labor cost calculations and establish work capacity expectations.
   *
   * Each organization member can have multiple contracts over their tenure, forming a complete historical record. However, only one contract may be active at any given time. When a new contract is created for a member who already has an active contract, the system automatically terminates the previous contract by setting its end date to the day immediately before the new contract's start date. This ensures continuous employment coverage without overlapping active contracts.
   *
   * The contract must specify:
   * - organization_member_id: The employee this contract belongs to
   * - start_date: When the employment terms take effect
   * - pay_rate: The compensation amount (salary or hourly rate)
   * - pay_period: Payment frequency (hourly, daily, weekly, bi-weekly, monthly)
   * - working_hours_per_week: Expected time commitment for capacity planning
   * - employment_type (optional): Type of employment (full-time, part-time, contract)
   * - end_date (optional): When contract ends; null for ongoing contracts
   * - notes (optional): Additional terms or contextual information
   *
   * Past contracts (those with an end date) are immutable and cannot be modified after creation. Only the current active contract can be updated. This preserves the integrity of historical employment records for compliance and audit purposes.
   *
   * Authorization requires the `employee:manage` permission. Users without this permission cannot create or modify contracts, even for their own records, as contract terms represent formal employment agreements that should only be altered by authorized HR personnel.
   *
   * Members can always view their own contract history, supporting payroll verification and transparency.
   *
   * @param connection
   * @param body Contract creation data defining the employment agreement terms including compensation, working hours, and employment period.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implementation steps for contract creation:
   *
   * 1. Validate the request body contains all required fields:
   *    - organization_member_id (UUID, must exist)
   *    - start_date (DateTime, must be in the past or present)
   *    - pay_rate (Float, must be positive)
   *    - pay_period (String, must be one of: 'hourly', 'daily', 'weekly', 'bi-weekly', 'monthly')
   *    - working_hours_per_week (Float, must be positive)
   *
   * 2. Optional field validation:
   *    - employment_type: 'full-time', 'part-time', or 'contract'
   *    - end_date: If provided, must be after start_date
   *    - notes: Free text for additional context
   *
   * 3. Verify organization_member_id exists in erp_hrm_organization_members table
   *
   * 4. Check for existing active contract:
   *    - Query erp_hrm_contracts where organization_member_id equals input AND is_active = true
   *    - If found, update that contract: set is_active = false, end_date = new_contract.start_date - 1 day
   *    - This ensures only one active contract per member (enforced by @@unique([organization_member_id, is_active]))
   *
   * 5. Create new contract record:
   *    - Generate UUID for id
   *    - Set organization_id from the organization member's organization
   *    - Set is_active = true (if no end_date) or false (if end_date provided)
   *    - Set created_at and updated_at to current timestamp
   *
   * 6. Return the created contract entity with all fields populated
   *
   * 7. Handle edge cases:
   *    - Reject if start_date is in the future relative to system time
   *    - Reject if new contract start_date precedes current active contract's start_date (overlap check)
   *    - Reject if member is deactivated
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmContract.ICreate,
  ): Promise<IErpHrmContract> {
    try {
      return await postErpHrmMemberContracts({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Search and retrieve a paginated list of employment contracts within the organization.
   *
   * This operation provides comprehensive filtering capabilities for employment contracts, enabling authorized users to query by employment type (full-time, part-time, contract), active status, date ranges, compensation levels, and associated organization member.
   *
   * Contracts represent formal employment agreements that establish compensation terms, working hours, and employment periods. Each organization member can have multiple contracts over time, but only one active contract at any moment. Historical contracts provide immutable audit trails of employment terms.
   *
   * The search supports exact matching on categorical fields (employment_type, is_active, pay_period), range filtering on numeric fields (pay_rate, working_hours_per_week), and date range filtering on temporal fields (start_date, end_date, created_at). Results are paginated using cursor-based pagination for efficient handling of large contract histories.
   *
   * Access is restricted to members with employee management permissions within their organization context. Deleted contracts (soft-deleted via deleted_at) are excluded from results unless explicitly requested. Data isolation ensures only contracts belonging to the authenticated member's organization are visible.
   *
   * Related operations include GET /contracts/{contractId} for retrieving individual contract details and POST /contracts for creating new employment agreements.
   *
   * @param connection
   * @param body Contract search criteria and pagination parameters
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Query erp_hrm_contracts table with
     *   organization-scoped filtering and pagination.
   *
   * Implementation requirements:
   *
   * 1. Authorization: Verify requesting member has employee management permission and extract organization_id from session context.
   *
   * 2. Base query: SELECT from erp_hrm_contracts WHERE organization_id = {session_org_id} AND deleted_at IS NULL
   *
   * 3. Filter processing on IErpHrmContract.IRequest:
   *    - employment_type: exact match on employment_type column (values: 'full-time', 'part-time', 'contract')
   *    - is_active: exact match on is_active boolean column
   *    - pay_period: exact match on pay_period column (values: 'hourly', 'daily', 'weekly', 'bi-weekly', 'monthly')
   *    - organization_member_id: filter by specific organization member
   *    - pay_rate_min/pay_rate_max: range filter on pay_rate Float column
   *    - working_hours_min/working_hours_max: range filter on working_hours_per_week Float column
   *    - start_date_from/start_date_to: date range on start_date column
   *    - end_date_from/end_date_to: date range on end_date column (including NULL for active contracts)
   *    - created_at_from/created_at_to: date range on contract creation
   *
   * 4. Pagination: Implement cursor-based pagination using created_at desc, id desc as cursor. Support limit parameter (default 20, max 100).
   *
   * 5. Sorting: Support sort_by ('start_date', 'pay_rate', 'created_at') and sort_order ('asc', 'desc').
   *
   * 6. Response construction: Return IPageIErpHrmContract.ISummary with pagination cursor and summary properties.
   *
   * 7. Edge cases:
   *    - Empty result set: return empty data array with null cursor
   *    - Invalid filter combinations: ignore conflicting filters, do not error
   *    - Unauthorized access: 403 if lacking employee management permission
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmContract.IRequest,
  ): Promise<IPageIErpHrmContract.ISummary> {
    try {
      return await patchErpHrmMemberContracts({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single employment contract by its unique identifier.
   *
   * This operation returns the complete details of a specific employment contract, including the employment period (start date and optional end date), compensation terms (pay rate and pay period frequency), working hours commitment per week, and any associated notes.
   *
   * From a business perspective, contracts serve as the authoritative record of employment terms between an organization and an employee. Only one contract can be active at any time for an employee, with ended contracts preserved as immutable historical records.
   *
   * Access is governed by the following rules:
   * - Members may view their own contract history
   * - Users with employee viewing permission may view any employee's contracts within their organization
   * - The contract history provides a complete audit trail of employment terms changes over time
   *
   * Contracts are displayed with all fields visible to authorized viewers, with the active contract distinguished from historical records.
   *
   * @param connection
   * @param contractId The unique identifier of the employment contract to retrieve
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Query the erp_hrm_contracts table using the
     *   provided contractId UUID.
   *
   * 1. Validate that the authenticated user has appropriate permissions:
   *    - Members can access contracts where the contract's organizationMember's userId matches the current user
   *    - Users with employee viewing permission can access any contract within their organization context
   * 2. Load the contract record with all fields:
   *    - id (UUID)
   *    - organizationMemberId (UUID) - reference to the employee
   *    - startDate (ISO date)
   *    - endDate (ISO date, nullable)
   *    - payRate (decimal/numeric)
   *    - payPeriod (enum: HOURLY, DAILY, WEEKLY, MONTHLY)
   *    - workingHoursPerWeek (integer)
   *    - notes (text, nullable)
   * 3. Include the related organizationMember and potentially organization context for authorization verification
   * 4. Return the complete contract details as IErpHrmContract
   *
   * Edge cases:
   * - If contractId does not exist, return 404 Not Found
   * - If user lacks permission to view this contract, return 403 Forbidden
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":contractId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("contractId")
    contractId: string,
  ): Promise<IErpHrmContract> {
    try {
      return await getErpHrmMemberContractsContractId({
        member,
        contractId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing active employment contract's terms and conditions.
   *
   * This operation modifies the currently active employment contract for an organization member. Only contracts that are currently active (is_active = true) can be updated. Past contracts that have ended are immutable historical records and cannot be modified.
   *
   * The contract update allows changing employment terms including employment type (full-time, part-time, contract), compensation rate, pay period frequency, working hours commitment, and additional notes. These changes reflect adjustments to the employment agreement.
   *
   * **Important:** The start_date CANNOT be changed once established. This immutability preserves the chronological integrity of the contract history, ensuring accurate employment records for audit and payroll purposes. To change effective dates, a new contract must be created instead (which automatically ends the current active contract).
   *
   * **Authorization:** Users must possess employee management permission to update contracts. This restriction ensures that only authorized HR personnel can modify formal employment agreements, maintaining the integrity of employment records.
   *
   * **Validation Rules:**
   * - The contract must be currently active (is_active = true)
   * - The organization_member_id and organization_id cannot be changed as they define contract ownership
   * - System-managed fields (end_date, is_active, created_at, deleted_at) are not updatable
   *
   * **Related Operations:**
   * - `POST /contracts` - Create a new contract (automatically ends the previous active contract)
   * - `GET /contracts/{contractId}` - Retrieve contract details
   * - `PATCH /members/{memberId}/contracts` - List contract history for a member
   *
   * @param connection
   * @param contractId Target contract's ID
   * @param body Updated contract information
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Validate that the requesting user has employee
     *   management permission.
   *
   * Retrieve the target contract by contractId UUID. Verify the contract exists and is not soft-deleted (deleted_at is null). Verify the contract is currently active (is_active = true). If the contract has ended (end_date is not null), reject the update with an error indicating that historical contracts are immutable.
   *
   * Validate the request body fields:
   * - employment_type: must be one of 'full-time', 'part-time', 'contract'
   * - pay_rate: positive decimal number representing compensation
   * - pay_period: must be one of 'hourly', 'daily', 'weekly', 'bi-weekly', 'monthly'
   * - working_hours_per_week: positive decimal number
   * - start_date: valid datetime, cannot create inappropriate overlaps with contract history
   * - notes: optional string for additional terms
   *
   * Within a database transaction:
   * 1. Update the contract record with the provided field values
   * 2. Update the updated_at timestamp to current time
   * 3. Return the complete updated contract record
   *
   * If validation fails or the contract is not found/active, return appropriate error responses.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":contractId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("contractId")
    contractId: string,
    @TypedBody()
    body: IErpHrmContract.IUpdate,
  ): Promise<IErpHrmContract> {
    try {
      return await putErpHrmMemberContractsContractId({
        member,
        contractId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Deletes the currently active employment contract for an organization member.
   *
   * This operation removes an active (current) employment contract identified by its unique identifier. Employment contracts represent formal employment agreements between the organization and its members, including compensation terms, working hours, and employment periods.
   *
   * Important: Historical contracts—those that have been superseded by newer agreements or have reached their end date—cannot be deleted. These records remain as immutable historical references for audit purposes, payroll verification, and compliance documentation. Only the currently active contract can be deleted.
   *
   * Security Considerations:
   * Only organization members with appropriate administrative permissions (typically Owners or Managers with employee management permissions) can delete active contract records. The operation requires the member to be authenticated and authorized within the organization context.
   *
   * When an active contract is deleted:
   * - The active contract record is removed
   * - The employee will have no active contract until a new one is created
   * - Historical ended contracts remain preserved and cannot be altered
   *
   * Validation Rules:
   * - The contract must belong to the current organization context
   * - The contract must be the currently active contract (is_active = true)
   * - Historical contracts cannot be deleted per immutability requirements
   * - The requesting user must have permission to manage employee contracts
   *
   * Related Operations:
   * - Create new contracts via POST /contracts
   * - Update active contracts via PUT /contracts/{contractId}
   * - List all contracts via PATCH /contracts
   * - View contract details via GET /contracts/{contractId}
   *
   * @param connection
   * @param contractId Unique identifier of the employment contract to delete (global scope)
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement permanent deletion of an employment
     *   contract record.
   *
   * Database Operations:
   * 1. Execute DELETE query on erp_hrm_contracts table WHERE id = {contractId} AND organization_id = {currentOrganizationId}
   * 2. Verify exactly one row was deleted; return 404 if no contract found
   * 3. Return 204 No Content on successful deletion
   *
   * Business Rules:
   * - Verify the contract belongs to the current organization context (organization_id match)
   * - Check user has permission to delete contracts (typically hr:manage or higher)
   * - Any contract can be deleted regardless of active status, but log this action in activity logs
   * - Cascading delete handled at database level for related records
   *
   * Error Handling:
   * - 404 Not Found: Contract does not exist in current organization context
   * - 403 Forbidden: User lacks permission to delete contracts
   * - 400 Bad Request: Invalid UUID format for contractId
   *
   * Edge Cases:
   * - Deleting the active contract leaves employee without an active contract
   * - Deleting historical (ended) contracts may affect employment history completeness
   * - Concurrent deletion attempts may result in 404 for subsequent requests
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":contractId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("contractId")
    contractId: string,
  ): Promise<void> {
    try {
      return await deleteErpHrmMemberContractsContractId({
        member,
        contractId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
