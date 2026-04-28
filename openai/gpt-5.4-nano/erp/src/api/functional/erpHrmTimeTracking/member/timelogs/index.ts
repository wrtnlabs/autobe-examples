import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingTimelog } from "../../../../structures/IErpHrmTimeTrackingTimelog";
import { IPageIErpHrmTimeTrackingTimelog } from "../../../../structures/IPageIErpHrmTimeTrackingTimelog";

/**
 * Creates a new employee timelog entry within the currently selected organization context.
 *
 * This operation stores a single atomic unit of work in the `erp_hrm_time_tracking_timelogs` table. A timelog is always attributed to a specific organization (`erp_hrm_time_tracking_organization_id`) and a specific employee/member (`erp_hrm_time_tracking_employee_id`). The request captures the work grouping and duration fields (`work_date`, `start_time`/`end_time` where provided, and `duration_minutes`) together with optional contextual note (`note`).
 *
 * The operation also associates the timelog to a `project` via `erp_hrm_time_tracking_project_id`. Timelogs may optionally be associated to a `task` within the same project via `erp_hrm_time_tracking_task_id`. If a `timesheet_id` is provided, the timelog becomes part of that timesheet workflow container by writing `erp_hrm_time_tracking_timesheet_id`; the system still relies on the timelog itself for atomic history (historical changes are preserved via snapshots rather than inline JSON fields).
 *
 * Security and access control are strictly organization-scoped. All timelog creation is enforced so that the created record is within the selected organization, and the employee reference is limited to the actor’s membership context. The system rejects requests that attempt to create timelogs outside the selected organization.
 *
 * Business rules enforce that new timelogs cannot be associated with projects that are archived or completed. If the referenced project is archived or completed, the system rejects this operation.
 *
 * The created record is returned to enable UI confirmation of the entered values. Subsequent operations (edit/delete) must respect timesheet workflow locking rules: employees cannot edit/delete timelogs once those timelogs are included in submitted/approved timesheets, while draft timesheet state allows draft edits through the approved workflow.
 *
 * Related operations you may use together:
 *
 * - List/filter timelogs for review and correction (organization-scoped) using the corresponding timelog list operation.
 * - If you support selecting a timesheet week container, you can retrieve or update the relevant timesheet to understand the workflow status before allowing edits.
 *
 * Expected errors include:
 *
 * - Project status rejects when the target project is archived/completed.
 * - Task mismatch rejects when an optional task does not belong to the referenced project.
 * - Organization/membership rejects when the request attempts to create timelogs outside the current organization context.
 *
 *
 *
 * @param props.connection
 * @param props.body Creation payload for a new timelog entry, including work date, duration in minutes, target project, and optional task/note/timesheet linkage.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1) Authorization & context - Resolve the actor’s
 *   currently selected organization context. - Determine the target
 *   employee/member id from the actor identity within that organization
 *   context. - Enforce that the operation can only create timelog rows for the
 *   selected organization (set erp_hrm_time_tracking_organization_id from
 *   context; never accept an arbitrary organization id from the client).
 *
 * 2) Validate request payload against timelog invariants from the schema/comments and the loaded requirements:
 * - work_date must be provided (timelog requires a date for timesheet grouping).
 * - duration_minutes must be provided and represent minutes (stored as Int duration_minutes).
 * - start_time/end_time are optional; if provided, validate basic interval consistency (e.g., start_time <= end_time) at application level.
 * - note is optional.
 *
 * 3) Project association validation
 * - Look up the project by erp_hrm_time_tracking_project_id.
 * - Enforce the project belongs to the selected organization.
 * - Enforce project status rule: allow timelog association only when project.status is active; reject when archived or completed.
 *
 * 4) Optional task association validation
 * - If erp_hrm_time_tracking_task_id is provided:
 *   - Look up the task.
 *   - Enforce task belongs to the referenced project (task.erp_hrm_time_tracking_project_id must match the project id).
 *   - Enforce task is within the selected organization (via project ownership).
 *
 * 5) Optional timesheet association validation
 * - If erp_hrm_time_tracking_timesheet_id is provided:
 *   - Validate that the timesheet belongs to the selected organization and the same employee.
 *   - Validate that the timesheet workflow context is acceptable for adding timelogs (draft vs submitted/approved). If adding is disallowed by workflow, reject.
 * - If not provided, create the timelog without timesheet linkage (erp_hrm_time_tracking_timesheet_id = null).
 *
 * 6) Persist
 * - Start a transaction.
 * - Insert into erp_hrm_time_tracking_timelogs:
 *   - id (generated)
 *   - erp_hrm_time_tracking_organization_id (from context)
 *   - erp_hrm_time_tracking_employee_id (from actor)
 *   - erp_hrm_time_tracking_project_id (validated)
 *   - erp_hrm_time_tracking_task_id (validated or null)
 *   - erp_hrm_time_tracking_timesheet_id (validated or null)
 *   - work_date, start_time, end_time, duration_minutes, note
 *   - created_at/updated_at
 * - Commit.
 *
 * 7) Return
 * - Load the created timelog row and return it as the response entity DTO.
 *
 * 8) Edge cases and errors
 * - If the project is archived/completed: reject.
 * - If task does not belong to the project: reject.
 * - If timesheet_id is for a different employee or organization: reject.
 * - If actor is not allowed to act in the selected organization: reject.
 *
 *
 * @path /erpHrmTimeTracking/member/timelogs
 * @accessor api.functional.erpHrmTimeTracking.member.timelogs.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Creation payload for a new timelog entry, including work date, duration in minutes, target project, and optional task/note/timesheet linkage.
     */
    body: IErpHrmTimeTrackingTimelog.ICreate;
  };
  export type Body = IErpHrmTimeTrackingTimelog.ICreate;
  export type Response = IErpHrmTimeTrackingTimelog;

  export const METADATA = {
    method: "POST",
    path: "/erpHrmTimeTracking/member/timelogs",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/erpHrmTimeTracking/member/timelogs";
  export const random = (): IErpHrmTimeTrackingTimelog =>
    typia.random<IErpHrmTimeTrackingTimelog>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(),
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
 * Retrieve a filtered and paginated list of timelog entries for the currently selected organization.
 *
 * This operation is designed for browsing and reporting workflows where a member needs to find timelog entries by time window, project, optional task, and optional timesheet week context. It accepts a structured request body containing pagination and filtering criteria, and returns a page of timelog summaries suitable for list UI rendering.
 *
 * Scoping and data access: All timelog operations (including viewing and listing) are strictly scoped to the currently selected organization. The service must prevent any query that would access timelog records outside the selected organization context.
 *
 * Project lifecycle implications: When a project is archived or completed, the system must prevent new timelog creation, but already recorded timelogs must remain available for reporting and browsing. This list endpoint therefore returns existing timelogs that match the provided filters while applying organization scoping.
 *
 * Database relationships: Each timelog belongs to an organization (erp_hrm_time_tracking_organization_id), a member/employee (erp_hrm_time_tracking_employee_id), and a project (erp_hrm_time_tracking_project_id), with an optional task (erp_hrm_time_tracking_task_id) and optional timesheet container (erp_hrm_time_tracking_timesheet_id). The implementation should filter against these columns and may join to related tables to populate summary fields if required by the DTO.
 *
 * Error handling expectations: If no matching timelogs exist, return an empty page successfully. If validation fails (e.g., invalid pagination or inconsistent date range), return a client error describing the invalid fields.
 *
 * @param props.connection
 * @param props.body Timelog browsing criteria including pagination, sorting, and optional filters such as employee, project, task, timesheet container, and work date range.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps:
 *
 * 1) Read requestBody (IErpHrmTimeTrackingTimelog.IRequest) for pagination/sorting and filters.
 * 2) Start a query on erp_hrm_time_tracking_timelogs.
 * 3) Enforce organization scope: constrain erp_hrm_time_tracking_organization_id to the selected organization.
 * 4) Apply filters:
 * - work_date range (work_date)
 * - project (erp_hrm_time_tracking_project_id) when provided
 * - optional task (erp_hrm_time_tracking_task_id) when provided
 * - optional employee/member (erp_hrm_time_tracking_employee_id) when provided
 * - optional timesheet (erp_hrm_time_tracking_timesheet_id) when provided
 * 5) Exclude removed records by applying deleted_at IS NULL.
 * 6) Apply sorting based on request constraints (e.g., work_date; optionally created_at) and enforce safe/default ordering when missing.
 * 7) Apply pagination and compute the paginated result set.
 * 8) Map database rows into IErpHrmTimeTrackingTimelog.ISummary fields.
 * 9) Return IPageIErpHrmTimeTrackingTimelog.ISummary with pagination metadata and data.
 *
 * Edge cases:
 * - If filters match no timelogs, return empty data with valid pagination metadata.
 * - If request pagination/date parameters are invalid, return validation/client errors.
 * - Never return records outside the selected organization.
 * @path /erpHrmTimeTracking/member/timelogs
 * @accessor api.functional.erpHrmTimeTracking.member.timelogs.index
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
     * Timelog browsing criteria including pagination, sorting, and optional filters such as employee, project, task, timesheet container, and work date range.
     */
    body: IErpHrmTimeTrackingTimelog.IRequest;
  };
  export type Body = IErpHrmTimeTrackingTimelog.IRequest;
  export type Response = IPageIErpHrmTimeTrackingTimelog.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/erpHrmTimeTracking/member/timelogs",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/erpHrmTimeTracking/member/timelogs";
  export const random = (): IPageIErpHrmTimeTrackingTimelog.ISummary =>
    typia.random<IPageIErpHrmTimeTrackingTimelog.ISummary>();
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
 * Retrieve a single timelog record by its identifier.
 *
 * This operation is the read entry point for the timelog entity stored in `erp_hrm_time_tracking_timelogs`, which captures recorded work time for an employee in an organization. The timelog row includes `erp_hrm_time_tracking_organization_id` (tenant scope), `erp_hrm_time_tracking_employee_id` (owner employee), `erp_hrm_time_tracking_project_id` (project attribution), optional `erp_hrm_time_tracking_task_id` (task attribution), and timing/work details such as `work_date`, `start_time`, `end_time`, `duration_minutes`, plus an optional `note`. It also carries workflow linkage via optional `erp_hrm_time_tracking_timesheet_id` and standard audit timestamps (`created_at`, `updated_at`).
 *
 * Security and authorization are organization- and actor-scoped. All timelog operations (including viewing) are restricted to the currently selected organization, so the implementation must only expose timelog rows whose `erp_hrm_time_tracking_organization_id` matches the selected organization context. Additionally, employees can view their own timelogs, and cross-employee viewing is only allowed when the user has the `time:view_all` permission; when that permission is not present, the operation must verify that the target timelog’s `erp_hrm_time_tracking_employee_id` matches the requesting employee.
 *
 * Implementation-wise, the operation performs a single-entity lookup by `erp_hrm_time_tracking_timelogs.id` and applies the organization-scoping and (if necessary) owner-scoping predicates. The service layer should also exclude unavailable records by honoring `deleted_at` semantics consistent with other timelog operations (i.e., only return records that are considered active). If the target record does not exist within the permitted scope, the API should respond with an appropriate not-found/forbidden behavior according to the service’s global error-handling conventions.
 *
 * Related operations that often pair with this endpoint include paginated timelog listing (for searching by date range / project / task) and timelog creation/update flows. Use the list operation to browse timelogs and then call this operation to retrieve a specific timelog’s details.
 *
 * @param props.connection
 * @param props.timelogId Identifier of the timelog record to retrieve.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps:
 *
 * 1. Resolve authorization context:
 *    - Determine the selected organization (tenant) from the session/context.
 *    - Determine the requesting actor’s employee identity when the requestor is an employee/member.
 *    - Determine whether the actor has `time:view_all` permission.
 *
 * 2. Validate/normalize input:
 *    - Ensure `timelogId` is treated as a UUID string for querying.
 *
 * 3. Query logic:
 *    - Start from `erp_hrm_time_tracking_timelogs`.
 *    - Apply mandatory tenant filter: `erp_hrm_time_tracking_organization_id == selectedOrganizationId`.
 *    - Apply identity filter:
 *      - If actor does NOT have `time:view_all`, add `erp_hrm_time_tracking_employee_id == requestingEmployeeId`.
 *    - Add primary lookup predicate: `id == timelogId`.
 *    - Apply active availability predicate: `deleted_at IS NULL`.
 *
 * 4. Optional joins / enrichment:
 *    - If `IErpHrmTimeTrackingTimelog` DTO requires project/task/timesheet fields, join `erp_hrm_time_tracking_projects` and `erp_hrm_time_tracking_tasks` (and `erp_hrm_time_tracking_timesheets` if applicable).
 *    - Always ensure joined records do not break tenant scoping.
 *
 * 5. Error handling:
 *    - If no row matches after scoping predicates, return not-found (or the service’s standard response for inaccessible resources).
 *    - If authorization context is missing/invalid, rely on auth middleware/handlers.
 *
 * 6. Audit/response:
 *    - Map the selected timelog row to `IErpHrmTimeTrackingTimelog` response DTO.
 *
 * Transaction considerations:
 * - This is a read-only operation; no transaction is required beyond the standard consistency level of the database read.
 * @path /erpHrmTimeTracking/member/timelogs/:timelogId
 * @accessor api.functional.erpHrmTimeTracking.member.timelogs.at
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
     * Identifier of the timelog record to retrieve.
     */
    timelogId: string & tags.Format<"uuid">;
  };
  export type Response = IErpHrmTimeTrackingTimelog;

  export const METADATA = {
    method: "GET",
    path: "/erpHrmTimeTracking/member/timelogs/:timelogId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/erpHrmTimeTracking/member/timelogs/${encodeURIComponent(props.timelogId ?? "null")}`;
  export const random = (): IErpHrmTimeTrackingTimelog =>
    typia.random<IErpHrmTimeTrackingTimelog>();
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
      assert.param("timelogId")(() => typia.assert(props.timelogId));
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
 * Update an existing timelog entry by its identifier.
 *
 * This operation modifies the contents of a single record in `erp_hrm_time_tracking_timelogs` for the currently selected organization context. The timelog record stores the attribution to `erp_hrm_time_tracking_projects` (required), an optional `erp_hrm_time_tracking_tasks` reference, the work attribution date (`work_date`), optional start/end timestamps (`start_time`, `end_time`), the total duration (`duration_minutes`), and an optional free-form note (`note`).
 *
 * Because all timelog operations must be scoped to the currently selected organization, the implementation must only allow updates for timelogs whose `erp_hrm_time_tracking_organization_id` matches the selected organization. If the timelog does not exist within the selected organization context, the request must be rejected.
 *
 * This operation must also respect timesheet workflow durability constraints. When a timelog is included in a submitted or approved timesheet (i.e., the timelog is linked to a timesheet record whose workflow status is at least submitted/approved per the `erp_hrm_time_tracking_timesheets.status` lifecycle), edits must be denied as applicable. This prevents changes to historical timekeeping once it has entered a review/approval phase.
 *
 * Security/authorization behavior: the system must enforce self-only ownership checks when the acting user lacks broader time:manage capability. If the acting employee does not own the targeted timelog (timelog’s `erp_hrm_time_tracking_employee_id`) and the user is not authorized to manage other employees’ timelogs, the request must be rejected.
 *
 * Related data and workflow impact: if the update changes fields that affect the timesheet association (for example, `work_date` changing the week boundaries), the service layer must determine whether the existing timesheet association remains valid and whether any updates would violate the immutability rule for submitted/approved timesheets.
 *
 * Expected error handling includes: (1) 404-like rejection when the timelog is not found within the selected organization, (2) permission errors for ownership/capability violations, and (3) denial errors when the timelog belongs to a submitted or approved timesheet.
 *
 * @param props.connection
 * @param props.timelogId Identifier of the timelog to update within the currently selected organization context.
 * @param props.body Updated values for the timelog record. The service must validate that the timelog remains editable under the timesheet workflow rules and that the update does not violate organization scoping and ownership constraints.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement PUT timelog update as follows.
 *
 * 1) Parse path parameter `timelogId` (UUID) and load the target `erp_hrm_time_tracking_timelogs` row by `id` while also filtering by `erp_hrm_time_tracking_organization_id = selectedOrganizationId`.
 *    - If no row matches, return a domain error indicating the timelog cannot be accessed in the current organization.
 *
 * 2) Authorization and ownership checks:
 *    - If the acting user does not have time:manage capability for other employees, ensure `erp_hrm_time_tracking_employee_id` of the timelog equals the acting employee’s member/employee id within the selected organization.
 *    - Reject otherwise.
 *
 * 3) Timesheet workflow durability check:
 *    - Determine whether the timelog is currently linked to a timesheet via `erp_hrm_time_tracking_timesheet_id`.
 *    - If linked, load the corresponding `erp_hrm_time_tracking_timesheets` row and inspect `status`.
 *    - If `status` indicates submitted or approved, deny the edit.
 *
 * 4) Apply updates inside a transaction:
 *    - Update allowed fields based on the request body (e.g., `work_date`, `start_time`, `end_time`, `duration_minutes`, `note`, and optional task association `erp_hrm_time_tracking_task_id`).
 *    - Keep `erp_hrm_time_tracking_organization_id`, `erp_hrm_time_tracking_employee_id`, and `erp_hrm_time_tracking_project_id` consistent with the existing record unless the request body explicitly supports their change; if any change would require re-scoping to a different project/task, validate project/task references exist and remain coherent.
 *
 * 5) Timesheet association consistency:
 *    - If `work_date` affects week grouping, recompute the intended timesheet (week_start_at/week_end_at) for the employee and update the `erp_hrm_time_tracking_timesheet_id` linkage only if it does not violate the submitted/approved immutability rule.
 *    - If the timelog is already part of a submitted/approved timesheet, step (3) already denies edits; therefore, updates should not proceed.
 *
 * 6) Persist and return:
 *    - Save the updated `erp_hrm_time_tracking_timelogs` row and return the full timelog representation.
 *
 * 7) Edge cases:
 *    - If the request would create an invalid time window (e.g., end before start when both are provided) or an inconsistent duration, validate and reject.
 *    - Ensure soft-deleted records (non-null `deleted_at`) are treated according to service conventions; for an update request, reject if the record is not active.
 *
 * 8) Activity logging (if supported by the service layer for timelog updates): record an `erp_hrm_time_tracking_activity_log_entries` event with performer attribution and target `timelogId` to aid auditability.
 * @path /erpHrmTimeTracking/member/timelogs/:timelogId
 * @accessor api.functional.erpHrmTimeTracking.member.timelogs.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<void> {
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
     * Identifier of the timelog to update within the currently selected organization context.
     */
    timelogId: string & tags.Format<"uuid">;

    /**
     * Updated values for the timelog record. The service must validate that the timelog remains editable under the timesheet workflow rules and that the update does not violate organization scoping and ownership constraints.
     */
    body: IErpHrmTimeTrackingTimelog.IUpdate;
  };
  export type Body = IErpHrmTimeTrackingTimelog.IUpdate;

  export const METADATA = {
    method: "PUT",
    path: "/erpHrmTimeTracking/member/timelogs/:timelogId",
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
    `/erpHrmTimeTracking/member/timelogs/${encodeURIComponent(props.timelogId ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("timelogId")(() => typia.assert(props.timelogId));
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
 * Permanently removes a single timelog identified by `timelogId`.
 *
 * This endpoint targets the `erp_hrm_time_tracking_timelogs` table, whose primary key is `id`. Timelogs are explicitly scoped to the currently selected organization via `erp_hrm_time_tracking_organization_id`, and the system must prevent any deletion that would operate on a timelog outside that selected organization context.
 *
 * Deletion is workflow-sensitive: a timelog can only be removed by its employee owner when the timelog is not included in any submitted or approved `erp_hrm_time_tracking_timesheets` record. The workflow status is driven by the `erp_hrm_time_tracking_timesheets.status` column, and the system must block deletion when the associated timesheet workflow indicates submitted or approved. If deletion is blocked due to workflow rules, the request must be rejected and the timelog must remain present.
 *
 * Role-based administration is supported through the `time:manage` capability. When a user has `time:manage`, the system may delete timelogs for other employees, but it must still reject requests that target timelogs outside the user’s selected organization context.
 *
 * Authorization and validation expectations:
 * - If the timelog does not exist within the selected organization context, the system must reject the request.
 * - If the caller lacks `time:manage` and the timelog belongs to another employee, the system must reject the request.
 * - If the timelog belongs to the caller (or deletion is administered with `time:manage`), deletion must still be rejected when the timelog is included in a submitted/approved timesheet.
 *
 * Related operations:
 * - Timelog list views (pagination/filtering) help users locate timelogs to delete before attempting removal.
 * - Timesheet and timesheet versioning flows determine when timelogs become approval-locked and therefore deletion must be denied.
 *
 * @param props.connection
 * @param props.timelogId Target timelog ID to permanently remove. This must be a UUID matching `erp_hrm_time_tracking_timelogs.id`.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1) Parse `timelogId` from path.
 *
 * 2) Load the timelog row from `erp_hrm_time_tracking_timelogs` by `id = timelogId`.
 *    - If not found, immediately reject (timelog not available in selected organization context).
 *
 * 3) Enforce organization scope:
 *    - Compare loaded `erp_hrm_time_tracking_organization_id` with the currently selected organization context in the session.
 *    - If they differ, reject.
 *
 * 4) Determine caller authorization:
 *    - If caller has capability `time:manage`, allow cross-employee deletion.
 *    - Otherwise, enforce ownership: caller’s employee identity (from member/employee context) must match `erp_hrm_time_tracking_employee_id` on the timelog.
 *    - If ownership fails, reject.
 *
 * 5) Enforce workflow deletion eligibility:
 *    - Use `erp_hrm_time_tracking_timesheet_id` on the timelog.
 *    - If it is null: timelog is not part of any timesheet workflow; deletion is allowed (subject to steps 3-4).
 *    - If non-null: load the associated `erp_hrm_time_tracking_timesheets` row and check `status`.
 *      - If status indicates submitted or approved (workflow-sensitive states), reject deletion.
 *      - Otherwise (e.g., draft/rejected per domain interpretation), allow deletion.
 *
 * 6) Delete operation:
 *    - Apply the deletion per the schema’s soft-delete capability for timelogs via `deleted_at` (or the corresponding delete strategy implemented by the persistence layer). Ensure the system returns success only after the persistence confirms the change.
 *
 * 7) Audit/log integration:
 *    - Create an `erp_hrm_time_tracking_activity_log_entries` record (if implemented in the service layer) capturing the deletion action, performedBy identity, organization id, and target timelog id.
 *
 * 8) Error handling:
 *    - Convert authorization failures and workflow blocks into consistent API error responses.
 *    - Do not leak whether a timelog exists outside the selected organization context; treat mismatches as not found/forbidden as per existing error scenario conventions.
 * @path /erpHrmTimeTracking/member/timelogs/:timelogId
 * @accessor api.functional.erpHrmTimeTracking.member.timelogs.erase
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
     * Target timelog ID to permanently remove. This must be a UUID matching `erp_hrm_time_tracking_timelogs.id`.
     */
    timelogId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/erpHrmTimeTracking/member/timelogs/:timelogId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/erpHrmTimeTracking/member/timelogs/${encodeURIComponent(props.timelogId ?? "null")}`;
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
      assert.param("timelogId")(() => typia.assert(props.timelogId));
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
