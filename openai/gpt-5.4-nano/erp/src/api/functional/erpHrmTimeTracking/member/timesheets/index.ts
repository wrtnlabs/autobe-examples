import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingTimesheet } from "../../../../structures/IErpHrmTimeTrackingTimesheet";
import { IPageIErpHrmTimeTrackingTimesheet } from "../../../../structures/IPageIErpHrmTimeTrackingTimesheet";

export * as approve from "./approve/index";

/**
 * Create a new weekly timesheet container for an employee within the currently selected organization context.
 *
 * This endpoint is the starting point for the timesheet workflow represented by the `erp_hrm_time_tracking_timesheets` table. A timesheet is a weekly container that groups an employee’s timelogs for a specific time period and drives approval workflow using the `status`, `submitted_at`, `approved_at`, and `rejected_at` fields. The timesheet is defined by `week_start_at` and `week_end_at`, and it belongs to exactly one organization (`erp_hrm_time_tracking_organization_id`) and one employee (`erp_hrm_time_tracking_employee_id`).
 *
 * Security and authorization are required: the caller must be allowed to create timesheets for employees in the selected organization context. When the request targets a resource outside the selected organization context, the system must reject the request and must not leak details from other organizations.
 *
 * Employee eligibility is decisive: when an employee is deactivated in an organization, the system must prevent creating new timelogs and submitting timesheets. Since this endpoint creates a timesheet, it must enforce the same deactivation restriction at creation time (including the case where the employee becomes deactivated between the user starting the action and the server processing it).
 *
 * Time-window and timelog attachment rules: if the request includes candidate timelogs (or the system supports attaching existing timelogs as part of creation), the operation must only attach timelogs that belong to the same `erp_hrm_time_tracking_organization_id` and that fall within the created timesheet week window derived from `week_start_at` / `week_end_at`. Any mismatch must be rejected.
 *
 * If the creation succeeds, the system persists the timesheet with its initial workflow `status` and returns the created timesheet record. Errors include invalid organization context, unauthorized access, invalid week boundaries, and invalid employee state. In all rejection cases, no timesheet state changes are performed.
 *
 * Related operations: use the timesheet update/submit/approval endpoints (and list/view endpoints for browsing) after creation to progress the workflow and to manage timelog inclusion for the created timesheet.
 *
 * @param props.connection
 * @param props.body Creation payload for a weekly timesheet container, including target employee and the week boundaries (and optionally timelog inclusion inputs if supported by the request DTO).
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Realize Agent implementation guidance:
 *
 * 1) Authorization & context
 * - Resolve the selected organization context from the authenticated session context.
 * - Verify the caller has permission to create timesheets in that selected organization.
 *
 * 2) Validate target employee and organization scope
 * - Using `erp_hrm_time_tracking_timesheets` creation requirements, validate that `erp_hrm_time_tracking_employee_id` in the create request belongs to the selected organization via `erp_hrm_time_tracking_members` membership.
 * - Enforce employee deactivation rule: if the employee (member) is deactivated for the selected organization, reject with an error indicating the action is not allowed for the employee’s current status. Ensure this check is performed at processing time.
 *
 * 3) Validate week window
 * - Validate `week_start_at` and `week_end_at` values: ensure the end is not earlier than the start, and ensure the requested week range is valid per service interpretation.
 * - Ensure uniqueness invariant on the timesheet model: because `erp_hrm_time_tracking_timesheets` has `@@unique([erp_hrm_time_tracking_employee_id, week_start_at])`, reject or idempotently handle creation attempts that would conflict with an existing timesheet for the same employee and week start.
 *
 * 4) Persist timesheet
 * - Start a transaction.
 * - Create `erp_hrm_time_tracking_timesheets` with:
 *   - `erp_hrm_time_tracking_organization_id` = selected organization id
 *   - `erp_hrm_time_tracking_employee_id` = validated employee id
 *   - `week_start_at`, `week_end_at`
 *   - `status` set to the initial draft-like value expected by the workflow (do not set `submitted_at`, `approved_at`, `rejected_at` unless the business rules require it).
 *
 * 5) Optional timelog association (only if supported by request DTO)
 * - If request includes timelogs to include, then:
 *   - Fetch `erp_hrm_time_tracking_timelogs` for the given timelog ids constrained to `erp_hrm_time_tracking_organization_id` and `erp_hrm_time_tracking_employee_id`.
 *   - Validate each timelog’s `work_date` falls within the timesheet week boundaries.
 *   - Attach by setting `erp_hrm_time_tracking_timelogs.erp_hrm_time_tracking_timesheet_id` to the created timesheet id (and ensure no conflicts with existing timesheet association per business rules).
 *
 * 6) Return
 * - Commit the transaction.
 * - Return the created timesheet entity.
 *
 * 7) Error handling
 * - On unique conflict for `(employee_id, week_start_at)`, return a clear error.
 * - On any validation failure, roll back and return an error without creating the timesheet.
 * - Maintain consistent organization scoping to prevent cross-tenant information exposure.
 * @path /erpHrmTimeTracking/member/timesheets
 * @accessor api.functional.erpHrmTimeTracking.member.timesheets.createTimesheet
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function createTimesheet(
  connection: IConnection,
  props: createTimesheet.Props,
): Promise<createTimesheet.Response> {
  return true === connection.simulate
    ? createTimesheet.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...createTimesheet.METADATA,
          path: createTimesheet.path(),
          status: null,
        },
        props.body,
      );
}
export namespace createTimesheet {
  export type Props = {
    /**
     * Creation payload for a weekly timesheet container, including target employee and the week boundaries (and optionally timelog inclusion inputs if supported by the request DTO).
     */
    body: IErpHrmTimeTrackingTimesheet.ICreate;
  };
  export type Body = IErpHrmTimeTrackingTimesheet.ICreate;
  export type Response = IErpHrmTimeTrackingTimesheet;

  export const METADATA = {
    method: "POST",
    path: "/erpHrmTimeTracking/member/timesheets",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/erpHrmTimeTracking/member/timesheets";
  export const random = (): IErpHrmTimeTrackingTimesheet =>
    typia.random<IErpHrmTimeTrackingTimesheet>();
  export const simulate = (
    connection: IConnection,
    props: createTimesheet.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: createTimesheet.path(),
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
 * Retrieve a filtered and paginated list of timesheets for the currently selected organization context.
 *
 * This endpoint is designed for browsing the weekly timesheet workflow view. It supports filtering by workflow status (draft/submitted/approved/rejected) and scoping the results to the caller’s permitted employee visibility. Employees can browse their own timesheets (including status), while approvers with the organization-scoped timesheet approval capability can browse and review submitted timesheets as permitted by their role.
 *
 * The operation maps to the underlying `erp_hrm_time_tracking_timesheets` records, which define the weekly container for an employee’s timelogs and include the workflow lifecycle fields such as `week_start_at`, `week_end_at`, and `status`. Because timelogs are included from the timelog side (via the optional `erp_hrm_time_tracking_timelogs.erp_hrm_time_tracking_timesheet_id`), this list endpoint focuses on the timesheet container metadata and does not directly modify timelog rows.
 *
 * Security and authorization are enforced by using the caller’s selected organization membership and role permission set. Access to other employees’ submitted timesheets is restricted unless the role permission set includes the appropriate visibility capability. Otherwise, the result set must be limited to the caller’s own timesheets within the selected organization context.
 *
 * Behavior and validation rules:
 * - Pagination is required to avoid unbounded result sets.
 * - When filters are provided (e.g., status or week range), they are applied to `erp_hrm_time_tracking_timesheets` fields.
 * - If a requested filter targets an employee outside the caller’s permitted scope, the endpoint must not reveal that data (it should return an empty result set or ignore the disallowed scope, consistent with the authorization policy).
 * - Deactivation gating: if the request resolves to timesheets for a deactivated employee, the endpoint still allows historical viewing, but time-tracking write operations are blocked elsewhere. This read-only list operation must not alter any state.
 *
 * Related operations:
 * - After browsing via this endpoint, clients typically retrieve detailed single timesheet information by timesheet-specific detail endpoints (not part of this operation) to drive submit/approval/rejection workflows.
 *
 * Error handling:
 * - Invalid filter values (e.g., malformed date ranges) must produce a client error response.
 * - Authorization failures must not disclose existence of out-of-scope employees’ timesheets.
 *
 * @param props.connection
 * @param props.body Timesheet list search criteria including pagination, sorting, and optional workflow/status and week-range filters.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1) Parse the request body
 *   (IerpHrmTimeTrackingTimesheet.IRequest) to extract: - pagination parameters
 *   (page size / cursor / sorting) - filter criteria: timesheet status,
 *   week_start_at/week_end_at range, and optional target employee filtering.
 *
 * 2) Determine authorization scope:
 * - Use the caller’s selected organization context.
 * - If caller is an employee without timesheet view-all permission, force the effective employee scope to the caller’s own member/employee id.
 * - If caller has view-all permission, allow employee filtering only within the selected organization.
 * - For approver roles, restrict any additional review-specific filtering to statuses that are appropriate for review use cases (e.g., submitted) if such constraints are expressed in the request DTO.
 *
 * 3) Build a database query against `erp_hrm_time_tracking_timesheets`:
 * - WHERE erp_hrm_time_tracking_organization_id = selectedOrganizationId
 * - Apply status filter on `status` when provided
 * - Apply week range filter using `week_start_at` and `week_end_at` as supplied by the request
 * - Apply employee filter on `erp_hrm_time_tracking_employee_id` using the effective scope.
 *
 * 4) Sorting:
 * - Default sort should be by `week_start_at` descending (or as defined by the IRequest sorting fields).
 * - Ensure sort fields map only to allowed columns on `erp_hrm_time_tracking_timesheets`.
 *
 * 5) Pagination:
 * - Execute a paginated query and compute pagination metadata.
 * - For large datasets, ensure indexes on `erp_hrm_time_tracking_organization_id`, `status`, and `week_start_at` are used.
 *
 * 6) Response shaping:
 * - Return the page of timesheet summaries (ISummary projection) derived from the selected `erp_hrm_time_tracking_timesheets` rows.
 * - Include only fields required by ISummary; do not embed timelogs.
 *
 * 7) Edge cases:
 * - If the filter range is inverted (end < start), return a validation error.
 * - If an employee filter is disallowed, do not leak data; return an empty list or force effective employee to caller (based on policy encoded in the authorization layer).
 *
 * 8) No state changes:
 * - This endpoint must not create/update/erase timesheet records or versioning locks.
 * - Approved immutability and rejection re-modifiability logic from the timesheet lifecycle applies to write operations only; for this read operation, status values are simply returned.
 *
 * 9) Observability:
 * - Record request context in logs with selected organization id and applied filters (without leaking sensitive employee scopes).
 * @path /erpHrmTimeTracking/member/timesheets
 * @accessor api.functional.erpHrmTimeTracking.member.timesheets.index
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
     * Timesheet list search criteria including pagination, sorting, and optional workflow/status and week-range filters.
     */
    body: IErpHrmTimeTrackingTimesheet.IRequest;
  };
  export type Body = IErpHrmTimeTrackingTimesheet.IRequest;
  export type Response = IPageIErpHrmTimeTrackingTimesheet.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/erpHrmTimeTracking/member/timesheets",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/erpHrmTimeTracking/member/timesheets";
  export const random = (): IPageIErpHrmTimeTrackingTimesheet.ISummary =>
    typia.random<IPageIErpHrmTimeTrackingTimesheet.ISummary>();
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
 * Retrieve the detailed timesheet record identified by the given timesheetId.
 *
 * This endpoint returns a single weekly timesheet entity, including its workflow status and submission/review timestamps as stored on the timesheet record. The result is intended for the employee timesheet detail view, where users need to see the current status of their week and the associated lifecycle information.
 *
 * Access control is enforced in the context of the currently selected organization. Timesheet records are always treated as organization-scoped, and the system must reject requests that target a timesheet belonging to a different organization context.
 *
 * Viewing scope is determined by the requesting actor’s effective role permissions for the selected organization:
 * - An employee can view their own timesheets.
 * - A user with the time:approve permission can view all submitted timesheets.
 *
 * If a viewing request is denied due to insufficient permissions or incorrect organization context, the system must not reveal whether the requested timesheet exists and must not expose any details from a timesheet that the requester is not allowed to view.
 *
 * This endpoint pairs naturally with the timesheet list/search operations (which provide paginated filtering by status and date range) so that users can locate a timesheet and then open its details by id. If the client needs to browse multiple weeks, call the list endpoint first; use this endpoint for the single-week detail view.
 *
 * @param props.connection
 * @param props.timesheetId Target timesheet identifier to retrieve.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement GET detail retrieval for a single
 *   timesheet.
 *
 * 1) Parse path parameter timesheetId.
 * 2) Resolve organization context from the authenticated member session (selected organization).
 * 3) Query erp_hrm_time_tracking_timesheets where id = timesheetId AND erp_hrm_time_tracking_organization_id = selected organization.
 * 4) If no record matches, respond with a safe authorization-style denial (do not leak existence).
 * 5) Authorization rules:
 *    a) Determine the requesting member identity (performedBy/actor id) and role permissions in the selected organization.
 *    b) If requesting member is the timesheet owner (erp_hrm_time_tracking_employee_id matches the member’s employee identity) allow.
 *    c) Else, allow only if the requesting member has the timesheet approval permission (time:approve) AND the timesheet status indicates it is submitted (per erp_hrm_time_tracking_timesheets.status). If not submitted, deny.
 *    d) On any denial, do not reveal whether the timesheet exists; treat as not viewable.
 * 6) On success, map the timesheet record fields to the response DTO.
 * 7) Return 200 with the DTO.
 *
 * Edge cases:
 * - Enforce organization scoping strictly even if the id exists in other organizations.
 * - Ensure status checks for approval-based viewing are applied before returning any details.
 * - Use consistent error handling for denied access (no existence leaks).
 * @path /erpHrmTimeTracking/member/timesheets/:timesheetId
 * @accessor api.functional.erpHrmTimeTracking.member.timesheets.at
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
     * Target timesheet identifier to retrieve.
     */
    timesheetId: string & tags.Format<"uuid">;
  };
  export type Response = IErpHrmTimeTrackingTimesheet;

  export const METADATA = {
    method: "GET",
    path: "/erpHrmTimeTracking/member/timesheets/:timesheetId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/erpHrmTimeTracking/member/timesheets/${encodeURIComponent(props.timesheetId ?? "null")}`;
  export const random = (): IErpHrmTimeTrackingTimesheet =>
    typia.random<IErpHrmTimeTrackingTimesheet>();
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
      assert.param("timesheetId")(() => typia.assert(props.timesheetId));
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
 * Update an existing timesheet record for a specific employee week.
 *
 * This operation targets the `erp_hrm_time_tracking_timesheets` entity, identified by `id`. The table represents one weekly container for an employee’s timelogs and stores the workflow `status` plus lifecycle timestamps such as `submitted_at`, `approved_at`, and `rejected_at`. The update is workflow-sensitive: only timesheets that are in an allowed editable state should be modifiable, and transitions that require review/decision must be handled by the dedicated approve/reject workflows rather than by direct updates.
 *
 * Authorization and organization scoping are mandatory. Access must be enforced using the currently selected organization context. If the request targets a timesheet not belonging to the selected organization, the system must reject the request and must not reveal details from other organizations. For employee-scoped access, employees can only interact with their own timesheets, while users with `time:approve`-capability can view all submitted timesheets but still must not be allowed to perform invalid transitions.
 *
 * Editing safety is enforced through `erp_hrm_time_tracking_timesheet_versioning_locks`. When a timesheet is being edited/updated in a way that affects timelog content, the system must verify whether an active versioning lock exists for the target timesheet (i.e., a lock record not marked as released via `deleted_at`). If an active lock is present and is not held/owned by the current user/session context, the update must be rejected to prevent concurrent edits.
 *
 * Deactivation gating must be applied. If the employee for the target timesheet is deactivated in the selected organization, the system must prevent creating new timelogs and must prevent submission. For this PUT operation specifically, it must reject invalid time-tracking updates caused by deactivation, while still allowing access to preserved historical data.
 *
 * Expected behavior includes strict state checks: when the timesheet is not in a modifiable workflow state (for example, it is already submitted/approved and thus under review or locked), the system must reject the update and leave the timesheet and its associated timelogs unchanged.
 *
 * Related behavior: approval actions lock all timelogs included in an approved timesheet so they cannot be edited or deleted. This PUT operation must not bypass that rule; if the update would effectively attempt to modify timelog content for a non-editable timesheet, it must be rejected.
 *
 * Error handling must provide clear “action not allowed for the current status” semantics for invalid state transitions (without exposing cross-tenant existence).
 *
 * @param props.connection
 * @param props.timesheetId Identifier of the target timesheet to update.
 * @param props.body Update payload for the target timesheet. The server applies workflow-state and authorization checks before persisting changes.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps: 1. Resolve the current actor’s
 *   selected organization context and user identity. 2. Load
 *   `erp_hrm_time_tracking_timesheets` by `id` = {timesheetId}. - If not found,
 *   reject with a not-found/denied response appropriate to the service’s error
 *   contract. - Verify `erp_hrm_time_tracking_organization_id` matches the
 *   selected organization; otherwise reject with an organization-scoped denial
 *   (do not return any timesheet details). - Verify the actor has permission to
 *   update based on employee ownership and/or role context. Employees must only
 *   update their own timesheets. 3. Workflow state validation using the
 *   timesheet fields: - Read `status`. - Allow updates only for the editable
 *   workflow states. If the timesheet is in a non-editable state (e.g.,
 *   submitted/approved), reject without changing any data. 4. Versioning lock
 *   enforcement: - Query `erp_hrm_time_tracking_timesheet_versioning_locks`
 *   where `timesheet_id` = timesheet.id and `deleted_at` is null (active
 *   locks). - If an active lock exists and the current actor/session does not
 *   own the lock via `locked_by_user_id`, reject. 5. Deactivation gating: -
 *   Determine whether the timesheet’s employee is deactivated in the selected
 *   organization. (This requires joining/consulting the employee status from
 *   the system; do not proceed with any timelog modifications when
 *   deactivated.) - If deactivated, reject invalid time-tracking updates. 6.
 *   Apply updates: - Update allowed fields on
 *   `erp_hrm_time_tracking_timesheets`. - If the request includes timelog
 *   modifications indirectly, validate each `erp_hrm_time_tracking_timelogs`
 *   row belongs to: - `erp_hrm_time_tracking_organization_id` =
 *   timesheet.erp_hrm_time_tracking_organization_id -
 *   `erp_hrm_time_tracking_employee_id` =
 *   timesheet.erp_hrm_time_tracking_employee_id - and (when applicable)
 *   `erp_hrm_time_tracking_timesheet_id` equals this timesheet.id. - Ensure
 *   timelog modifications are consistent with workflow status checks; for
 *   non-editable timesheets, never mutate timelogs. 7. Transactionality: - Wrap
 *   all updates (timesheet + any timelog modifications) in a single database
 *   transaction. - If any validation fails, rollback and return an error. 8.
 *   Return the updated timesheet.
 *
 * Edge cases:
 * - The employee can be deactivated between the client starting the action and the server applying it; re-check deactivation status during step 5.
 * - If a lock is acquired concurrently after validation but before commit, enforce lock checks inside the transaction and reject/rollback when detected.
 * - Maintain referential integrity for optional relations (timelog.task_id, timelog.timesheet_id).
 * @path /erpHrmTimeTracking/member/timesheets/:timesheetId
 * @accessor api.functional.erpHrmTimeTracking.member.timesheets.update
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
     * Identifier of the target timesheet to update.
     */
    timesheetId: string & tags.Format<"uuid">;

    /**
     * Update payload for the target timesheet. The server applies workflow-state and authorization checks before persisting changes.
     */
    body: IErpHrmTimeTrackingTimesheet.IUpdate;
  };
  export type Body = IErpHrmTimeTrackingTimesheet.IUpdate;
  export type Response = IErpHrmTimeTrackingTimesheet;

  export const METADATA = {
    method: "PUT",
    path: "/erpHrmTimeTracking/member/timesheets/:timesheetId",
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
    `/erpHrmTimeTracking/member/timesheets/${encodeURIComponent(props.timesheetId ?? "null")}`;
  export const random = (): IErpHrmTimeTrackingTimesheet =>
    typia.random<IErpHrmTimeTrackingTimesheet>();
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
      assert.param("timesheetId")(() => typia.assert(props.timesheetId));
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
 * Permanently removes a specific timesheet identified by its timesheetId.
 *
 * This endpoint targets the weekly timesheet container stored in `erp_hrm_time_tracking_timesheets`, which includes the owning organization (`erp_hrm_time_tracking_organization_id`), owning employee (`erp_hrm_time_tracking_employee_id`), week boundaries (`week_start_at`, `week_end_at`), and workflow `status` (e.g., draft/submitted/approved/rejected). Because timelogs are associated from the timelog side via an optional `erp_hrm_time_tracking_timelogs_erp_hrm_time_tracking_timesheet_id` reference, deleting a timesheet must be handled consistently with the workflow rules that restrict subsequent timelog modifications once a timesheet is approved.
 *
 * Authorization is enforced based on the actor’s selected organization context and the role permission capabilities described in the system analysis (notably time-approval and time-management capabilities). Requests that target data outside the selected organization must be rejected.
 *
 * Business validation focuses on the timesheet workflow `status`. The system’s time tracking workflow states that once a timesheet is approved, timelogs included in that approved timesheet become locked for editing and deletion. Therefore, this operation must validate whether deleting the targeted timesheet is allowed given its current `status`, and must reject the request when the workflow state requires immutability.
 *
 * If deletion is allowed, the service layer must delete the `erp_hrm_time_tracking_timesheets` row and rely on the relational behavior to handle linked objects. The model relationships indicate that timelogs and versioning locks reference the timesheet; the implementation must ensure referential consistency (e.g., deleting versioning locks and handling timelog references according to configured cascade behavior).
 *
 * Error handling: if the timesheet record does not exist for the selected organization, the service must reject the request. If the timesheet exists but violates workflow eligibility for deletion, the service must reject the request.
 *
 * Related operations:
 * - To review timelog content for a week, call the timelog browsing endpoints (search/list by week boundaries or timesheet context).
 * - To check workflow state transitions, call timesheet workflow-related operations for submission/approval/rejection instead of relying on deletion for state correction.
 *
 * @param props.connection
 * @param props.timesheetId Target timesheet identifier (UUID) to be removed. This refers to `erp_hrm_time_tracking_timesheets.id`.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Delete service implementation steps: 1) Parse
 *   `timesheetId` (UUID) from path. 2) Load the
 *   `erp_hrm_time_tracking_timesheets` row by id. 3) Enforce organization
 *   scoping using `erp_hrm_time_tracking_organization_id` so the caller can
 *   only operate within the selected organization. 4) Validate workflow
 *   eligibility based on `status`: - If `status` indicates the timesheet has
 *   been approved (business rule from requirements: approved timesheets lock
 *   included timelogs for editing and deletion), reject deletion. - If `status`
 *   allows deletion (e.g., draft/rejected), proceed. 5) Permission enforcement:
 *   - Apply the permission matrix logic for timesheet deletion authorization
 *   (time:manage/time:approve/time:edit equivalents per role permissions). - If
 *   the caller lacks required capability, reject. 6) Transaction: - Start a
 *   transaction. - Delete versioning locks rows associated with `timesheet_id`
 *   (if any are active) to avoid orphan lock references. - Delete the timesheet
 *   row from `erp_hrm_time_tracking_timesheets`. - Ensure referential
 *   constraints for associated timelogs are satisfied (either cascaded behavior
 *   per schema or update nullable FK
 *   `erp_hrm_time_tracking_timelogs_erp_hrm_time_tracking_timesheet_id` if
 *   required by implementation). 7) Return success with no response body.
 *
 * Edge cases:
 * - Timesheet exists but caller targets wrong organization: reject.
 * - Concurrent workflow changes: re-check `status` inside the same transaction before final deletion.
 * - Versioning lock presence: if a lock exists and the workflow requires it, enforce lock ownership rules via `locked_by_user_id` and lock activity. If lock prevents deletion, reject.
 *
 * Do not implement authentication/session management in this operation; it must rely on middleware-provided actor context.
 * @path /erpHrmTimeTracking/member/timesheets/:timesheetId
 * @accessor api.functional.erpHrmTimeTracking.member.timesheets.erase
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
     * Target timesheet identifier (UUID) to be removed. This refers to `erp_hrm_time_tracking_timesheets.id`.
     */
    timesheetId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/erpHrmTimeTracking/member/timesheets/:timesheetId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/erpHrmTimeTracking/member/timesheets/${encodeURIComponent(props.timesheetId ?? "null")}`;
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
      assert.param("timesheetId")(() => typia.assert(props.timesheetId));
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
 * Submit a draft timesheet for approval.
 *
 * This operation performs a workflow transition on a specific weekly timesheet identified by `timesheetId`. It is intended for employees to send their draft work (a week Monday–Sunday as modeled by `week_start_at`/`week_end_at`) into the approval pipeline by moving the timesheet into a `submitted` workflow status and recording the decision-entry timestamp.
 *
 * Organization-scoped access is strictly enforced: the timesheet being submitted must belong to the currently selected organization context. If a user attempts to submit a timesheet that is outside the selected organization, the request is rejected and no cross-tenant details are exposed.
 *
 * Submission rules are enforced based on the timesheet’s current workflow state and its included timelogs. The service must prevent submission when the timesheet contains no timelogs. If the employee attempts to submit an empty draft (for example, they removed all timelogs from the draft), the request is rejected with a business-relevant message indicating that submission requires at least one timelog.
 *
 * Employee deactivation is also enforced at submission time. If the timesheet belongs to a deactivated employee, the service must block the transition into `submitted` status, while still allowing access to preserved historical timesheets for viewing.
 *
 * After successful submission, the timesheet’s status is updated and `submitted_at` is set. The operation does not require a rejection reason (that is required only when rejecting an already submitted timesheet). If a submission attempt fails due to an unexpected internal failure, the system must reject the operation and leave the timesheet’s workflow status unchanged.
 *
 * Related operations:
 *
 * - Employees typically view and edit draft contents via timesheet list/detail operations, then call this endpoint to submit.
 * - Time approvers can later approve or reject the submitted timesheet; those flows require additional permission checks and, for rejection, a rejection reason.
 * - If a submitted timesheet is rejected, the workflow returns to draft, allowing the employee to modify and resubmit using this same endpoint.
 *
 * @param props.connection
 * @param props.timesheetId Target timesheet identifier to be submitted for approval.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1) Authorization & organization scoping - Resolve the
 *   caller’s selected organization context. - Load the target
 *   erp_hrm_time_tracking_timesheets row by `id = timesheetId`. - Verify
 *   `erp_hrm_time_tracking_timesheets.erp_hrm_time_tracking_organization_id`
 *   matches the selected organization. - Verify the caller is allowed to submit
 *   (employee context for the owning employee; reject if cross-user or
 *   insufficient permission).
 *
 * 2) Validate current workflow state
 * - Read `status` from the timesheet.
 * - Allow submit only from the `draft` workflow state. Reject if already `submitted`, `approved`, or `rejected` in a way that would violate workflow rules.
 *
 * 3) Validate employee activation constraint
 * - Join through `erp_hrm_time_tracking_members` using `erp_hrm_time_tracking_timesheets.erp_hrm_time_tracking_employee_id`.
 * - Ensure the employee is active for new submissions per domain rules (deactivated employees cannot submit). Reject if the employee is deactivated.
 *
 * 4) Validate timelog non-emptiness
 * - Query erp_hrm_time_tracking_timelogs where:
 *   - `erp_hrm_time_tracking_timelogs.erp_hrm_time_tracking_timesheet_id = timesheet.id`
 *   - and `deleted_at` is null / record is active (do not count deleted timelogs).
 * - If the count is 0, reject with the specific business message: submission requires at least one timelog.
 *
 * 5) Validate duplicate week constraint
 * - Using the timesheet’s `erp_hrm_time_tracking_employee_id`, `week_start_at`, and `week_end_at`, ensure no other timesheet for the same employee and same week is already in `submitted` or `approved` status (exclude the current timesheet id).
 * - If such a conflicting timesheet exists, reject.
 *
 * 6) Apply transition atomically
 * - In a single transaction:
 *   - Update `erp_hrm_time_tracking_timesheets.status` to `submitted`.
 *   - Set `submitted_at = now()`.
 *   - Do not modify `approved_at`/`rejected_at`.
 * - Ensure that concurrency does not allow duplicate submissions: re-check constraints within the same transaction or apply appropriate locking.
 *
 * 7) Error handling
 * - If any validation fails, return an appropriate domain error without changing the timesheet.
 * - If the update fails unexpectedly, abort and keep the timesheet status unchanged.
 *
 * 8) Return
 * - Return the updated timesheet entity (including workflow timestamps) as the successful response payload.
 * @path /erpHrmTimeTracking/member/timesheets/:timesheetId/submit
 * @accessor api.functional.erpHrmTimeTracking.member.timesheets.submit
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function submit(
  connection: IConnection,
  props: submit.Props,
): Promise<submit.Response> {
  return true === connection.simulate
    ? submit.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...submit.METADATA,
          path: submit.path(props),
          status: null,
        },
      );
}
export namespace submit {
  export type Props = {
    /**
     * Target timesheet identifier to be submitted for approval.
     */
    timesheetId: string & tags.Format<"uuid">;
  };
  export type Response = IErpHrmTimeTrackingTimesheet;

  export const METADATA = {
    method: "POST",
    path: "/erpHrmTimeTracking/member/timesheets/:timesheetId/submit",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/erpHrmTimeTracking/member/timesheets/${encodeURIComponent(props.timesheetId ?? "null")}/submit`;
  export const random = (): IErpHrmTimeTrackingTimesheet =>
    typia.random<IErpHrmTimeTrackingTimesheet>();
  export const simulate = (
    connection: IConnection,
    props: submit.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: submit.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("timesheetId")(() => typia.assert(props.timesheetId));
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
 * Reject a submitted timesheet in the current organization workflow.
 *
 * This operation is the workflow decision endpoint for timesheets: when a timesheet is in a reviewable submitted state, an authorized reviewer can reject it by providing a rejection reason. The system records the review outcome and transitions the timesheet back to draft so that the employee can modify it and then resubmit.
 *
 * This endpoint enforces that the reviewer must have the time:approve permission capability in the currently selected organization context. If the requester’s effective role permissions for the selected organization do not include time:approve, the system must prevent approval/rejection actions.
 *
 * The operation also validates the timesheet’s current status before applying the rejection. If the timesheet is not in submitted status, the system must reject the request and leave the timesheet state unchanged.
 *
 * Relationship-wise, the rejected timesheet is a row in erp_hrm_time_tracking_timesheets, identified by timesheetId, with the organization and employee scope preserved via erp_hrm_time_tracking_organization_id and erp_hrm_time_tracking_employee_id. The workflow timestamps (submitted_at / approved_at / rejected_at) and the status field are updated according to the rejection workflow.
 *
 * If the rejection succeeds, the timesheet status must return to draft and any workflow-relevant review data must be stored. If the rejection fails due to an unexpected internal error, the system must reject the operation and leave the timesheet status unchanged.
 *
 * Error handling expectations:
 *
 * - Missing rejection reason: reject the request.
 * - Timesheet not in submitted status: reject the request without changing status.
 * - Reviewer without time:approve permission in the selected organization: reject the request.
 * - Organization context mismatch: reject without leaking details from other organizations.
 *
 * This operation is typically used together with the corresponding timesheet review/view operations so that a reviewer can locate submitted timesheets before rejecting one.
 *
 * @param props.connection
 * @param props.timesheetId Target timesheet identifier to reject. Must refer to a timesheet in the currently selected organization.
 * @param props.body Rejection payload for the timesheet review workflow. The rejection reason is required to return the timesheet to draft.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement POST /timesheets/{timesheetId}/reject as a
 *   workflow transition with strict authorization and state validation.
 *
 * 1) Input validation
 * - Parse request body and require a non-empty rejectionReason.
 *
 * 2) Load target timesheet
 * - Query erp_hrm_time_tracking_timesheets by id = timesheetId.
 * - Load/derive the selected organization context for the authenticated requester (enforced by middleware).
 * - Ensure the timesheet belongs to the selected organization via erp_hrm_time_tracking_organization_id. If not, reject with an access/validation error and do not reveal details.
 *
 * 3) Authorization
 * - Determine requester’s effective permissions in the selected organization.
 * - Allow the operation only if the requester has time:approve capability in the selected organization context. Otherwise reject.
 *
 * 4) State validation
 * - Read timesheet.status from erp_hrm_time_tracking_timesheets.
 * - If status is not 'submitted' (submitted workflow state), reject and do not update anything.
 *
 * 5) Transactional state transition
 * - In a single database transaction:
 *   - Set status to 'draft'.
 *   - Set rejected_at to current timestamp.
 *   - Keep submitted_at/approved_at unchanged unless the existing domain rules specify otherwise; do not null out existing history unless explicitly defined.
 *   - Persist reviewer outcome data if there is a dedicated reviewer/audit storage mechanism (e.g., via ActivityLogEntry or timesheet fields) as defined in the domain implementation.
 *
 * 6) Audit/logging
 * - Record an activity log entry that the user rejected the timesheet (target is the timesheet id; include outcome='rejected'). Use erp_hrm_time_tracking_activity_log_entries if required by the service design.
 *
 * 7) Error handling
 * - For unexpected internal failures during the transaction, roll back and leave status unchanged.
 * - Return an appropriate error for missing reason, permission denial, invalid status, and organization mismatch.
 *
 * 8) Response
 * - Return the updated timesheet resource representation (including updated status and timestamps).
 * @path /erpHrmTimeTracking/member/timesheets/:timesheetId/reject
 * @accessor api.functional.erpHrmTimeTracking.member.timesheets.reject
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function reject(
  connection: IConnection,
  props: reject.Props,
): Promise<reject.Response> {
  return true === connection.simulate
    ? reject.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...reject.METADATA,
          path: reject.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace reject {
  export type Props = {
    /**
     * Target timesheet identifier to reject. Must refer to a timesheet in the currently selected organization.
     */
    timesheetId: string & tags.Format<"uuid">;

    /**
     * Rejection payload for the timesheet review workflow. The rejection reason is required to return the timesheet to draft.
     */
    body: IErpHrmTimeTrackingTimesheet.IReject;
  };
  export type Body = IErpHrmTimeTrackingTimesheet.IReject;
  export type Response = IErpHrmTimeTrackingTimesheet;

  export const METADATA = {
    method: "POST",
    path: "/erpHrmTimeTracking/member/timesheets/:timesheetId/reject",
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
    `/erpHrmTimeTracking/member/timesheets/${encodeURIComponent(props.timesheetId ?? "null")}/reject`;
  export const random = (): IErpHrmTimeTrackingTimesheet =>
    typia.random<IErpHrmTimeTrackingTimesheet>();
  export const simulate = (
    connection: IConnection,
    props: reject.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: reject.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("timesheetId")(() => typia.assert(props.timesheetId));
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
