import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmEmployeeContract } from "../../../../../api/structures/IErpHrmEmployeeContract";
import { IPageIErpHrmEmployeeContract } from "../../../../../api/structures/IPageIErpHrmEmployeeContract";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { getErpHrmMemberOrganizationMembersOrganizationMemberIdContractsContractId } from "../../../../../providers/getErpHrmMemberOrganizationMembersOrganizationMemberIdContractsContractId";
import { patchErpHrmMemberOrganizationMembersOrganizationMemberIdContracts } from "../../../../../providers/patchErpHrmMemberOrganizationMembersOrganizationMemberIdContracts";
import { postErpHrmMemberOrganizationMembersOrganizationMemberIdContracts } from "../../../../../providers/postErpHrmMemberOrganizationMembersOrganizationMemberIdContracts";

@Controller(
  "/erpHrm/member/organizationMembers/:organizationMemberId/contracts",
)
export class ErphrmMemberOrganizationmembersContractsController {
  /**
   * Create a new employee contract for the specified organization member.
   *
   * This operation establishes a new formal employment agreement record for a given organization member, capturing the agreed-upon compensation and working conditions at the time of creation. The created contract becomes the member's active contract, while any previously active contract for that member is automatically deactivated to ensure only one contract is active at any time.
   *
   * Access to this operation is strictly controlled. Only users who hold the `employee:manage` permission within the organization may create contracts for any member. Employees (regardless of role) cannot create contracts — including for themselves — as contract creation is exclusively a managerial or HR action. Any attempt by a user without the `employee:manage` permission will be rejected.
   *
   * The underlying data is stored in the `erp_hrm_employee_contracts` table. Each contract record captures: the monetary compensation amount per pay period (`pay_rate`), the frequency of payment (`pay_period` — one of: hourly, daily, weekly, bi_weekly, monthly, annually), the contracted working hours per week (`working_hours_per_week`), the contract effective start date (`start_date`), an optional end date (`end_date`, null meaning open-ended), and optional supplementary notes (`notes`). The `is_active` flag is set to true for the newly created contract and the previous active contract (if any) is deactivated as part of the same database transaction.
   *
   * Contracts are immutable once created. If employment terms need to change, the correct workflow is to create a new contract via this endpoint, which will deactivate the current active contract and preserve it as part of the complete historical audit trail. The full history of contracts for a given member can be browsed through the contract list operation for that member.
   *
   * This operation also automatically generates an activity log entry (in `erp_hrm_activity_logs`) recording the contract creation event with the acting user and the new contract as the target entity, including the start date and pay period as details. This audit trail is created within the same transaction to guarantee consistency.
   *
   * This operation requires the caller to be an authenticated member (`member` actor) with the `employee:manage` permission in the organization that the target organization member belongs to. The target organization member must be a valid, non-deleted member of the organization.
   *
   * @param connection
   * @param organizationMemberId The UUID of the target organization member for whom the contract is being created.
   * @param body Employment contract creation details including pay rate, pay period, working hours, effective dates, and optional notes.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Authenticate the calling member and resolve their organization context.
   * 2. Verify the target `organizationMemberId` (UUID) exists in `erp_hrm_organization_members`, belongs to the same organization as the caller, and is not logically deleted (deleted_at IS NULL).
   * 3. Check that the calling member's role has the employee management permission. If not, return 403 Forbidden.
   * 4. Validate the request body:
   *    - `pay_rate` must be a positive number.
   *    - `pay_period` must be one of: 'hourly', 'daily', 'weekly', 'bi_weekly', 'monthly', 'annually'.
   *    - `working_hours_per_week` must be a positive number.
   *    - `start_date` must be a valid date-time.
   *    - `end_date`, if provided, must be after `start_date`.
   * 5. Within a database transaction:
   *    a. Find any currently active contract for the target member (WHERE organization_member_id = :id AND is_active = true).
   *    b. If found, set is_active = false and updated_at = now() on that contract.
   *    c. Insert a new row in `erp_hrm_employee_contracts` with: organization_member_id from path, pay_rate, pay_period, working_hours_per_week, start_date, end_date (nullable), is_active = true, notes (nullable), created_at = now(), updated_at = now().
   * 6. Return the newly created contract record as IErpHrmEmployeeContract.
   * 7. If any validation fails, roll back the transaction and return the appropriate error response.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationMemberId")
    organizationMemberId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmEmployeeContract.ICreate,
  ): Promise<IErpHrmEmployeeContract> {
    try {
      return await postErpHrmMemberOrganizationMembersOrganizationMemberIdContracts(
        {
          member,
          organizationMemberId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a paginated, filterable list of all employment contracts for a specific organization member.
   *
   * This operation returns the complete contract history associated with the given organization member, including the currently active contract and all past contracts in chronological order. Each contract record captures the agreed-upon employment terms at a specific point in time: the pay rate, pay period granularity (e.g., hourly, monthly), contracted working hours per week, contract start and end dates, active status, and any supplementary notes.
   *
   * Access to this endpoint is governed by strict permission rules. An authenticated member may view all contracts belonging to their own organization member record without requiring any special permission. However, viewing contracts for another member requires the 'employee view' permission within the organization. Members who only have the basic 'employee' role (without elevated view or manage permissions) are denied access to other members' contracts entirely.
   *
   * Users holding the 'employee manage' permission may also access this endpoint as part of their broader HR management capabilities, as they require visibility into any employee's contract history to perform contract administration tasks.
   *
   * Contracts stored in the erp_hrm_employee_contracts table are immutable after creation — they are never modified or deleted. When employment terms change, the active contract is deactivated (is_active set to false) and a new contract is created. This preserves a complete, auditable history of all employment agreements over time, supporting payroll reconciliation, compliance review, and dispute resolution.
   *
   * Results are ordered chronologically by start_date (ascending) by default, presenting the earliest contract first and the most recent last, allowing reviewers to trace the full progression of employment terms. Filtering by active status, date ranges, or pay period type is supported through the request body.
   *
   * This endpoint depends on first identifying the target organization member. The member's ID (organizationMemberId) is typically obtained from the organization member list endpoint (PATCH /organizationMembers) or from the authenticated member's own session context.
   *
   * @param connection
   * @param organizationMemberId The UUID of the target organization member whose contract history is being retrieved.
   * @param body Search criteria, filters, and pagination parameters for the contract list.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Extract organizationMemberId from path parameter and validate it is a valid UUID.
   * 2. Verify the organization member record exists in erp_hrm_organization_members and is not deleted (deleted_at IS NULL).
   * 3. Determine the requesting member's identity from the session. Extract their own organization_member record for the current organization context.
   * 4. Authorization check:
   *    a. If the requesting member's own organization_member.id matches organizationMemberId → allow access (viewing own contracts, no special permission required).
   *    b. Otherwise, check if the requesting member's role has 'employee_view' or 'employee_manage' permission in erp_hrm_role_permissions → allow if either permission is present.
   *    c. If neither condition is met → reject with 403 Forbidden.
   * 5. Query erp_hrm_employee_contracts WHERE organization_member_id = organizationMemberId.
   * 6. Apply optional request body filters:
   *    - is_active: filter by active status boolean
   *    - pay_period: filter by pay period type string (hourly, daily, weekly, bi_weekly, monthly, annually)
   *    - start_date range: filter by start_date >= and/or <= provided bounds
   *    - end_date range: filter for contracts whose end_date falls within a range, or is null (open-ended)
   * 7. Apply ordering: default by start_date ASC (chronological). Support DESC ordering if specified.
   * 8. Apply pagination: use cursor-based or offset-based pagination with configurable page size.
   * 9. Return paginated results as IPageIErpHrmEmployeeContract.ISummary with pagination metadata (total count, current page, page size).
   * 10. Edge cases:
   *     - If the organization member has no contracts, return an empty page (not a 404).
   *     - If organizationMemberId does not exist, return 404.
   *     - Contracts with end_date in the past are historical; is_active = false. Contracts with no end_date (null) or future end_date may be active (is_active = true).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationMemberId")
    organizationMemberId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmEmployeeContract.IRequest,
  ): Promise<IPageIErpHrmEmployeeContract.ISummary> {
    try {
      return await patchErpHrmMemberOrganizationMembersOrganizationMemberIdContracts(
        {
          member,
          organizationMemberId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single employee contract record belonging to a specific organization member.
   *
   * This operation returns the complete detail of one EmployeeContract — including its pay rate, pay period, contracted working hours per week, start date, optional end date, active status, and any supplementary notes — as stored in the `erp_hrm_employee_contracts` table. The contract is identified by its own UUID (`contractId`) and is further scoped to the parent organization member (`organizationMemberId`), ensuring that only contracts belonging to the specified member can be accessed through this path.
   *
   * Access to this endpoint is governed by strict permission rules. An authenticated member may call this endpoint to view any of their own contracts — both the currently active contract and all historical (deactivated) contracts — without requiring any special permission beyond being the employee in question. A member who holds the **employee view** permission within the organization may also use this endpoint to view any other employee's contract records, supporting managerial oversight, payroll auditing, and HR reporting needs. Any other caller — including members who hold neither the employee view permission nor ownership of the target member record — will receive an authorization error.
   *
   * The underlying `erp_hrm_employee_contracts` table treats all contract records as immutable audit entries. Contracts are never modified after creation; when employment terms change, the active contract is deactivated and a new record is created. The `is_active` flag on the returned contract indicates whether it represents the currently effective employment agreement. The `start_date` and optional `end_date` columns delimit the period for which the contract terms apply.
   *
   * To retrieve the full list of contracts for an organization member (instead of a single one), use `GET /organizationMembers/{organizationMemberId}/contracts`. To access or manage the parent organization member record, use `GET /organizationMembers/{organizationMemberId}`.
   *
   * @param connection
   * @param organizationMemberId The UUID of the organization member whose contract is being retrieved.
   * @param contractId The UUID of the specific employee contract to retrieve.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Authenticate the calling member from the session context and resolve their current organization context.
   * 2. Look up the target OrganizationMember by organizationMemberId in erp_hrm_organization_members. Verify the record belongs to the same organization as the caller's session. Return 404 if not found or not in the same organization.
   * 3. Authorization check — the caller is permitted if either:
   *    a. The caller's own erp_hrm_organization_members.id equals organizationMemberId (they are the employee whose contract this is), OR
   *    b. The caller's role grants the 'employee_view' permission (checked via erp_hrm_role_permissions for their role_id).
   *    If neither condition holds, return 403.
   * 4. Query erp_hrm_employee_contracts WHERE id = contractId AND organization_member_id = organizationMemberId. Return 404 if no matching record is found.
   * 5. Return the full contract record mapped to IErpHrmEmployeeContract, including: id, organization_member_id, pay_rate, pay_period, working_hours_per_week, start_date, end_date (nullable), is_active, notes (nullable), created_at, updated_at.
   * 6. No pagination needed — this is a single-record retrieval.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":contractId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationMemberId")
    organizationMemberId: string & tags.Format<"uuid">,
    @TypedParam("contractId")
    contractId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmEmployeeContract> {
    try {
      return await getErpHrmMemberOrganizationMembersOrganizationMemberIdContractsContractId(
        {
          member,
          organizationMemberId,
          contractId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
