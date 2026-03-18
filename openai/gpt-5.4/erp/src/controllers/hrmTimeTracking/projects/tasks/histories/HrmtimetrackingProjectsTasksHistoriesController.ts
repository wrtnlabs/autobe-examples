import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingTaskHistory } from "../../../../../api/structures/IHrmTimeTrackingTaskHistory";
import { IPageIHrmTimeTrackingTaskHistory } from "../../../../../api/structures/IPageIHrmTimeTrackingTaskHistory";
import { getHrmTimeTrackingProjectsProjectIdTasksTaskIdHistoriesHistoryId } from "../../../../../providers/getHrmTimeTrackingProjectsProjectIdTasksTaskIdHistoriesHistoryId";
import { patchHrmTimeTrackingProjectsProjectIdTasksTaskIdHistories } from "../../../../../providers/patchHrmTimeTrackingProjectsProjectIdTasksTaskIdHistories";
import { postHrmTimeTrackingProjectsProjectIdTasksTaskIdHistories } from "../../../../../providers/postHrmTimeTrackingProjectsProjectIdTasksTaskIdHistories";

@Controller("/hrmTimeTracking/projects/:projectId/tasks/:taskId/histories")
export class HrmtimetrackingProjectsTasksHistoriesController {
  /**
   * Create a new task status history entry for a task within a specific project.
   *
   * This operation records a workflow transition for a task that belongs to the addressed project. In the data model, a task is the core unit of work execution within a project, and task history is the append-oriented audit record that preserves status transitions over time. The underlying history table stores the task reference, actor category, previous status, new status, and the business timestamp of the change, while the task table keeps only the current mutable state. As a result, this endpoint is used when the system needs to preserve a durable record of how a task moved from one workflow state to another instead of only overwriting the current task status.
   *
   * Access to this operation is restricted by organization context and project visibility. The target project belongs to exactly one organization, the target task must belong to that same project, and the caller must be authorized in the currently selected organization. Owners can perform organization-wide task administration. Managers may perform the operation where their organization and project responsibilities allow it. Employees are limited to tasks inside projects to which they are assigned, consistent with the task visibility rules that expose tasks only from assigned projects and only within the current organization.
   *
   * This endpoint is tightly coupled to the normalized project and task structure. The project record acts as the business container for tasks and time tracking, and the task record stores the current title, description, status, priority, estimated hours, due date, optional assignee, and optional parent task reference. The history record complements that structure by preserving the sequence of status changes without duplicating the broader task or project payload. Because the history model separates actor ownership into dedicated subtype records, clients should not attempt to choose arbitrary ownership references through the API; the authenticated caller context is used by the server to determine actor_type and related ownership linkage.
   *
   * Before creating the history entry, the server must confirm that the project exists, that the task exists, and that the task's hrm_time_tracking_project_id matches the addressed projectId. It must also validate that the requested transition is consistent with the task's current status and that the caller is permitted to act on the task in the selected organization. If any containment, authorization, or lifecycle validation fails, the operation must reject the request rather than creating a partial audit record.
   *
   * This operation is commonly used together with task detail and task list operations. Clients typically obtain visible tasks from the project task browsing flow, then submit a status change history creation request for one selected task. After a successful response, task detail views, task lists, and authorized real-time subscribers can reflect the newly appended history entry and the synchronized current task status.
   *
   * @param connection
   * @param projectId Target project's ID
   * @param taskId Target task's ID
   * @param body Status transition data for the new task history entry
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement a service method that creates one hrm_time_tracking_task_histories row and synchronizes the current status on the referenced hrm_time_tracking_tasks row inside a single transaction.
   *
   * 1. Resolve the current organization context from authentication/session state.
   * 2. Load the project by hrm_time_tracking_projects.id = projectId and ensure it belongs to the selected organization through hrm_time_tracking_organization_id. Reject if not found or not accessible.
   * 3. Load the task by hrm_time_tracking_tasks.id = taskId and ensure hrm_time_tracking_project_id equals projectId. Reject if the task does not belong to the addressed project.
   * 4. Enforce authorization:
   *    - owner: allow within the selected organization.
   *    - manager: allow only when the caller has project management or equivalent authority for the target project under organization-scoped permissions.
   *    - employee: allow only when the employee is authorized to view and act on tasks from the target project, which must be a project the employee is assigned to.
   * 5. Validate the request body against IHrmTimeTrackingTaskHistory.ICreate. The body should provide the intended new status transition data required for creating a history record. Do not trust client-supplied actor ownership references.
   * 6. Determine old_status from the current hrm_time_tracking_tasks.status value. Validate that the requested new status differs when business rules require an actual transition, and reject invalid or unsupported lifecycle transitions.
   * 7. Derive actor_type from the authenticated actor category: owner, manager, or employee. Create the hrm_time_tracking_task_histories row with hrm_time_tracking_task_id = taskId, actor_type, old_status, new_status, changed_at, created_at, and updated_at. Use server-generated timestamps for persistence metadata when not explicitly provided by the business DTO.
   * 8. Create the corresponding subtype ownership record in the appropriate task-history actor table so the polymorphic actor relationship is normalized correctly.
   * 9. Update hrm_time_tracking_tasks.status to the new status and set updated_at to the current timestamp in the same transaction.
   * 10. Return the created task history entity as IHrmTimeTrackingTaskHistory.
   *
   * Error handling:
   * - 404/forbidden-style rejection when project or task is outside the caller's visible organization scope.
   * - Reject when taskId does not belong to projectId.
   * - Reject when an employee caller is not assigned to the target project.
   * - Reject invalid status transitions or malformed request payload.
   * - Prevent partial writes by rolling back if either the history insert, actor subtype insert, or task status update fails.
   *
   * Implementation notes:
   * - Exclude logically removed projects, tasks, or task histories according to deleted_at semantics used by the schema.
   * - Preserve append-only audit behavior for history rows; never mutate prior entries as part of this operation.
   * - Publish authorized TaskHistory update events only after the transaction commits, limited to authorized subscribers within the same organization and task visibility scope.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingTaskHistory.ICreate,
  ): Promise<IHrmTimeTrackingTaskHistory> {
    try {
      return await postHrmTimeTrackingProjectsProjectIdTasksTaskIdHistories({
        projectId,
        taskId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of historical task status changes for the specified project task.
   *
   * This operation provides the read-only progress trail for one task inside one project. It is intended to support task progress review by returning the chronological history of status transitions recorded for the task, including when the change happened, the previous status, the new status, and who performed the change. In the business domain, task history is not standalone content; it is the historical audit record attached to a task and preserved over time so users can understand how the task moved through its workflow.
   *
   * The endpoint is scoped by both project and task because the underlying data model stores tasks under hrm_time_tracking_projects and task history entries under hrm_time_tracking_task_histories linked to hrm_time_tracking_tasks. The related task table stores the current mutable work state such as title, description, status, priority, estimated hours, due date, and assignee, while the task history table preserves append-oriented records of workflow transitions with actor_type, old_status, new_status, and changed_at. This separation is important for consumers: the current task state should be obtained from the task detail operation, while this endpoint is used to inspect the historical sequence that explains how the current state was reached.
   *
   * Access to this operation must follow the same project-scoped and organization-scoped visibility rules as access to the task itself. Users may review task history only when they are authorized to view the target task in the currently selected organization context. Owners and managers may access task history according to their organization responsibilities, while employees may access it only for tasks in projects to which they are assigned. If the project is outside the current organization, if the task does not belong to the specified project, or if the requester is not authorized to view that project’s tasks, the system must reject the request without exposing task history data.
   *
   * Task history is a factual, read-only record. Consumers must not treat this endpoint as a mechanism for editing or creating history entries. History entries are created automatically as part of the same business action that changes a task’s status, and each retained entry preserves the timestamp, old status, new status, and changed-by actor information as part of the accountability trail. This operation therefore complements task update operations: a client typically uses a task detail or task list API to identify a task and then calls this endpoint to review the historical transitions behind that task’s progress.
   *
   * For list browsing, the endpoint accepts structured request criteria so clients can request pagination and ordering for a potentially long history timeline. Sorting should prioritize the business change timestamp and may additionally support stable fallback ordering by creation metadata or identifier as needed by the implementation. Empty results are valid when the task exists but no status transition has yet been recorded beyond its initial state as represented by stored history rules. Error handling must favor safe failure and must never reveal cross-organization or unauthorized project information.
   *
   * @param connection
   * @param projectId Target project's ID
   * @param taskId Target task's ID
   * @param body Task history list criteria and pagination options
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Validate that the caller has an authenticated session and an active organization context. Resolve the caller’s actor category and enforce organization-scoped authorization before any data is returned.
   *
   * Load the project by id from hrm_time_tracking_projects where id = projectId, deleted_at is null, and the project belongs to the caller’s current organization. If no such project exists in the active organization context, return a not-found or authorization-safe rejection. Load the task by id from hrm_time_tracking_tasks where id = taskId, deleted_at is null, and hrm_time_tracking_project_id = projectId. Reject the request if the task does not belong to the specified project.
   *
   * Apply task visibility rules before querying history. Owners and managers with organization access may proceed according to organization responsibility. For employees, verify active visibility to the project through hrm_time_tracking_project_memberships using hrm_time_tracking_project_id = projectId, the employee identity mapped from the authenticated account, and deleted_at is null. If the employee is not currently assigned to the project, reject the request and do not disclose whether history exists.
   *
   * Query hrm_time_tracking_task_histories for rows where hrm_time_tracking_task_id = taskId and deleted_at is null. Support paginated retrieval and ordering primarily by changed_at, with optional descending default so newest transitions appear first; add a deterministic secondary sort such as created_at or id to avoid unstable pagination for equal timestamps. If the request DTO supports filters that are valid for this history domain, limit them to actual schema fields and business-safe criteria such as actor_type, old_status, new_status, or changed_at ranges only when those DTO fields exist.
   *
   * Return a paginated page result of task history summary records. Each item should include the task history identity and the audit information needed for progress review: actor type, old status, new status, changed timestamp, and any supported actor-display projection derived from the normalized subtype ownership tables in downstream DTO composition. Do not mutate history records, do not synthesize missing entries, and do not expose records from other tasks, projects, or organizations.
   *
   * Handle edge cases explicitly: if the project exists but the task is outside that project, reject; if the user lost project membership, stop exposing the history; if the task is accessible but has no history rows, return an empty paginated data set; if dependent actor-display data cannot be resolved, preserve core history integrity and still return stored audit facts whenever DTO contracts allow. The operation must remain read-only and must not create or update task history entries.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingTaskHistory.IRequest,
  ): Promise<IPageIHrmTimeTrackingTaskHistory.ISummary> {
    try {
      return await patchHrmTimeTrackingProjectsProjectIdTasksTaskIdHistories({
        projectId,
        taskId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single task history entry for a task within a project.
   *
   * This operation returns one historical audit record from the task history stream that documents a status transition for a task belonging to the specified project. The underlying task history record is stored in `hrm_time_tracking_task_histories`, which is defined as the historical audit record set for task status transitions. Each returned record identifies the task whose status changed, the actor category that performed the change through `actor_type`, the prior and resulting workflow states through `old_status` and `new_status`, and the business timestamp of the transition through `changed_at`. This allows consumers to inspect one precise workflow event rather than only the task's current mutable state.
   *
   * The route is intentionally nested under both project and task because tasks are defined in `hrm_time_tracking_tasks` as project-contained work items, and task history belongs to a specific task. The project in `hrm_time_tracking_projects` is the business container for work planning and execution inside one organization, while the organization is the top-level boundary for workforce, work, and time records. As a result, the implementation must confirm that the `historyId` record belongs to the `taskId`, and that the task in turn belongs to the `projectId`, before returning data. This prevents cross-project or cross-task access through mismatched identifiers.
   *
   * Access to this operation is controlled by the same task-visibility rules that govern task browsing and task history subscriptions. Owners and managers may retrieve the history entry when they are authorized to view or manage the task within the selected organization context. Employees may retrieve the history entry only for tasks in projects to which they are currently assigned. If an employee is not assigned to the project, the system must not expose the task or any of its history entries. When organization context changes, authorization must be reevaluated against the organization that owns the specified project.
   *
   * This operation is commonly used after a client has already identified the relevant project and task through related task browsing or task detail retrieval APIs. For example, a client may first obtain a task from a project-scoped task listing or task detail endpoint and then request a specific history entry to inspect one transition in more detail. The response is suitable for audit displays, status transition drill-down views, and real-time reconciliation when a previously delivered history update needs to be fetched directly by identifier.
   *
   * If the project, task, or history entry does not exist, or if the supplied identifiers do not form a valid ownership chain, the request must fail rather than returning unrelated data. The operation must also reject access when the caller is outside the authorized organization scope or lacks visibility to the parent task. Records logically removed from active use should not be returned as active history content unless the service's internal retrieval policy explicitly permits it.
   *
   * @param connection
   * @param projectId Target project's ID
   * @param taskId Target task's ID
   * @param historyId Target task history entry's ID
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement a read-only service that fetches one row from `hrm_time_tracking_task_histories` by `id`, joined to `hrm_time_tracking_tasks` and `hrm_time_tracking_projects` to verify the full nested ownership chain.
   *
   * Service steps:
   * 1. Resolve the caller's active organization context and actor type.
   * 2. Load the target history row where `hrm_time_tracking_task_histories.id = {historyId}`.
   * 3. Join or subsequently load the related task where `hrm_time_tracking_tasks.id = hrm_time_tracking_task_histories.hrm_time_tracking_task_id`.
   * 4. Verify `hrm_time_tracking_tasks.id = {taskId}` and `hrm_time_tracking_tasks.hrm_time_tracking_project_id = {projectId}`.
   * 5. Load the related project and verify it belongs to the caller's active organization context through `hrm_time_tracking_projects.hrm_time_tracking_organization_id`.
   * 6. Exclude logically removed project, task, or history records from normal retrieval when their `deleted_at` is not null, unless a broader internal policy explicitly allows historical reads.
   *
   * Authorization rules:
   * - Owner: allow when the project belongs to the active organization context.
   * - Manager: allow when the project belongs to the active organization context and the manager has permission to view or manage project tasks in that organization.
   * - Employee: allow only when the employee belongs to the active organization context and is currently assigned to the parent project. Enforce the same visibility boundary used for task browsing so employees can access only tasks from projects to which they are assigned.
   *
   * Validation and consistency rules:
   * - Reject when any identifier is malformed.
   * - Reject with not found when the history record does not exist, when the task does not exist, when the project does not exist, or when the ownership chain does not match the nested path parameters.
   * - Reject with forbidden when the caller is not authorized to view the parent task.
   * - Do not infer access from `actor_type` on the history row; `actor_type` describes who performed the historical change, not who may read it.
   *
   * Response construction:
   * - Return a single `IHrmTimeTrackingTaskHistory` DTO populated from the history row.
   * - Include the persisted audit fields that exist in the schema: identifier, task linkage as modeled in the DTO, actor type, old status, new status, changed timestamp, creation timestamp, and update timestamp, following the canonical DTO shape for the entity.
   * - Keep this operation read-only and do not mutate any audit, task, or project records.
   *
   * Operational notes:
   * - Prefer a single query with joins when practical to avoid inconsistent authorization checks.
   * - Use indexes on task history by task and changed time, and the task primary key/project foreign key path, to keep nested validation efficient.
   * - This endpoint may complement real-time task history update delivery by allowing clients to fetch a specific history record directly after receiving an event reference.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":historyId")
  public async at(
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
    @TypedParam("historyId")
    historyId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingTaskHistory> {
    try {
      return await getHrmTimeTrackingProjectsProjectIdTasksTaskIdHistoriesHistoryId(
        {
          projectId,
          taskId,
          historyId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
