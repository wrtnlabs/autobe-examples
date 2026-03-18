import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingTimer } from "../../../../api/structures/IHrmTimeTrackingTimer";
import { IPageIHrmTimeTrackingTimer } from "../../../../api/structures/IPageIHrmTimeTrackingTimer";
import { EmployeeAuth } from "../../../../decorators/EmployeeAuth";
import { EmployeePayload } from "../../../../decorators/payload/EmployeePayload";
import { deleteHrmTimeTrackingEmployeeTimersTimerId } from "../../../../providers/deleteHrmTimeTrackingEmployeeTimersTimerId";
import { getHrmTimeTrackingEmployeeTimersTimerId } from "../../../../providers/getHrmTimeTrackingEmployeeTimersTimerId";
import { patchHrmTimeTrackingEmployeeTimers } from "../../../../providers/patchHrmTimeTrackingEmployeeTimers";
import { postHrmTimeTrackingEmployeeTimers } from "../../../../providers/postHrmTimeTrackingEmployeeTimers";
import { putHrmTimeTrackingEmployeeTimersTimerId } from "../../../../providers/putHrmTimeTrackingEmployeeTimersTimerId";

@Controller("/hrmTimeTracking/employee/timers")
export class HrmtimetrackingEmployeeTimersController {
  /**
   * Start a new live timer for the authenticated employee in the currently selected organization.
   *
   * This operation creates a running timer record in the live timer store represented by `hrm_time_tracking_timers`, which is described as the operational state for employees before work is converted into finalized timelog entries. The created timer captures the current work session context using the selected project, an optional task, and an optional mutable work note. In business terms, this endpoint begins the employee's real-time time tracking session rather than creating completed historical work. The timer concept is distinct from `hrm_time_tracking_timelogs`, which store finalized time entries with a worked-on date and a whole-minute duration after the timer is later stopped.
   *
   * Access to this operation must be evaluated in the currently selected organization only. The platform requirements state that role-based access is organization-scoped, so permissions from another organization must not grant access here. The timer belongs to one employee and reflects only that employee's current live work session in one organization context. Because of that ownership model, the authenticated employee is the intended caller for starting a timer for themself, and the service must derive the employee and organization linkage from the authenticated session context instead of trusting client-supplied cross-tenant identifiers.
   *
   * The created resource is backed by `hrm_time_tracking_timers.hrm_time_tracking_organization_id`, `hrm_time_tracking_timers.hrm_time_tracking_employee_id`, `hrm_time_tracking_timers.hrm_time_tracking_project_id`, optional `hrm_time_tracking_timers.hrm_time_tracking_task_id`, `hrm_time_tracking_timers.started_at`, and optional `hrm_time_tracking_timers.description`. The selected project is mandatory because the timer domain model states that the project association is a core part of the timer from the outset. The selected task is optional, but when provided it must be a task within the same selected project because tasks belong to a single project through `hrm_time_tracking_tasks.hrm_time_tracking_project_id`. The running description corresponds to the timer's mutable work note and gives business meaning to the active session by describing what the employee is currently doing.
   *
   * A successful timer start should be used together with the platform's real-time timer event behavior. After this operation creates the timer, the service should publish the timer started event so the employee's timer view can show the timer as running immediately, the personal dashboard can display the active timer status widget, and any authorized organization summary view can reflect that the employee now has an active timer. If the employee later edits the running timer, those updates belong to a separate timer update operation and should publish timer updated events. If the employee later stops the timer, the platform must create a timelog from elapsed time rounded to the nearest minute. If the employee later discards the timer, the platform must end the running state without creating any timelog.
   *
   * Error handling must enforce the single-active-timer rule and data integrity of the selected work context. Since `hrm_time_tracking_timers` has a unique constraint on `hrm_time_tracking_employee_id`, the service must reject attempts to create another running timer for an employee who already has one. The service must also reject requests that reference a project outside the active organization, a task that does not belong to the chosen project, or any resource that is not available for the current organization context. When creation fails, the system must not leave the user in an indeterminate state or imply that a timer was started when the business outcome is not confirmed.
   *
   * @param connection
   * @param body Information required to start a running timer
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor employee
   * @x-autobe-specification Authenticate the caller and resolve the active organization context from the session. Resolve the employee identity associated with the authenticated principal for that organization context and deny the request if the caller is not permitted to start a personal timer in the current organization.
   *
   * Validate the request body against the creation DTO. Require a project identifier. Accept an optional task identifier and optional description. Do not accept employee or organization ownership fields from the client; derive `hrm_time_tracking_organization_id` and `hrm_time_tracking_employee_id` internally.
   *
   * Load the target project from `hrm_time_tracking_projects` by its identifier and confirm that it belongs to the active organization. Reject the request when the project does not exist, is not visible in the current organization, or is logically removed. If a task identifier is provided, load the task from `hrm_time_tracking_tasks`, confirm that it belongs to the selected project through `hrm_time_tracking_tasks.hrm_time_tracking_project_id`, and reject the request if the task does not exist, is removed, or belongs to another project.
   *
   * Before insert, check for an existing active timer row for the employee using the unique ownership rule on `hrm_time_tracking_timers.hrm_time_tracking_employee_id`. If a timer already exists for that employee, reject the request as a business conflict rather than replacing the existing timer.
   *
   * Create a new `hrm_time_tracking_timers` row with a generated UUID, the derived organization id, the derived employee id, the validated project id, the optional validated task id, the current server timestamp as `started_at`, the optional description, and standard creation/update timestamps. Perform the create inside a transaction scope that guarantees no duplicate active timer can be produced for the same employee under concurrent requests.
   *
   * Return the created timer resource as `IHrmTimeTrackingTimer`. After the transaction commits, publish the timer started event containing the running timer state, selected project, owning employee, and optional task so subscribed timer views, dashboard active timer widgets, and authorized organization summary views can refresh immediately. On failure, return a clear error outcome and do not publish any started event. Do not create a timelog in this operation; timelog creation belongs only to the stop-timer flow, where elapsed time is later converted and rounded to the nearest minute.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedBody()
    body: IHrmTimeTrackingTimer.ICreate,
  ): Promise<IHrmTimeTrackingTimer> {
    try {
      return await postHrmTimeTrackingEmployeeTimers({
        employee,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of running timers in the current organization context.
   *
   * This operation returns live timer records backed by the hrm_time_tracking_timers table, which is defined as the operational store for employees' current active timers before they are converted into finalized timelog entries. Each returned item represents a timer owned by one employee, linked to one organization, one selected project, and optionally one task, with mutable working notes in the description field and timing anchored by the started_at timestamp. The endpoint is intended for timer list screens, organization-level active work monitoring, and dashboard-adjacent views that need current running timer information rather than historical timelog data.
   *
   * Access to the returned data must be evaluated in the currently selected organization only. The platform requirements specify organization-scoped role selection and access evaluation, so permissions from another organization must not grant access here, and results must never include timers outside the active organization context. The service layer should additionally restrict visibility according to caller authority. In personal dashboard usage, the employee should effectively see only their own running timer status. In broader team or management views, owner and manager access depends on permissions granted in the current organization.
   *
   * This operation is tightly related to the timer business rules. The timer model enforces one timer per employee through a unique constraint on hrm_time_tracking_employee_id, which aligns with the requirement that each employee can have at most one active timer at a time. When a running timer is edited, the platform publishes timer updated events and refreshes active timer widgets live. When a timer is stopped, it is converted into a timelog with duration calculated from started_at to stop time and rounded to the nearest minute. When a timer is discarded, the active timer state is removed without creating a timelog. Because this endpoint is for viewing live timer state, it should present only timers that are still active and not discarded.
   *
   * The underlying schema includes deleted_at as the soft deletion timestamp for discarded or otherwise removed timer records. Therefore, normal retrieval through this endpoint should exclude rows whose deleted_at is not null unless a future administrative requirement explicitly introduces a separate retrieval mode. Search and sorting should be based only on real schema fields such as started_at, description, employee reference, project reference, task reference, created_at, and updated_at. If description search is supported, it should use the database capabilities associated with the indexed description field. Error handling should deny access when the caller lacks organization-scoped permission, and should return an empty paginated result rather than cross-organization data when no active timers match the filters.
   *
   * This endpoint is commonly used together with timer detail and timer mutation operations. For a personal dashboard, the client may call this collection endpoint with a filter for the current employee to obtain active timer status in a generalized list format, or a dedicated single-timer endpoint may be used elsewhere for direct ownership lookup. Timer stop and discard operations should be called separately when the user intends to end the running timer, because those operations have side effects on timer lifecycle and may create timelog records or clear active state.
   *
   * @param connection
   * @param body Timer search filters, pagination, and sorting options
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor employee
   * @x-autobe-specification Implement this operation as a paginated search over hrm_time_tracking_timers limited to the authenticated user's currently selected organization context.
   *
   * Build the base query from hrm_time_tracking_timers where hrm_time_tracking_organization_id equals the current organization identifier from auth/context, and deleted_at is null so that only active live timers are returned. Never infer organization scope from another tenant membership. Reject the operation when the caller lacks permission to view timer data in the current organization.
   *
   * Apply request-body driven filters only against actual schema fields. Supported filters should include hrmTimeTrackingEmployeeId, hrmTimeTrackingProjectId, hrmTimeTrackingTaskId, whether a task is assigned or absent, startedAt range, createdAt range, updatedAt range, and partial description search. For description search, use case-insensitive matching compatible with the text-search indexing strategy available for the description column. Do not invent filters for fields that do not exist in the timer schema.
   *
   * Apply sorting using a safe allowlist of actual columns such as started_at, updated_at, created_at, and description. Apply pagination after filters and sorting. Return summary DTO rows mapped from the timer table and, if the summary contract requires display information for related employee, project, or task, load them through joins constrained to the same organization and relationship integrity. Ensure optional task handling is preserved when hrm_time_tracking_task_id is null.
   *
   * For employee callers without broader team-view authority, further constrain the query to hrm_time_tracking_employee_id equal to the employee identity mapped to the authenticated account in the current organization, so personal dashboard usage returns only the caller's own active timer. For owners or managers with authorized visibility, allow organization-wide results subject to request filters.
   *
   * Edge cases: if no timers match, return an empty page structure; if the caller's current organization context is invalid or missing, reject the request; if related entities referenced by a timer are no longer accessible due to data integrity issues, fail safely rather than exposing partial cross-tenant data. This operation is read-only and must not create timelogs, modify timers, publish events, or change timer state.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedBody()
    body: IHrmTimeTrackingTimer.IRequest,
  ): Promise<IPageIHrmTimeTrackingTimer.ISummary> {
    try {
      return await patchHrmTimeTrackingEmployeeTimers({
        employee,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve one live timer record by identifier.
   *
   * This operation returns the current state of a live time tracking session stored in the hrm_time_tracking_timers table. A timer represents work in progress before it becomes a finalized timelog, and the returned resource reflects the core timer attributes described by the business requirements: the start timestamp, the selected project, the optional task within that project, and the running work description. The timer record is organization-scoped and employee-owned, so the returned data must always be interpreted in the currently selected organization context.
   *
   * From the underlying schema, the operation reads the timer primary key `id`, the owning organization reference `hrm_time_tracking_organization_id`, the owning employee reference `hrm_time_tracking_employee_id`, the selected project reference `hrm_time_tracking_project_id`, the optional selected task reference `hrm_time_tracking_task_id`, the live session start time `started_at`, the mutable work note `description`, and the audit timestamps `created_at` and `updated_at`. Because the schema also defines `deleted_at`, implementations must avoid returning discarded or otherwise removed timer records as active timers. This keeps the API consistent with the business rule that a discarded timer ends the employee's active timer state and does not produce a timelog.
   *
   * Security and visibility must follow organization-scoped access evaluation. The system must verify that the caller is acting within the current organization and must not allow roles from another organization to grant access. Employees should only be able to view their own running timer for the selected organization. Owners and managers may retrieve a timer only when they are authorized in that same organization context according to organization-specific permissions. The operation must never expose timer data from another organization, even for users who belong to multiple organizations.
   *
   * This endpoint is commonly used together with timer lifecycle operations. A client may retrieve the current timer before showing the active timer status widget on the personal dashboard, before allowing the employee to edit the running timer context, or before presenting stop and discard actions. After a separate stop operation, the timer is no longer active and the resulting work is available through normal timelog access. After a separate discard operation, the timer should no longer be retrievable as an active live session. If no accessible timer exists for the given identifier in the current organization context, the operation must fail with a not-found style error rather than revealing whether the identifier belongs to another organization or another employee.
   *
   * @param connection
   * @param timerId Target timer's ID
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor employee
   * @x-autobe-specification Load a single timer row from hrm_time_tracking_timers by primary key `id` using the `timerId` path parameter.
   *
   * Before returning data, enforce authentication and current-organization context. Join or otherwise validate the referenced employee membership so the service can confirm the timer belongs to the selected organization through `hrm_time_tracking_organization_id`. Reject the request if the caller does not have access in the current organization context. For employee callers, additionally require that `hrm_time_tracking_employee_id` matches the caller's employee record in the selected organization unless broader timer-view permission exists for managers or owners.
   *
   * Exclude discarded or removed timers from successful retrieval by treating rows with non-null `deleted_at` as unavailable. Return a not-found error when the timer does not exist, belongs to another organization, is not visible to the caller, or has already been discarded, so that the API does not leak cross-organization information.
   *
   * Hydrate the response DTO as IHrmTimeTrackingTimer from the timer row and include related project and optional task information according to the DTO definition if downstream schema generation expects expanded relations. Ensure the optional task remains null when `hrm_time_tracking_task_id` is null. Preserve `started_at` exactly as the live session start time and expose `description` as the mutable running work note.
   *
   * Do not calculate elapsed duration and do not create or modify a timelog in this operation. Duration calculation, nearest-minute rounding, timer termination, and timelog creation belong exclusively to the stop operation. Likewise, removing the live timer without timelog creation belongs exclusively to the discard operation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":timerId")
  public async at(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedParam("timerId")
    timerId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingTimer> {
    try {
      return await getHrmTimeTrackingEmployeeTimersTimerId({
        employee,
        timerId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an employee-owned running timer to reflect the current live work context.
   *
   * This operation modifies the mutable state of a live timer record in the HRM time-tracking service. The underlying `hrm_time_tracking_timers` table is described as storing live running timers for employees before they are converted into finalized timelog entries. Each timer belongs to one organization context, one employee, one selected project, and optionally one selected task, and it stores mutable working notes while it is running. In practical use, this endpoint allows the employee to keep the active timer aligned with the work actually being performed by changing the project, changing the optional task, and updating the description while the timer remains active.
   *
   * This operation is intended for the employee who owns the running timer in the currently selected organization. The platform evaluates access in the active organization context only, so the timer must belong to that organization and to the authenticated employee making the request. A timer from another organization or a timer owned by another employee must not be editable through this operation. Because the timer is part of the employee's current live tracking activity, successful updates should also be reflected in features that show active timer state, including the personal dashboard widget that displays the current project, optional task, start time, and description.
   *
   * The operation works directly against the live timer entity rather than against historical time records. The timer schema explicitly stores `started_at`, `description`, organization linkage, employee linkage, selected project linkage, and optional task linkage, while avoiding calculated duration and denormalized copies of related data. Consistent with the requirements, if a task is supplied during update, that task must belong to the currently selected project. If the employee changes the project and keeps or sends a task, the task-project relationship must be revalidated before persisting the change. The operation updates `updated_at` to reflect the modification time and leaves `started_at` unchanged so the timer continues from its original start moment.
   *
   * This endpoint does not stop the timer, discard the timer, or create a timelog. Those behaviors are separate business outcomes. Stopping a timer creates a timelog using the elapsed time rounded to the nearest minute, while discarding a timer ends the active timer state without creating any timelog. Clients that need the current running timer before editing may use the active-timer retrieval operation, and clients that need to finish the live tracking session must call the dedicated stop or discard operation instead of this update endpoint.
   *
   * If the specified timer does not exist, does not belong to the authenticated employee in the selected organization, has already been discarded or otherwise removed, or represents no current active timer state, the request must be rejected. The request must also be rejected when it references a project outside the active organization or a task that does not belong to the chosen project. These validations preserve the timer as an organization-scoped, employee-owned live work record and keep downstream conversion to timelog data reliable.
   *
   * @param connection
   * @param timerId Target running timer's ID
   * @param body Updated live timer project, task, and description
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor employee
   * @x-autobe-specification Implement this operation as an authenticated employee-owned timer update against `hrm_time_tracking_timers`.
   *
   * 1. Resolve the authenticated user as an employee in the currently selected organization context. Reject the request if there is no active organization-scoped employee identity for the caller.
   * 2. Load the timer by `id = {timerId}` from `hrm_time_tracking_timers` and ensure it belongs to both the current organization and the authenticated employee. Treat records with `deleted_at` set as unavailable for update. If no eligible record is found, return a not-found or forbidden-style failure according to platform conventions.
   * 3. Validate that the timer is still the employee's active live timer. Because `@@unique([hrm_time_tracking_employee_id])` allows only one timer row per employee, this record should represent the employee's current running timer unless it has already been removed.
   * 4. From the request body, allow updates only to mutable running-timer fields: `hrm_time_tracking_project_id` via DTO project field, `hrm_time_tracking_task_id` via DTO task field, and `description`. Do not alter `started_at`, organization ownership, employee ownership, or any derived duration data.
   * 5. If the request changes the project, verify that the target project exists in the current organization. If the request provides a task, verify that the task exists and belongs to the selected project after applying any project change. If the task is omitted or explicitly cleared by the DTO design, persist a null task reference.
   * 6. Persist the changes in a single update statement or transaction and set `updated_at` to the current timestamp. Do not create a timelog and do not modify any timesheet data.
   * 7. Return the refreshed timer resource including its current project, optional task, description, and original `started_at` so the client can immediately re-render the active timer widget.
   *
   * Validation and error handling:
   * - Reject when no active timer exists for the specified `timerId` in the employee's current organization scope.
   * - Reject when the caller attempts to edit another employee's timer.
   * - Reject when the referenced project is outside the current organization.
   * - Reject when the referenced task does not belong to the selected project.
   * - Reject attempts to use this endpoint for stop or discard semantics; those workflows belong to dedicated operations.
   *
   * Side effects:
   * - The updated timer state should be visible to any personal dashboard or active timer status feature that reads the employee's current running timer.
   * - No duration recalculation, timelog creation, or timer termination occurs in this operation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":timerId")
  public async update(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedParam("timerId")
    timerId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingTimer.IUpdate,
  ): Promise<IHrmTimeTrackingTimer> {
    try {
      return await putHrmTimeTrackingEmployeeTimersTimerId({
        employee,
        timerId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently remove a live running timer from the current organization context.
   *
   * This operation deletes one record from the live timer store represented by the hrm_time_tracking_timers table. That table is described as the operational record for an employee's current active timer before it is converted into a finalized timelog entry. The deleted resource is identified by the timerId path parameter and contains the selected organization, employee, project, optional task, started time, and optional in-progress work note. Deleting this resource means the current running timer is discarded and is no longer available for continued tracking or later conversion through timer-based workflows.
   *
   * Access to this operation must be evaluated within the currently selected organization context. The service must ensure that the requested timer belongs to the active organization and that the caller is permitted to remove it there. Because organization-scoped access is evaluated separately per organization, permission from another organization must not grant deletion rights here. In the common case, an employee may remove that employee's own active timer, while privileged actors such as owners or managers may be allowed when their organization-scoped permissions include relevant time-management authority.
   *
   * The underlying timer entity is tightly related to hrm_time_tracking_employees, hrm_time_tracking_projects, and optionally hrm_time_tracking_tasks. The timer stores only live operational state, including started_at and description, and intentionally excludes calculated duration and denormalized project or employee details. As a result, this endpoint removes only the active timer record itself and does not alter the referenced employee, project, or task entities. It also does not create or modify a timelog; clients that need to preserve tracked work should use the timer-stop or timer-to-timelog workflow before calling this deletion endpoint.
   *
   * Validation must confirm that the timer exists, has not already been removed, and belongs to the current organization. If ownership-based restrictions apply, the service must also verify that the caller owns the timer or has broader authority to manage timers in the current organization. When the timer cannot be found, belongs to a different organization context, or the caller lacks required permission, the operation must fail without partially changing related data. Successful execution should leave the employee with no active timer because the timer table enforces a single active timer per employee through a unique constraint on hrm_time_tracking_employee_id.
   *
   * This endpoint is commonly used together with timer retrieval or timer creation operations. A client would typically read the current active timer first to display the live tracking state, then either stop it to produce a timelog or erase it to discard the in-progress timer entirely. After successful deletion, subsequent timer lookup operations for the same employee should indicate that no active timer remains.
   *
   * @param connection
   * @param timerId Target timer identifier.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor employee
   * @x-autobe-specification Implement a delete-timer service that targets hrm_time_tracking_timers by primary key id and current organization context.
   *
   * 1. Resolve the caller's active organization context from authentication/session state.
   * 2. Load the timer by id from hrm_time_tracking_timers and include enough fields to validate ownership and referential context: id, hrm_time_tracking_organization_id, hrm_time_tracking_employee_id, hrm_time_tracking_project_id, hrm_time_tracking_task_id, started_at, deleted_at.
   * 3. Reject the request if no timer exists for the supplied id, if the timer belongs to a different organization than the active context, or if the record is already deleted.
   * 4. Authorize the operation. At minimum, allow the timer owner to delete the timer. If the platform authorization model grants broader timer administration to owners or managers, check those organization-scoped permissions in the current organization only.
   * 5. Delete the timer record. Because the business requirement for deletion is permanent removal of the live timer resource, perform a hard delete of the row rather than merely returning it as active state. Do not create a timelog as part of this operation.
   * 6. Return success with no response body.
   *
   * Additional business checks:
   * - Do not infer or mutate duration values; hrm_time_tracking_timers stores live state only.
   * - Do not modify related project, task, or employee records.
   * - If the referenced task or project has become unavailable since timer creation, deletion should still be allowed as long as the timer itself is valid and the caller is authorized.
   * - Wrap lookup, authorization validation, and deletion in a transaction if the surrounding service architecture requires consistency guarantees for concurrent timer operations.
   *
   * Error handling:
   * - 404-style failure when the timer is not found in the active organization.
   * - 403-style failure when the caller lacks permission to remove the target timer.
   * - 409-style failure may be used if concurrent modification causes the timer to disappear between validation and delete.
   * - Never silently succeed on a cross-organization timer id; treat it as inaccessible in the current context.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":timerId")
  public async erase(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedParam("timerId")
    timerId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmTimeTrackingEmployeeTimersTimerId({
        employee,
        timerId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
