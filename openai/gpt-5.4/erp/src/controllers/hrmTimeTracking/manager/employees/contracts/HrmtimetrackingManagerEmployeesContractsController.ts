import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingEmployeeContract } from "../../../../../api/structures/IHrmTimeTrackingEmployeeContract";
import { IPageIHrmTimeTrackingEmployeeContract } from "../../../../../api/structures/IPageIHrmTimeTrackingEmployeeContract";
import { ManagerAuth } from "../../../../../decorators/ManagerAuth";
import { ManagerPayload } from "../../../../../decorators/payload/ManagerPayload";
import { deleteHrmTimeTrackingManagerEmployeesEmployeeIdContractsContractId } from "../../../../../providers/deleteHrmTimeTrackingManagerEmployeesEmployeeIdContractsContractId";
import { getHrmTimeTrackingManagerEmployeesEmployeeIdContractsContractId } from "../../../../../providers/getHrmTimeTrackingManagerEmployeesEmployeeIdContractsContractId";
import { patchHrmTimeTrackingManagerEmployeesEmployeeIdContracts } from "../../../../../providers/patchHrmTimeTrackingManagerEmployeesEmployeeIdContracts";
import { postHrmTimeTrackingManagerEmployeesEmployeeIdContracts } from "../../../../../providers/postHrmTimeTrackingManagerEmployeesEmployeeIdContracts";
import { putHrmTimeTrackingManagerEmployeesEmployeeIdContractsContractId } from "../../../../../providers/putHrmTimeTrackingManagerEmployeesEmployeeIdContractsContractId";

