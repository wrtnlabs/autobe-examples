import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingTimelog } from "../../../../api/structures/IHrmTimeTrackingTimelog";
import { IPageIHrmTimeTrackingTimelog } from "../../../../api/structures/IPageIHrmTimeTrackingTimelog";
import { EmployeeAuth } from "../../../../decorators/EmployeeAuth";
import { EmployeePayload } from "../../../../decorators/payload/EmployeePayload";
import { deleteHrmTimeTrackingEmployeeTimelogsTimelogId } from "../../../../providers/deleteHrmTimeTrackingEmployeeTimelogsTimelogId";
import { getHrmTimeTrackingEmployeeTimelogsTimelogId } from "../../../../providers/getHrmTimeTrackingEmployeeTimelogsTimelogId";
import { patchHrmTimeTrackingEmployeeTimelogs } from "../../../../providers/patchHrmTimeTrackingEmployeeTimelogs";
import { postHrmTimeTrackingEmployeeTimelogs } from "../../../../providers/postHrmTimeTrackingEmployeeTimelogs";
import { putHrmTimeTrackingEmployeeTimelogsTimelogId } from "../../../../providers/putHrmTimeTrackingEmployeeTimelogsTimelogId";

@Controller("/hrmTimeTracking/employee/timelogs")
export class HrmtimetrackingEmployeeTimelogsController {
  /**
   * Create a new historical time entry for work performed by an employee in the currently selected organization.
   *
   * This operation creates a record in the timelog store represented by the hrm_time_tracking_timelogs table, which preserves raw work history for a specific calendar date together with the employee who logged the work, the organization context, the related project, and an optional related task. The created record captures the employee-entered work date through worked_on, the duration in whole minutes through duration_minutes, an optional descriptive note through description, and whether the work is billable through billable. Because timelogs are the transactional source for weekly timesheets, reporting, and dashboard summaries, this endpoint is the primary way to register new worked time before later submission and review workflows occur.
   *
   * Access to this operation is organization-scoped. An employee may create their own timelog in the current organization, and a manager or owner may create a timelog only when their role in that same organization grants the required permission. Role assignments from any other organization must not affect authorization for this request. The operation must reject attempts to create a timelog for an organization, employee, project, or task outside the current organization context.
   *
   * The created timelog is closely related to projects, tasks, draft timesheet composition, and later approval workflows. After creation, the timelog may appear in paginated timelog listings and personal dashboard summaries, and it may be attached to a draft weekly timesheet through separate timesheet composition operations. If the timelog is later included in an approved timesheet, that approval workflow locks the timelog from further modification or removal. For that reason, this creation endpoint only writes the raw timelog record itself and does not assign review metadata or timesheet state.
   *
   * Validation must ensure that the referenced project exists in the current organization, that an optional task belongs to the specified project, and that the acting user is allowed to create the entry for the target employee according to current-organization permissions. The service should also reject logically deleted related records and invalid durations such as non-positive work amounts. On success, the response returns the newly created detailed timelog resource so the client can immediately render the entry or use it in subsequent draft-timesheet composition flows.
   *
   * @param connection
   * @param body Information required to create a timelog entry
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor employee
   * @x-autobe-specification Implement a create-timelog service that inserts a new hrm_time_tracking_timelogs row within the currently selected organization context.
   *
   * 1. Resolve the authenticated actor, current organization context, and whether the actor is creating a timelog for self or for another employee. Enforce organization-scoped authorization only. Employees may create their own timelogs. Managers and owners may create timelogs for other employees only when their current-organization permission set allows employee timelog management.
   *
   * 2. Validate the request body mapped from IHrmTimeTrackingTimelog.ICreate. Confirm the target employee exists, is not logically deleted, and belongs to the current organization context required by the application authorization model. Confirm the referenced project exists, is not logically deleted, and belongs to the same organization. If hrmTimeTrackingTaskId is provided in the DTO, load hrm_time_tracking_tasks and verify the task exists, is not logically deleted, belongs to the specified project, and is valid for time logging.
   *
   * 3. Validate business values before insert. worked_on must be a valid date within acceptable application limits. duration_minutes must be a positive integer. description may be null or empty only according to DTO validation rules. billable is stored directly on the timelog. Do not infer or write any review fields because review metadata belongs to timesheet approval workflows, not the timelog row.
   *
   * 4. Before insert, check whether the requested timelog would violate approved-timesheet immutability rules indirectly. Creation itself is allowed as a standalone timelog, but if the system enforces one timesheet per employee per week, the service should prevent automatic inclusion into any already approved timesheet and should not create any hrm_time_tracking_timesheet_timelogs row here. Timesheet composition remains a separate workflow.
   *
   * 5. Insert the hrm_time_tracking_timelogs record with generated id, current organization id, target employee id, project id, optional task id, worked_on, duration_minutes, description, billable, created_at, and updated_at. deleted_at must be null on creation.
   *
   * 6. Re-query or assemble the created resource for response, including related project, optional task, and employee information required by IHrmTimeTrackingTimelog. Ensure the response reflects persisted values exactly.
   *
   * 7. Trigger downstream refresh signals or domain events used by dashboard widgets and recent-timelog summaries so that personal time totals and recent timelog displays can reflect the newly created entry.
   *
   * 8. Error handling: return not found when employee, project, or task is missing in the current organization; return forbidden when current-organization authorization is insufficient; return validation errors for invalid date, non-positive duration, or mismatched task-project relationship; return conflict only if a higher-level business rule detects a duplicate or otherwise disallowed time entry according to DTO or service policy.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedBody()
    body: IHrmTimeTrackingTimelog.ICreate,
  ): Promise<IHrmTimeTrackingTimelog> {
    try {
      return await postHrmTimeTrackingEmployeeTimelogs({
        employee,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of historical timelog entries in the current organization.
   *
   * This operation is the primary browsing endpoint for time-tracking history. It returns timelog records from the hrm_time_tracking_timelogs table, which stores the raw work history recorded by employees for a specific work date, duration in whole minutes, an optional description of performed work, the related project, and an optional related task. The endpoint is intended for list screens, reporting-oriented browsing, and review workflows where users need to search and navigate many timelog entries rather than fetch a single record.
   *
   * The operation follows the timelog viewing requirements by supporting pagination and structured filtering. Clients can submit search criteria for date range, project, task, billable status, and additional list controls such as paging and sorting through the request body. When the client changes the browsing criteria, the system should execute the search again and return a refreshed page of results that matches the selected filters. Because this endpoint is designed for complex list retrieval, PATCH is used instead of GET so the search criteria can be expressed as a typed JSON object.
   *
   * Access to returned data must remain bound to the currently selected organization context. Employees may use this operation to view their own timelogs in the current organization. Owners and managers may use it to review a broader set of employee timelogs only when their permissions in the current organization allow that access. A role from another organization must have no effect on visibility in this request, and the operation must not expose timelog data outside the active organization boundary.
   *
   * This operation must preserve the historical visibility of timelogs linked to inactive projects. The hrm_time_tracking_projects table defines project lifecycle states of active, archived, and completed, and the requirements state that existing timelogs must remain available after a project becomes archived or completed. As a result, list results may include timelogs whose related project is no longer active, allowing historical browsing and audit-style review of previously recorded work.
   *
   * The returned summaries should reflect the core timelog attributes most useful for browsing, including the work date, recorded duration, billable classification, employee linkage, project linkage, and optional task linkage. Clients that need a narrower or broader subset of timelog data should still begin with this endpoint to obtain a paginated result set and then use a dedicated detail endpoint if one exists. Error handling should deny access when the current actor lacks permission in the selected organization, reject invalid filter combinations, and avoid misleading success states if downstream dependencies used during enrichment or cross-service lookups time out.
   *
   * @param connection
   * @param body Search criteria, filters, sorting, and pagination options for timelog browsing
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor employee
   * @x-autobe-specification Implement this operation as an organization-scoped search over hrm_time_tracking_timelogs.
   *
   * Resolve the authenticated actor and current organization context first. Enforce organization isolation by constraining every query to hrm_time_tracking_timelogs.hrm_time_tracking_organization_id for the active organization. If the actor is an employee without permission to view all employee timelogs, additionally constrain the query to hrm_time_tracking_timelogs.hrm_time_tracking_employee_id equal to the actor's employee identity in the current organization. If the actor is an owner or manager with the relevant permission, allow broader organization-wide browsing.
   *
   * Accept a typed request body containing pagination, sorting, and filters. Support at minimum date range filtering against worked_on, project filtering against hrm_time_tracking_project_id, task filtering against hrm_time_tracking_task_id, and billable filtering against billable. If employee-based filtering is included in the request DTO, only honor it for actors permitted to view organization-wide timelogs. Normalize date boundaries so the requested Monday-to-Sunday or arbitrary date span is applied consistently against worked_on timestamps.
   *
   * Build the result set from hrm_time_tracking_timelogs and join related hrm_time_tracking_projects, hrm_time_tracking_tasks, and hrm_time_tracking_employees only as needed to populate summary fields or validate filters. Do not exclude records solely because the joined project status is archived or completed. Existing timelogs for inactive projects must remain queryable and visible as historical records. Exclude logically removed records by default by filtering timelog deleted_at IS NULL and, when joined entities are used for display only, tolerate inactive project lifecycle states while still respecting any deletion markers needed by the broader application conventions.
   *
   * Return a paginated response ordered by client-specified sort options when valid, with a deterministic fallback such as worked_on descending then created_at descending. Validate unsupported sort fields and malformed filter values as request errors. When task filtering is supplied, ensure the task relationship remains consistent with the selected project if both are provided. When project filtering is supplied, query by the UUID foreign key stored on the timelog rather than by derived text fields.
   *
   * The response payload should use IHrmTimeTrackingTimelog summary items suitable for list rendering, including identifiers and concise contextual fields. Compute pagination metadata from the filtered query and return it in IPageIHrmTimeTrackingTimelog.ISummary. The operation is read-only and should not mutate timelog, project, task, employee, or timesheet state.
   *
   * If external enrichment or dependent service calls are involved, fail clearly on timeout instead of implying a completed or authoritative result that cannot be confirmed. A timeout must not change the active organization context or leak data from another organization.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedBody()
    body: IHrmTimeTrackingTimelog.IRequest,
  ): Promise<IPageIHrmTimeTrackingTimelog.ISummary> {
    try {
      return await patchHrmTimeTrackingEmployeeTimelogs({
        employee,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information for a single timelog entry in the currently selected organization.
   *
   * This operation returns one historical time entry from the organization-scoped timelog record stored in `hrm_time_tracking_timelogs`. The returned resource represents work performed on a specific calendar date through the `worked_on` field, with duration captured in whole minutes through `duration_minutes`, optional work notes captured in `description`, and billing classification captured in `billable`. The timelog also preserves its organizational and work-context relationships through the linked organization, employee, project, and optional task references defined by `hrm_time_tracking_organization_id`, `hrm_time_tracking_employee_id`, `hrm_time_tracking_project_id`, and `hrm_time_tracking_task_id`.
   *
   * Access to this operation is organization-scoped and must be evaluated using the caller's role and permissions in the currently selected organization only. An employee may retrieve their own timelog records in that organization. A manager or owner may retrieve another employee's timelog only when the current organization grants permission to view employee timelogs. Permissions from another organization must not grant access here. If the timelog does not belong to the current organization, or the caller lacks access to the target employee's record, the request must be rejected.
   *
   * This operation is closely related to weekly timesheet workflows. A timelog can be attached to a timesheet through `hrm_time_tracking_timesheet_timelogs`, and approved timesheets lock included timelogs from editing and deletion. Although this endpoint does not change data, clients commonly use it together with timelog list browsing and timesheet review features to inspect the exact work record included in a weekly submission. When presenting the detail, implementations should expose enough linked information for the caller to understand the recorded work context, especially the associated project and optional task.
   *
   * The endpoint returns a single persisted timelog record rather than a derived dashboard aggregate. Historical continuity matters: timelog records are preserved as transactional work history used by reporting, dashboard summaries, and timesheet composition. If the record has been removed from active use through the `deleted_at` lifecycle timestamp, it should not be returned as a normal accessible resource unless the product's internal service policy explicitly supports administrative recovery views.
   *
   * @param connection
   * @param timelogId Unique identifier of the target timelog
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor employee
   * @x-autobe-specification Load one record from `hrm_time_tracking_timelogs` by `id = {timelogId}` and `deleted_at IS NULL`, scoped to the caller's currently selected organization via `hrm_time_tracking_organization_id`.
   *
   * Before returning the record, evaluate authorization in the current organization context only. If the caller is an employee actor, allow access only when the timelog's `hrm_time_tracking_employee_id` belongs to that caller's own employee identity in the selected organization. If the caller is an owner or manager, allow access when the current organization role grants timelog viewing permission; otherwise reject. Never use permissions from another organization context.
   *
   * Join or map related records needed for the detailed DTO from `hrm_time_tracking_projects` and optionally `hrm_time_tracking_tasks` so the response can present the project and task context of the time entry. Also inspect `hrm_time_tracking_timesheet_timelogs` and the linked `hrm_time_tracking_timesheets` record when present so the service can expose whether the timelog is currently included in a weekly timesheet and whether that timesheet status implies lock state for downstream edit/delete actions.
   *
   * Return not found when no active timelog exists for the given identifier in the current organization scope. Return forbidden when the record exists but the caller is not allowed to view it. Keep this operation read-only with no state changes, no transaction beyond a consistent read, and no recalculation of aggregates except any lightweight DTO enrichment needed to reflect related timesheet inclusion metadata.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":timelogId")
  public async at(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedParam("timelogId")
    timelogId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingTimelog> {
    try {
      return await getHrmTimeTrackingEmployeeTimelogsTimelogId({
        employee,
        timelogId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a single timelog entry for work already recorded in the current organization.
   *
   * This operation modifies one historical time entry stored in the hrm_time_tracking_timelogs table. A timelog represents recorded work for a specific calendar date through the worked_on column, the logged duration through duration_minutes, the related project through hrm_time_tracking_project_id, an optional task through hrm_time_tracking_task_id, an optional employee-authored note through description, and the billable classification through billable. Because the underlying table is organization-scoped and preserves transactional work history used by weekly timesheets, reporting, dashboards, and lifecycle rules, this endpoint updates the record carefully rather than treating it as disposable temporary data.
   *
   * Access to this operation must remain organization-scoped. The authenticated caller may update the timelog only within the currently selected organization, and permission evaluation must use the caller's role in that organization alone. An employee may update their own timelog when self-service time editing is permitted. Owners and managers may update timelogs for employees only when their organization-scoped permissions allow timelog management. A role from another organization must never grant access to update this record.
   *
   * The operation must validate all referenced work structure entities against the current organization before applying changes. The selected project must exist and belong to the same organization as the timelog. When a task is supplied, it must exist, must remain available as a valid historical reference, and must belong to the selected project so that time cannot be reassigned across unrelated project structures. The API should also preserve the business meaning of the timelog as a historical record: existing timelogs remain available even if a related project later becomes archived or completed, so the endpoint may allow updates to historical entries only when the broader workflow state still permits editing.
   *
   * Special care is required when the timelog is part of timesheet processing. The loaded requirements state that when a timesheet is approved, all included timelogs are locked from further editing and deletion. Therefore, this endpoint must reject updates when the target timelog is included in an approved timesheet. If the timelog is associated with a draft timesheet, downstream draft composition behavior should remain consistent so that later timesheet views reflect the current included timelogs and recalculated totals.
   *
   * Clients typically use this operation together with timelog browsing endpoints. A caller will often first obtain the target record from the timelog list for the current organization, then submit an update for the selected timelogId. After a successful update, personal dashboard widgets and other timelog-based views should be able to refresh from the updated persisted record. Error responses should cover missing records, cross-organization access, invalid project-task combinations, and edits blocked by locked approval state.
   *
   * @param connection
   * @param timelogId Target timelog identifier
   * @param body Updated timelog information
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor employee
   * @x-autobe-specification Implement an organization-scoped timelog update flow for one hrm_time_tracking_timelogs record identified by timelogId.
   *
   * 1. Authenticate the caller and resolve the current organization context from the active session.
   * 2. Load the target timelog by id where deleted_at is null and hrm_time_tracking_organization_id matches the current organization. If not found, return a not-found error.
   * 3. Authorize the caller. Allow the operation when the caller is the same employee account referenced by hrm_time_tracking_employee_id and self-editing is permitted, or when the caller has organization-scoped permission to manage employee timelogs. Deny access if permission is absent in the current organization even if the caller holds broader rights elsewhere.
   * 4. Check whether the timelog is currently included in a timesheet through the normalized membership table and, if included, load the parent timesheet. If the parent timesheet status is approved, reject the update because approved timesheets lock included timelogs from editing. If the parent timesheet is submitted, apply the product's edit policy consistently; at minimum, do not allow any change that would violate review integrity. Draft membership is allowed if downstream draft recalculation can remain consistent.
   * 5. Validate the request body fields against the actual timelog schema. Ensure worked_on is a valid datetime within acceptable application constraints, duration_minutes is a positive integer, billable is boolean, and description remains nullable/optional text.
   * 6. Validate project linkage. If the project reference changes, load the referenced hrm_time_tracking_projects row in the same organization and ensure it exists. Preserve historical compatibility with archived or completed projects for existing records, but reject references to projects outside the organization or logically unavailable records.
   * 7. Validate task linkage when hrm_time_tracking_task_id is provided. Load the hrm_time_tracking_tasks row and ensure it exists, belongs to the selected project, and is not deleted. Reject any task that belongs to a different project. If the request clears the task, persist null.
   * 8. Persist the updated columns only for mutable timelog attributes: hrm_time_tracking_project_id, hrm_time_tracking_task_id, worked_on, duration_minutes, description, billable, and updated_at. Do not change hrm_time_tracking_organization_id, hrm_time_tracking_employee_id, created_at, or deleted_at through this endpoint.
   * 9. If the timelog belongs to a draft timesheet, trigger recalculation or invalidation logic so draft contents and total hours remain accurate for later timesheet retrieval. Also emit any timelog-change events needed to refresh employee-facing recent timelog views and other dependent read models.
   * 10. Return the refreshed detailed timelog resource after update.
   *
   * Use a transaction when project/task validation and timelog persistence must be atomic. Handle edge cases including nonexistent timelogId, cross-organization references, invalid task-project pairing, attempts to edit locked approved entries, and updates against logically deleted related rows.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":timelogId")
  public async update(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedParam("timelogId")
    timelogId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingTimelog.IUpdate,
  ): Promise<IHrmTimeTrackingTimelog> {
    try {
      return await putHrmTimeTrackingEmployeeTimelogsTimelogId({
        employee,
        timelogId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently remove a single timelog record from the current organization context.
   *
   * This operation deletes one historical time entry identified by `timelogId`. In the domain model, a timelog is an organization-scoped record that belongs to one employee, one project, and optionally one task, and it represents recorded work that participates in time tracking and timesheet workflows. The deletion action is therefore not a generic record removal; it is a controlled time-tracking operation that must respect organization boundaries, ownership rules, and timesheet locking rules.
   *
   * Authorization depends on the actor and the relationship to the target timelog. An employee may remove only that employee's own timelog, and only when the record is still eligible for removal. A user with time management authority in the current organization may delete any employee timelog in that organization. Because owners have full organizational authority and can access capabilities available to managers and employees within the same organization, owners are also valid actors for this operation when acting inside their organization context.
   *
   * The operation must enforce the timelog constraints defined by the requirements. A timelog cannot be deleted by an employee when it is part of a submitted timesheet, and it also cannot be deleted by an employee when it is part of an approved timesheet. These restrictions protect weekly reporting and review integrity once a timelog has entered the timesheet review lifecycle. The API must also reject attempts by an employee to act on another employee's timelog. For authorized time managers, deletion remains available for employee timelogs in the current organization according to the stated management permission rule.
   *
   * This endpoint is typically used together with organization timelog browsing and timelog detail retrieval screens. After successful deletion, the removed timelog should no longer appear in organization timelog views, and downstream user interfaces that show employee work history, time entry lists, or related summaries should refresh their state accordingly. If the target timelog does not exist in the current organization scope or the caller lacks sufficient authority, the request must fail without changing any persisted data.
   *
   * @param connection
   * @param timelogId Unique identifier of the timelog to remove
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor employee
   * @x-autobe-specification Load the target timelog by `timelogId` and resolve its organization, employee owner, related project, optional task, and current timesheet inclusion state within the active organization context.
   *
   * Authorize by actor type and organization scope. If the caller is an employee without time-management authority, verify that the timelog belongs to that employee's own workforce record in the current organization. If the caller has time-management authority, allow deletion of any employee timelog in the same organization. Reject cross-organization access regardless of actor role.
   *
   * Before deletion, evaluate timesheet-lock constraints from the business rules. For employee self-service deletion, reject the operation when the timelog is attached to a submitted timesheet or an approved timesheet. Also reject when an employee attempts to delete another employee's timelog. For authorized time managers, apply organization-scope validation and permission validation before proceeding.
   *
   * Perform the delete in a transaction that removes only the target timelog record and preserves surrounding records unless cascading behavior is explicitly defined by the schema implementation. Ensure any references from organization timelog views or inclusion mappings are handled consistently by the persistence layer. After commit, make the updated state observable to organization timelog views and any real-time consumers that depend on timelog changes.
   *
   * Return success with no response body when deletion completes. Return an authorization error when the actor is not permitted, a not-found error when the timelog is missing or outside the current organization scope, and a validation/conflict-style error when employee deletion is blocked by submitted or approved timesheet membership.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":timelogId")
  public async erase(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedParam("timelogId")
    timelogId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmTimeTrackingEmployeeTimelogsTimelogId({
        employee,
        timelogId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
