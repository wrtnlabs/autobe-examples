import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingContract } from "../../../../structures/IErpHrmTimeTrackingContract";
import { IPageIErpHrmTimeTrackingContract } from "../../../../structures/IPageIErpHrmTimeTrackingContract";

/**
 * Create a new employment contract record for an employee in the selected organization context.
 *
 * This operation creates a new row in `erp_hrm_time_tracking_contracts` with organization scoping via `erp_hrm_time_tracking_organization_id` and the target employee via `erp_hrm_time_tracking_employee_id`. The created contract stores the contractual employment terms, including `contract_number`, `contract_title`, pay information (`pay_amount`, `pay_currency`, `pay_frequency`), and the working-term window (`work_term_start_date`, optional `work_term_end_date`) along with optional `notes`.
 *
 * Business rules enforced by this operation ensure contract history consistency. The contract is treated as a historical record, and the system maintains that only one contract can be currently active at any given time based on the `work_term_start_date` and `work_term_end_date` relationship. When a new contract is created with a start date, the previously active contract must be ended automatically so it is no longer active as of the day before the new contract start date. Past contracts remain immutable and are preserved for history.
 *
 * Security and access control are organization-scoped: contract operations are strictly limited to the selected organization context (using `erp_hrm_time_tracking_organization_id`). If a user attempts to create a contract for an employee belonging to a different organization than the selected one, the system must deny the request to prevent cross-organization data leakage.
 *
 * Validation requirements follow the contract domain definition: the operation requires `work_term_start_date`, pay information (`pay_amount`, `pay_currency`, `pay_frequency`), and the contract working-term details. Optional values include `work_term_end_date` (for open-ended vs ended agreements) and `notes`. In addition, this operation must populate `status` in a consistent lifecycle state and rely on timestamps (`created_at`, `updated_at`) set by the service.
 *
 * If validation fails (for example, missing required fields, invalid date relationships, or employee/organization mismatch), the operation returns an error and does not persist a partial contract. If the employee is already under an active contract, the implementation ends the previous active contract as part of the same business transaction so the active agreement rule remains true after completion.
 *
 * Related operations include contract viewing endpoints (for employees to view their own contract timeline and for authorized users to view any employee’s contract timeline), and contract update endpoints for editing only the current active contract. This create operation is responsible for inserting the new contract and triggering the active-contract handover.
 *
 *
 * @param props.connection
 * @param props.body Contract creation payload. Provides the target employee and required employment terms for the new agreement, including pay details and the working-term start date (and optional end date and notes).
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps: 1) Authenticate actor and
 *   resolve the selected organization context. 2) Validate request body: -
 *   Ensure required fields for a contract create are present: contract_number,
 *   contract_title, pay_amount, pay_currency, pay_frequency,
 *   work_term_start_date, working-term required field(s) as defined by the
 *   Contract create DTO, status rules. - Validate dates: work_term_end_date if
 *   provided must be >= work_term_start_date; otherwise reject. - Validate
 *   pay_amount numeric constraints per schema-level expectations (accept the
 *   DTO type definition). 3) Authorization: - Verify the actor has authority to
 *   manage contracts in the selected organization. - Verify
 *   erp_hrm_time_tracking_employee_id belongs to the selected organization
 *   (erp_hrm_time_tracking_contracts.erp_hrm_time_tracking_organization_id
 *   scoping requirement). 4) Transactional creation (single DB transaction): a)
 *   Determine if there is a currently active contract for that employee within
 *   the organization based on status and work term window rules. b) If an
 *   active contract exists, update it so it becomes ended as of the day before
 *   the new contract start date. Concretely, set its work_term_end_date
 *   accordingly (or update status to ended as your domain mapping dictates). Do
 *   not modify past contracts other than the previously active one. c) Insert
 *   the new contract row into `erp_hrm_time_tracking_contracts` with: -
 *   erp_hrm_time_tracking_employee_id - erp_hrm_time_tracking_organization_id -
 *   contract_number - contract_title - pay_amount, pay_currency, pay_frequency
 *   - work_term_start_date, work_term_end_date (nullable) - notes - status
 *   (consistent with the lifecycle rules; typically marks the new contract as
 *   active) - created_at/updated_at handled by DB or service - deleted_at must
 *   be null for newly created active records d) Update timestamps where
 *   necessary. 5) Return the created contract entity including all fields
 *   required by `IErpHrmTimeTrackingContract` response type.
 *
 * Error handling:
 * - If employee does not exist in the selected organization context, deny access/validation failure.
 * - If contract_number uniqueness is violated for the employee (unique([employee_id, contract_number])) return a validation/conflict error.
 * - If no active contract exists, create proceeds without ending any prior contract.
 *
 * @path /erpHrmTimeTracking/member/contracts
 * @accessor api.functional.erpHrmTimeTracking.member.contracts.createContract
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function createContract(
  connection: IConnection,
  props: createContract.Props,
): Promise<createContract.Response> {
  return true === connection.simulate
    ? createContract.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...createContract.METADATA,
          path: createContract.path(),
          status: null,
        },
        props.body,
      );
}
export namespace createContract {
  export type Props = {
    /**
     * Contract creation payload. Provides the target employee and required employment terms for the new agreement, including pay details and the working-term start date (and optional end date and notes).
     */
    body: IErpHrmTimeTrackingContract.ICreate;
  };
  export type Body = IErpHrmTimeTrackingContract.ICreate;
  export type Response = IErpHrmTimeTrackingContract;

  export const METADATA = {
    method: "POST",
    path: "/erpHrmTimeTracking/member/contracts",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/erpHrmTimeTracking/member/contracts";
  export const random = (): IErpHrmTimeTrackingContract =>
    typia.random<IErpHrmTimeTrackingContract>();
  export const simulate = (
    connection: IConnection,
    props: createContract.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: createContract.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Retrieve a filtered and paginated list of employment contracts for the currently selected organization.
 *
 * This endpoint is designed for contract browsing use cases such as viewing active and historical employment agreement records within the selected organization context.
 *
 * The underlying data comes from {@link erp_hrm_time_tracking_contracts}, which stores organization-scoped contract attributes including {@link erp_hrm_time_tracking_contracts.contract_number}, {@link erp_hrm_time_tracking_contracts.contract_title}, pay terms ({@link erp_hrm_time_tracking_contracts.pay_amount}, {@link erp_hrm_time_tracking_contracts.pay_currency}, {@link erp_hrm_time_tracking_contracts.pay_frequency}), working-term dates ({@link erp_hrm_time_tracking_contracts.work_term_start_date}, {@link erp_hrm_time_tracking_contracts.work_term_end_date}), and lifecycle {@link erp_hrm_time_tracking_contracts.status}.
 *
 * This operation must ensure strict tenant isolation by filtering results with {@link erp_hrm_time_tracking_contracts.erp_hrm_time_tracking_organization_id} derived from the selected organization context, preventing any records from other organizations from being returned.
 *
 * Filtering and sorting are provided via the request body because the endpoint uses HTTP PATCH for complex query criteria. Returned items are list-safe summaries and do not perform updates; contract immutability rules for past agreements are enforced by write operations, not by this list operation.
 *
 * If no contracts match the criteria, return an empty paginated result while keeping the pagination metadata consistent.
 *
 * @param props.connection
 * @param props.body Contract list search criteria, pagination, and sorting options.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement a read-only list/search operation for
 *   contracts.
 *
 * 1) Resolve tenant scope:
 * - Determine selected organization id from request context (organization context middleware).
 * - Build a base query on erp_hrm_time_tracking_contracts where erp_hrm_time_tracking_organization_id = selectedOrgId.
 *
 * 2) Apply record visibility rules:
 * - Exclude logically retired contracts by default (deleted_at IS NULL) unless the IRequest supports including deleted records; if such a flag exists in IRequest, apply it.
 *
 * 3) Apply filtering from IErpHrmTimeTrackingContract.IRequest:
 * - Filter by contract_number and/or contract_title.
 * - Filter by status.
 * - Filter by work_term_start_date and work_term_end_date ranges.
 * - If the request includes employee-related filters, ensure any referenced employees are within the same selected organization (via erp_hrm_time_tracking_employee_id membership relation) and are viewable by the caller per service authorization.
 *
 * 4) Apply sorting:
 * - Map allowed sort keys from IRequest to actual columns in erp_hrm_time_tracking_contracts (e.g., created_at, work_term_start_date, work_term_end_date, status).
 * - Use a deterministic secondary sort (e.g., created_at then id) to keep pagination stable.
 *
 * 5) Pagination:
 * - Apply pagination strategy consistent with IRequest (page/limit or cursor-based).
 * - Fetch only the columns needed for IPageIErpHrmTimeTrackingContract.ISummary.
 *
 * 6) Authorization:
 * - Verify at service layer that the caller is allowed to view contract results for the employee scope implied by the filters.
 * - Never broaden scope beyond selected organization.
 *
 * 7) Error handling:
 * - Invalid filter combinations or invalid pagination parameters should return a validation error.
 * - If organization context is missing/invalid, return an authorization/tenant scoping error.
 *
 * 8) Transactions:
 * - No mutation. Run as read-only.
 *
 * Implementation details should use ORM query builder with parameterized inputs.
 * @path /erpHrmTimeTracking/member/contracts
 * @accessor api.functional.erpHrmTimeTracking.member.contracts.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Contract list search criteria, pagination, and sorting options.
     */
    body: IErpHrmTimeTrackingContract.IRequest;
  };
  export type Body = IErpHrmTimeTrackingContract.IRequest;
  export type Response = IPageIErpHrmTimeTrackingContract.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/erpHrmTimeTracking/member/contracts",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/erpHrmTimeTracking/member/contracts";
  export const random = (): IPageIErpHrmTimeTrackingContract.ISummary =>
    typia.random<IPageIErpHrmTimeTrackingContract.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Retrieve one employment contract by its identifier for display in the employee contracts area.
 *
 * This endpoint returns the contract record fields used to present the employment agreement terms for a specific employee within the currently selected organization context. The underlying database model stores pay and working-term attributes such as contract_number, contract_title, pay_amount/pay_currency, pay_frequency, work_term_start_date, and the optional work_term_end_date (which indicates whether the agreement is ongoing). Contract notes and status are also returned so clients can render the full contract details.
 *
 * Security and permission rules are enforced before returning data. Contract visibility is strictly organization-scoped: the acting user must belong to the selected organization and may only access contracts whose organization_id matches the selected organization context. If the acting user is an employee attempting to view their own contracts, the system allows the request. If the acting user attempts to view contracts for a different employee and does not have the employee:view permission within the selected organization, the system rejects the request. If the acting user has employee:view permission in the selected organization, the system allows viewing that other employee’s contract. The system must not expose contract data from any other organization even if the user belongs to it.
 *
 * Validation and behavior: contractId identifies the single contract record to load. If no contract exists for the given contractId within the selected organization scope, the operation returns an error (for example, not-found) rather than leaking information about contracts outside the current scope.
 *
 * Related operations: for browsing a full contract timeline, clients should use the contract list/view operations (e.g., view own contracts or view any employee contracts) and select individual contract details when needed. This endpoint is the detail accessor for a specific contract record.
 *
 * @param props.connection
 * @param props.contractId Target contract identifier (UUID) of the employment agreement record to retrieve within the selected organization context.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps: 1) Extract contractId from
 *   path. 2) Resolve acting context organizationId from the selected
 *   organization context established by authentication/session middleware. 3)
 *   Query erp_hrm_time_tracking_contracts by id AND
 *   erp_hrm_time_tracking_organization_id == selected organizationId. - Select
 *   all relevant columns for the contract response. - Ensure records with
 *   deleted_at != null are treated as retired (based on existing project
 *   conventions for this model); do not return them as active contract details
 *   if the service layer defines that behavior. 4) Authorization enforcement: -
 *   Determine employeeId corresponding to acting user within the selected
 *   organization (acting user may be an employee). - If acting user is
 *   requesting their own contract (employee_id matches), allow. - Else require
 *   employee:view permission in the selected organization; if missing, reject.
 *   5) Return the loaded contract entity.
 *
 * Edge cases:
 * - If contractId exists but belongs to a different organization than the selected one, treat as not-found to prevent cross-organization leakage.
 * - If deleted_at is set and the service layer defines retired contracts visibility rules, apply them consistently (either forbid or still return per documented behavior).
 * @path /erpHrmTimeTracking/member/contracts/:contractId
 * @accessor api.functional.erpHrmTimeTracking.member.contracts.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Target contract identifier (UUID) of the employment agreement record to retrieve within the selected organization context.
     */
    contractId: string & tags.Format<"uuid">;
  };
  export type Response = IErpHrmTimeTrackingContract;

  export const METADATA = {
    method: "GET",
    path: "/erpHrmTimeTracking/member/contracts/:contractId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/erpHrmTimeTracking/member/contracts/${encodeURIComponent(props.contractId ?? "null")}`;
  export const random = (): IErpHrmTimeTrackingContract =>
    typia.random<IErpHrmTimeTrackingContract>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("contractId")(() => typia.assert(props.contractId));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Update a single employment contract record.
 *
 * This operation targets a specific employment agreement stored in `erp_hrm_time_tracking_contracts` identified by `id` (`contractId`). The record includes organization and employee linkage (`erp_hrm_time_tracking_organization_id`, `erp_hrm_time_tracking_employee_id`) plus business fields such as `contract_number`, `contract_title`, pay details (`pay_amount`, `pay_currency`, `pay_frequency`), working term dates (`work_term_start_date`, `work_term_end_date`), optional `notes`, and lifecycle fields (`status`). Timestamps such as `created_at` and `updated_at` are managed by the system.
 *
 * Editing is restricted by contract lifecycle rules: users with `employee:manage` permission may edit only the employee’s currently active agreement. Past contracts are treated as immutable historical records and must be rejected when an edit attempt targets a contract that is not the current active one for its employee (including ended contracts). Ongoing contracts (where `work_term_end_date` is null) are treated as active until ended by later contract creation; therefore, this update must still apply only when the target contract is the current active contract.
 *
 * All contract operations are strictly scoped to the selected organization context. The operation must ensure the target contract belongs to the selected organization; if a user attempts to access a contract associated with a different organization than the selected one, access must be denied to prevent cross-organization visibility.
 *
 * Validation behavior should ensure the update payload does not violate the contract’s business invariants and timeline correctness expectations. The system should persist the changes and return the updated contract state, reflecting fields stored in `erp_hrm_time_tracking_contracts`. If the provided data would result in inconsistent lifecycle ordering relative to the active contract rules, the request must be rejected.
 *
 * Related operations:
 * - Creating a new contract for an employee ends the previously active contract the day before the new contract start date; use the contract creation endpoint when initiating a new employment term rather than updating an ended record.
 * - Listing/viewing contracts should be performed using the relevant contract read/list operations so users can identify which contract is currently active before attempting an edit.
 *
 * @param props.connection
 * @param props.contractId Unique identifier of the contract record to update.
 * @param props.body Updated contract fields. The system will accept changes only when the target contract is the employee's currently active agreement within the selected organization.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps: 1) Parse `contractId` from
 *   path. 2) Load the contract row from `erp_hrm_time_tracking_contracts` by
 *   `id`. 3) Authorization & organization scope: - Determine selected
 *   organization context from the authenticated member session (middleware). -
 *   Verify the loaded contract's `erp_hrm_time_tracking_organization_id`
 *   matches the selected organization id. - Verify caller has `employee:manage`
 *   permission for the employee within the selected organization context. 4)
 *   Enforce immutability of past contracts: - Determine the employee's current
 *   active contract using the contract timeline semantics defined in
 *   requirements: - Active is defined as the contract that is currently in
 *   effect based on `work_term_start_date` and `work_term_end_date` (null means
 *   ongoing). - Only the single active contract is eligible for editing. -
 *   Compare the loaded contract id against the computed active contract id. -
 *   If they do not match, reject with an error indicating the contract is not
 *   editable because only the current active contract can be edited. 5)
 *   Validate request body fields: - Accept updates for mutable fields such as
 *   `contract_number`, `contract_title`, pay fields, `work_term_start_date`,
 *   `work_term_end_date`, `notes`, and `status` according to the DTO contract
 *   update definition. - Ensure `work_term_end_date` logic is consistent (e.g.,
 *   may be null for ongoing; if provided, it must be after/equal to start date
 *   according to timeline validity constraints). - Ensure uniqueness of
 *   `contract_number` for the employee within the organization according to
 *   @@unique([erp_hrm_time_tracking_employee_id, contract_number]). If the
 *   updated contract_number conflicts with another contract for the same
 *   employee, reject. 6) Persist: - Execute update on
 *   `erp_hrm_time_tracking_contracts` for the target row. - Set `updated_at` to
 *   current time. - Do not alter `id`, `created_at`. 7) Return the updated
 *   contract entity by selecting the row after update.
 *
 * Transactions/locking:
 * - Use a single transaction for the read (active contract determination) + uniqueness check + update to avoid race conditions where another update could change the active contract status concurrently.
 *
 * Error handling:
 * - 404 if contractId does not exist.
 * - 403 if organization scope mismatch or permission missing.
 * - 400/409 (implementation-specific) if attempting to edit a non-active/ended contract, or if uniqueness/timeline validation fails.
 * @path /erpHrmTimeTracking/member/contracts/:contractId
 * @accessor api.functional.erpHrmTimeTracking.member.contracts.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /**
     * Unique identifier of the contract record to update.
     */
    contractId: string & tags.Format<"uuid">;

    /**
     * Updated contract fields. The system will accept changes only when the target contract is the employee's currently active agreement within the selected organization.
     */
    body: IErpHrmTimeTrackingContract.IUpdate;
  };
  export type Body = IErpHrmTimeTrackingContract.IUpdate;
  export type Response = IErpHrmTimeTrackingContract;

  export const METADATA = {
    method: "PUT",
    path: "/erpHrmTimeTracking/member/contracts/:contractId",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/erpHrmTimeTracking/member/contracts/${encodeURIComponent(props.contractId ?? "null")}`;
  export const random = (): IErpHrmTimeTrackingContract =>
    typia.random<IErpHrmTimeTrackingContract>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("contractId")(() => typia.assert(props.contractId));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Permanently removes a single contract record from the time-tracking domain.
 *
 * The endpoint targets the contract entity in the currently selected organization context, so the contract identifier in the path must belong to the caller’s active organization. If the contract is not found within that organization scope, the operation must not reveal cross-organization existence and should return an appropriate not-found/forbidden-equivalent error.
 *
 * Implementation must ensure consistency with the broader contract lifecycle rules. In particular, this endpoint must not bypass higher-level invariants that depend on the presence of contracts and time-tracking workflow state; if required eligibility checks cannot be completed reliably, the operation should reject rather than partially delete.
 *
 * On success, the contract record is permanently removed and is no longer returned by contract read operations.
 *
 * Related operations include viewing contracts in the selected organization and editing only the current active contract; those operations define which contracts are editable vs historical, while this endpoint removes a specific contract record.
 *
 * @param props.connection
 * @param props.contractId Unique identifier of the contract record to permanently remove.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement erase as a direct removal of one record in
 *   erp_hrm_time_tracking_contracts.
 *
 * Algorithm (service layer):
 * 1. Parse `contractId`.
 * 2. Resolve caller’s currently selected organization context (tenant).
 * 3. Load the target contract by `id` from erp_hrm_time_tracking_contracts.
 *    - Ensure `erp_hrm_time_tracking_organization_id` of the found record equals the selected organization id.
 *    - If no record is found under the selected organization, return not-found/forbidden-equivalent per service conventions.
 * 4. Eligibility checks / consistency:
 *    - Perform any required invariants checks needed to avoid breaking higher-level workflows (especially organization deletion prerequisites).
 *    - If the service cannot complete eligibility verification due to an internal error, reject the operation.
 * 5. Permanently remove the contract record from erp_hrm_time_tracking_contracts.
 *    - Use a database transaction for the delete and any related side effects (if any are implemented).
 * 6. Record an organization-scoped audit/activity log entry if the service implements activity log persistence for destructive actions.
 * 7. Return success with no JSON body.
 *
 * Database interaction:
 * - Primary query: SELECT contract by id (and selected organization match).
 * - Delete: DELETE from erp_hrm_time_tracking_contracts where id matches.
 *
 * Edge cases:
 * - contractId refers to a contract in a different organization -> deny.
 * - Internal failure during prerequisite checks -> reject.
 * - Concurrent delete: handle idempotency/row-missing by returning not-found-equivalent.
 * @path /erpHrmTimeTracking/member/contracts/:contractId
 * @accessor api.functional.erpHrmTimeTracking.member.contracts.erase
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function erase(
  connection: IConnection,
  props: erase.Props,
): Promise<void> {
  return true === connection.simulate
    ? erase.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...erase.METADATA,
          path: erase.path(props),
          status: null,
        },
      );
}
export namespace erase {
  export type Props = {
    /**
     * Unique identifier of the contract record to permanently remove.
     */
    contractId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/erpHrmTimeTracking/member/contracts/:contractId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/erpHrmTimeTracking/member/contracts/${encodeURIComponent(props.contractId ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: erase.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: erase.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("contractId")(() => typia.assert(props.contractId));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