@Controller("/hrmTimeTracking/manager/employees/:employeeId/contracts")
export class HrmtimetrackingManagerEmployeesContractsController {
  /**
   * Create a new employment contract record for the specified employee within the currently selected organization context.
   *
   * This operation creates a new record in the historical employment contract collection represented by the hrm_time_tracking_employee_contracts table. That table is defined as the historical employment contract record for workforce members within an organization and stores the terms of employment for one employee, including its effective date range, compensation basis, and expected weekly working hours. In business terms, the created contract captures the formal agreement for one span of service by recording the contract effective start date, optional effective end date, numeric pay rate, compensation basis classification, expected working hours per week, and optional administrative notes.
   *
   * Access to this operation must be restricted to organization users who have employee management authority in the current organization context, such as owners and permitted managers. Contract operations are organization-scoped, so the system must create a contract only when the target employee belongs to the organization currently selected for work. If the employee belongs to a different organization, the request must be rejected. This organization boundary is important because the organization is the top-level business context for workforce records, and contract records must never be created across tenant boundaries.
   *
   * This operation must preserve the historical nature of employee contracts. The EmployeeContract concept exists to retain a time-bounded employment terms record for one employee without overwriting earlier terms. Requirements state that past contracts are immutable historical records and that contract history must remain reviewable together with current terms. Therefore, creating a new contract must not alter older historical records except where service logic closes or supersedes the current active period according to approved business rules. The resulting employee contract history should continue to present a continuous sequence of terms without replacing prior records.
   *
   * Validation is centered on effective dates and historical consistency. The system must ensure non-overlapping contract periods across all contracts for the same employee, interpret a null end date as an ongoing arrangement, and prevent creation of a record that conflicts with an existing active or historical date range. The pay_period value represents the compensation basis classification such as hourly, daily, weekly, or monthly, while working_hours_per_week expresses the expected weekly workload. These values should be validated and persisted as part of the employee's employment terms history.
   *
   * This endpoint is commonly used together with contract viewing operations for the same employee. After creating a contract, clients will typically retrieve the employee's contract history to review the newly added active or future terms alongside prior records. Error handling should clearly distinguish between a missing employee, an employee outside the active organization context, insufficient permission, and invalid contract period overlap so administrators can correct the request safely.
   *
   * @param connection
   * @param employeeId Target employee ID within the current organization scope
   * @param body Employment terms to create for the employee
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor manager
     * @x-autobe-specification Implement this operation as an
     *   organization-scoped employee contract creation workflow.
   *
   * 1. Authenticate the caller and resolve the currently selected organization context from the session or request context.
   * 2. Authorize only actors with employee management capability in that organization, typically owner or a manager with the relevant permission. Reject employee self-service use of this endpoint.
   * 3. Load the target employee by hrm_time_tracking_employees.id using the employeeId path parameter, then verify through the workforce membership context that the employee belongs to the selected organization. If no such in-scope employee exists, return a not-found or forbidden error according to platform conventions.
   * 4. Validate the request body fields for contract creation: start_date is required, end_date is optional, pay_rate is required, pay_period is required, working_hours_per_week is required, and notes is optional. Enforce that end_date, when provided, is not earlier than start_date.
   * 5. Query existing non-deleted hrm_time_tracking_employee_contracts rows for the same hrm_time_tracking_employee_id. Check for any overlap between the requested period and existing contract periods. Treat a null end_date as an open-ended interval. Reject the request if the new interval overlaps any existing contract interval.
   * 6. If business policy allows only one ongoing active contract, additionally ensure there is no existing ongoing contract with null end_date that conflicts with the new record. If a handoff workflow is supported, require callers to update or close the current active contract through the dedicated update behavior before creating a successor contract rather than mutating historical rows here.
   * 7. Insert a new hrm_time_tracking_employee_contracts row with a generated UUID id, the validated hrm_time_tracking_employee_id, provided terms fields, created_at, updated_at, and deleted_at as null.
   * 8. Return the created contract record as the response payload.
   *
   * Implementation notes:
   * - Do not modify older historical contracts during creation except under explicitly approved service logic for active-period transition; past contracts must remain immutable historical records.
   * - Exclude soft-deleted contract rows from active overlap checks unless platform policy explicitly considers them part of business history for validation.
   * - Run validation and insert in a transaction to avoid race conditions that could create overlapping periods under concurrent requests.
   * - Prefer deterministic interval comparison logic that handles open-ended contracts and exact boundary conditions consistently.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @ManagerAuth()
    manager: ManagerPayload,
    @TypedParam("employeeId")
    employeeId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingEmployeeContract.ICreate,
  ): Promise<IHrmTimeTrackingEmployeeContract> {
    try {
      return await postHrmTimeTrackingManagerEmployeesEmployeeIdContracts({
        manager,
        employeeId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of contract records for a specific employee.
   *
   * This operation presents the selected employee's employment contract history as part of that employee's contract timeline within the currently selected organization context. The underlying contract records are stored in the historical employment contract table for workforce members and capture the effective date range, compensation basis, pay rate, expected working hours per week, and optional administrative notes for each contract. The response is intended to support side-by-side review of current and past terms so authorized users can understand how employment terms changed over time without replacing earlier records.
   *
   * The contract data returned by this operation is derived from `hrm_time_tracking_employee_contracts`, which belongs to `hrm_time_tracking_employees` through `hrm_time_tracking_employee_id`. In line with the schema comments, each contract preserves historical employment terms without duplicating broader identity data. Returned items should expose fields appropriate for list viewing, especially the contract effective start boundary, optional end boundary for ongoing contracts, numeric compensation rate, compensation basis classification such as hourly, daily, weekly, or monthly, expected weekly working hours, and any notes needed for administrative review. Historical contracts remain available for browsing even after a newer contract becomes active.
   *
   * Access to this operation must respect organization-scoped contract boundaries. The service must apply the currently selected organization context and return only contracts that belong to the requested employee in that same context. If the caller attempts to access contracts belonging to an employee outside the selected organization, the request must be rejected. Employees may use this operation only for their own contract history, while owners and managers may use it when they hold employee viewing authority in the current organization.
   *
   * This endpoint is a browsing operation, not a mutation operation. Although other contract workflows allow creation of a new contract that closes a previous active contract or updating only the current active contract, this operation only retrieves existing records. Historical immutability remains relevant because consumers should expect past contracts to appear as preserved historical records rather than rewritten snapshots. Related operations that create or update contracts should be used when contract terms need to change; this operation should then be called again to review the resulting full history in sequence.
   *
   * The platform should support pagination, stable sorting, and optional filtering so users can review long employment histories efficiently. In degraded conditions, the service may temporarily refuse the request rather than return incomplete or cross-organization results, because the non-functional requirements prioritize historical integrity and organization isolation over partial or misleading output.
   *
   * @param connection
   * @param employeeId Target employee's unique identifier in the current organization context
   * @param body Contract list filters, pagination, and sorting options
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor manager
     * @x-autobe-specification Implement this operation as a scoped
     *   contract-history query over `hrm_time_tracking_employee_contracts`
     *   joined to `hrm_time_tracking_employees` only as needed to validate
     *   access and employee existence.
   *
   * First, resolve the caller's authenticated actor and current organization context. Verify that the target `employeeId` is accessible in that organization context. For an employee actor, allow the request only when the target employee identity corresponds to the authenticated employee's own workforce record in the selected organization. For owner and manager actors, require employee view permission within the current organization. If the employee does not belong to the current organization or is otherwise outside scope, reject the request.
   *
   * After authorization, query non-deleted contract rows for the target employee. Exclude records with `deleted_at` set unless the surrounding platform conventions explicitly require archived rows to be visible, which is not indicated by the loaded requirements. Support request-body driven list options such as page, limit, sort field, sort direction, and optional filters on active-versus-historical status, start date range, end date range, and pay period if those fields exist in the request DTO. Derive active-versus-historical status from `start_date` and `end_date` relative to the current time rather than relying on a separate status column, because no such column exists in the loaded schema.
   *
   * Use a deterministic default sort that makes contract history easy to review, preferably `start_date` descending with a secondary sort on `created_at` descending. Build the paginated response as `IPageIHrmTimeTrackingEmployeeContract.ISummary`. Each summary item should be sourced from actual contract columns such as `id`, `start_date`, `end_date`, `pay_rate`, `pay_period`, `working_hours_per_week`, `notes`, `created_at`, and `updated_at` according to the DTO definition generated elsewhere.
   *
   * Return an empty page when the employee exists in scope but has no contract records. Reject malformed filtering input, unknown sort options, or invalid pagination values according to common validation handling. Do not modify any contract row in this operation. Do not attempt to recompute or repair overlapping periods here; overlap prevention and active-contract exclusivity belong to create and update flows. If an external dependency needed for authorization or organization-context resolution is unavailable, fail safely instead of returning uncertain or cross-organization data.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @ManagerAuth()
    manager: ManagerPayload,
    @TypedParam("employeeId")
    employeeId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingEmployeeContract.IRequest,
  ): Promise<IPageIHrmTimeTrackingEmployeeContract.ISummary> {
    try {
      return await patchHrmTimeTrackingManagerEmployeesEmployeeIdContracts({
        manager,
        employeeId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single employee contract record for a specific employee within the currently selected organization context.
   *
   * This operation returns one historical employment terms record from the employee contract history. In the hrmTimeTracking domain, an employee contract represents the employment terms record for one employee during a defined span of service within an organization. The returned contract corresponds to the stored contract data in `hrm_time_tracking_employee_contracts`, including the contract effective start date, optional effective end date for closed periods, numeric compensation rate, compensation basis classification such as hourly, daily, weekly, or monthly, expected working hours per week, and optional administrative notes. Because contracts are preserved as historical records rather than overwritten, this operation is used both for reviewing a current active contract and for examining previous terms in the employee's contract history.
   *
   * Access to this operation is organization-scoped and permission-sensitive. The system must apply the currently selected organization context before resolving the employee and contract. An employee may use this operation only for their own contract records, while a user with employee view permission may retrieve a selected employee's current or past contract. If either the employee record or the contract record belongs to a different organization context, the request must be rejected. This enforces the requirement that contract viewing, like other workforce data access, remains isolated to the active organization and never exposes records from another tenant workspace.
   *
   * This operation is nested under the employee resource because `hrm_time_tracking_employee_contracts` belongs to `hrm_time_tracking_employees` through `hrm_time_tracking_employee_id`. The nested design makes the ownership relationship explicit and supports validation that the requested contract actually belongs to the specified employee. API consumers would typically obtain the target `employeeId` from employee browsing or employee detail views, then use this endpoint to inspect one specific contract from that employee's contract history. For broader history review, this detail operation works alongside the employee contract list/history endpoint, where users can identify which contract record to open in full.
   *
   * The response should reflect the persisted contract record accurately, including ongoing contracts where `end_date` is absent and historical contracts where both start and end boundaries are defined. If the employee does not exist in the current organization, if the contract does not belong to the specified employee, or if the caller lacks the required visibility permissions, the system should reject the request rather than returning partial or cross-organization information.
   *
   * @param connection
   * @param employeeId Target employee's unique ID within the current organization context
   * @param contractId Target contract's unique ID belonging to the specified employee
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor manager
     * @x-autobe-specification Resolve the current authenticated actor and
     *   selected organization context first.
   *
   * Load the employee record identified by `employeeId` and confirm that it is visible within the current organization context according to workforce access rules. Then load the contract record from `hrm_time_tracking_employee_contracts` by `contractId` and verify that its `hrm_time_tracking_employee_id` matches the requested `employeeId`. Reject the request if the employee does not exist, the contract does not exist, the contract is not owned by the specified employee, or the employee/contract falls outside the current organization scope.
   *
   * Apply authorization rules before returning data. Allow the request when the caller has employee view permission in the current organization. Also allow an employee caller to access only their own contract records. Deny access when an employee attempts to read another employee's contract or when any actor lacks the required organization-scoped visibility.
   *
   * Return a detailed `IHrmTimeTrackingEmployeeContract` projection populated from `hrm_time_tracking_employee_contracts`. Include the contract identity and the employment-terms fields stored in the table: start date, end date, pay rate, pay period, working hours per week, and optional notes. Preserve nullability for ongoing contracts with no end date.
   *
   * For service behavior, treat this as a read-only operation with no side effects. No transaction beyond a consistent read is required unless the implementation framework mandates one for authorization checks. Use explicit not-found and forbidden error branches so callers can distinguish missing resources from denied access. Do not infer or mutate active-contract status during this operation; active-versus-historical interpretation should be derived from the stored date range only.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":contractId")
  public async at(
    @ManagerAuth()
    manager: ManagerPayload,
    @TypedParam("employeeId")
    employeeId: string & tags.Format<"uuid">,
    @TypedParam("contractId")
    contractId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingEmployeeContract> {
    try {
      return await getHrmTimeTrackingManagerEmployeesEmployeeIdContractsContractId(
        {
          manager,
          employeeId,
          contractId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a specific employee contract record for an employee within the currently selected organization.
   *
   * This operation modifies the employment terms record that represents one defined span of service for an employee. As described by the underlying employee contract schema, each contract stores the effective date range, compensation rate, compensation basis, expected weekly working hours, and optional administrative notes for one period of employment. The update is therefore focused on maintaining the accuracy of that employment terms record rather than changing the employee's identity or authentication account.
   *
   * Access to this operation is restricted by organization-scoped employee management authorization. The current organization context must be applied to the request, and the target contract must belong both to the specified employee and to the current organization scope. According to the requirements, users without employee management permission must be denied when attempting to edit contract information, while employees are limited to viewing their own contracts and are not allowed to update them through this endpoint.
   *
   * This operation is closely related to contract history viewing behavior. Contract history must remain reviewable so that current and previous terms can be examined together, and the system must preserve historical records instead of collapsing them into a single overwritten state. Because the contract table preserves start_date, optional end_date, pay_rate, pay_period, working_hours_per_week, and notes for each employment period, updates through this endpoint must maintain the integrity of that historical sequence and must not allow changes that violate active-contract exclusivity or organization boundaries.
   *
   * Clients typically use this endpoint after obtaining contract history through the employee contract viewing flow for the target employee. After a successful update, the response returns the updated contract resource so the client can immediately refresh the contract history screen and present the revised active terms. If the specified employee or contract cannot be found in the current organization scope, or if the caller lacks the required permission, the request must be rejected.
   *
   * @param connection
   * @param employeeId Target employee account ID that owns the contract history
   * @param contractId Target employee contract record ID
   * @param body Updated employment terms for the target contract
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor manager
     * @x-autobe-specification Load the target contract from
     *   hrm_time_tracking_employee_contracts by id = contractId,
     *   hrm_time_tracking_employee_id = employeeId, and deleted_at IS NULL.
     *   Reject the request if no matching contract exists.
   *
   * Verify that the target contract is accessible within the currently selected organization context. Use organization-scoped authorization rules so that only a caller with employee management permission in the current organization may proceed. Reject cross-organization access attempts even if the caller belongs to another organization.
   *
   * Treat this endpoint as an update for the employee's current active contract only, as required by the business rules. Determine whether the target contract is the current active contract for the employee at the time of the request. Reject attempts to edit historical contracts or contracts outside the active editing rule.
   *
   * Validate the request body against the actual contract fields: start date, optional end date, pay rate, pay period, working hours per week, and optional notes. Ensure pay_period stays within the supported business values hourly, daily, weekly, or monthly. Ensure any updated effective period remains logically valid, including start/end ordering when an end date is provided.
   *
   * Before persisting changes, enforce the single-active-contract invariant for the employee. If the update would create overlapping active periods or otherwise break the rule that only one contract may be active at a time, reject the request. Preserve all historical contracts and do not modify unrelated contract records during this update operation.
   *
   * Persist the allowed field updates, set updated_at to the current timestamp, and return the refreshed contract record as the response payload. Keep created_at immutable. Do not physically remove the record. If concurrent changes are detected by the implementation strategy, fail safely rather than silently overwriting conflicting state.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":contractId")
  public async update(
    @ManagerAuth()
    manager: ManagerPayload,
    @TypedParam("employeeId")
    employeeId: string & tags.Format<"uuid">,
    @TypedParam("contractId")
    contractId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingEmployeeContract.IUpdate,
  ): Promise<IHrmTimeTrackingEmployeeContract> {
    try {
      return await putHrmTimeTrackingManagerEmployeesEmployeeIdContractsContractId(
        {
          manager,
          employeeId,
          contractId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently remove a specific employment contract record for an employee within the active organization context.
   *
   * This operation manages the nested employee contract resource represented by the employee contract table, which stores historical employment terms for one employee, including the contract effective start date and time boundary, optional contract effective end date and time boundary, numeric compensation rate, compensation basis classification, expected working hours per week, and optional administrative notes. The endpoint is nested beneath the employee resource because each contract belongs to exactly one employee through the employee-contract relationship, and the request must therefore target both the workforce member and the exact contract record.
   *
   * Access to this operation is restricted to organization actors with workforce administration authority. Owners have the highest authority within the organization, and managers may perform this operation when acting within their employee-management scope for the selected organization. The service must reject requests made without an active organization context, requests targeting data from another organization, and requests attempted after the caller is no longer associated with the current organization. Employees do not receive contract-deletion authority through this endpoint.
   *
   * This operation must respect the domain rule that historical employee contracts are preserved as immutable records. A contract that is already considered a past contract must not be editable, and this deletion flow must likewise reject removal when the targeted record is part of protected historical employment terms. The service should evaluate whether the contract is a current active arrangement or a preserved historical record based on its effective dates and business status logic. This is especially important because employee contracts affect higher-level organization lifecycle behavior: active employee contracts block organization deletion until they are no longer active.
   *
   * The request path includes both the employee identifier and the contract identifier so the system can confirm that the targeted contract belongs to the specified employee before removal. This prevents deleting an unrelated contract by identifier alone. If the employee or contract does not exist in the selected organization, if the contract is not attached to the specified employee, or if the contract is not eligible for removal under historical protection rules, the service must reject the request. After successful deletion, attempts to access that deleted contract should be rejected according to standard deleted-resource behavior.
   *
   * This endpoint is typically used together with employee contract viewing operations that allow authorized users to inspect contract history before deciding whether a contract should be removed. Callers should first retrieve or browse employee and employee contract information to identify the correct contract record, then invoke this endpoint only for a contract that satisfies the organization’s deletion policy and lifecycle constraints.
   *
   * @param connection
   * @param employeeId Target employee account identifier that owns the contract record.
   * @param contractId Target employee contract identifier belonging to the specified employee.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor manager
     * @x-autobe-specification Implement a service-layer delete operation for a
     *   nested employee contract resource.
   *
   * 1. Resolve the authenticated actor and selected organization context from the request session. Reject the request when no organization context is selected, when the actor does not belong to that organization, or when the actor has lost association with that organization.
   * 2. Authorize the actor. Allow organization owners. Allow managers only when their organization-scoped permission set includes employee-management capability. Reject employees and any actor outside the selected organization.
   * 3. Load the target employee by id from hrm_time_tracking_employees using employeeId and ensure the employee record is active for the selected organization according to the service’s organization-membership model. Because the loaded employee actor schema is global-authentication oriented, implementation must additionally validate organization membership through the organization HR domain before proceeding.
   * 4. Load the target contract from hrm_time_tracking_employee_contracts by contractId with a predicate on hrm_time_tracking_employee_id = employeeId. Also exclude records already marked by deleted_at unless the service intentionally treats them as nonexistent. If no matching record is found, return a not-found error.
   * 5. Evaluate deletion eligibility. Enforce historical protection rules so a past contract treated as an immutable historical record cannot be removed. Determine whether the contract is past or active using start_date, end_date, and current business time evaluation rules. If the contract is protected historical data, reject the deletion request with a business-rule error.
   * 6. If deletion is permitted, perform the delete behavior according to the persistence policy for this table. Because the schema contains deleted_at, implementation may mark deleted_at and update updated_at instead of physically removing the row when the platform’s storage policy for contract records requires retained storage state. In either case, the API behavior is contract removal from normal access paths.
   * 7. Execute the deletion inside a transaction if additional integrity checks or downstream updates are needed. Ensure repeated requests against the same already-removed contract fail as not found or deleted-resource access errors.
   * 8. Return success with no response body.
   *
   * Error handling requirements:
   * - Return not found when the employee does not exist in the active organization context.
   * - Return not found when the contract does not exist or does not belong to the specified employee.
   * - Return forbidden when the actor lacks owner or permitted manager authority.
   * - Return conflict or business-rule validation error when the target contract is a protected past contract and cannot be removed.
   * - Return forbidden when organization context is missing, mismatched, or no longer valid.
   *
   * Implementation notes:
   * - Always validate the nested ownership relation rather than deleting by contractId alone.
   * - Do not permit this endpoint to bypass historical retention intent for past employment terms.
   * - Keep audit logging consistent with workforce administration actions if the broader platform activity-log pipeline is enabled.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":contractId")
  public async erase(
    @ManagerAuth()
    manager: ManagerPayload,
    @TypedParam("employeeId")
    employeeId: string & tags.Format<"uuid">,
    @TypedParam("contractId")
    contractId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmTimeTrackingManagerEmployeesEmployeeIdContractsContractId(
        {
          manager,
          employeeId,
          contractId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
