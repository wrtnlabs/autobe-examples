import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingTask } from "../../../../api/structures/IHrmTimeTrackingTask";
import { IPageIHrmTimeTrackingTask } from "../../../../api/structures/IPageIHrmTimeTrackingTask";
import { deleteHrmTimeTrackingProjectsProjectIdTasksTaskId } from "../../../../providers/deleteHrmTimeTrackingProjectsProjectIdTasksTaskId";
import { getHrmTimeTrackingProjectsProjectIdTasksTaskId } from "../../../../providers/getHrmTimeTrackingProjectsProjectIdTasksTaskId";
import { patchHrmTimeTrackingProjectsProjectIdTasks } from "../../../../providers/patchHrmTimeTrackingProjectsProjectIdTasks";
import { postHrmTimeTrackingProjectsProjectIdTasks } from "../../../../providers/postHrmTimeTrackingProjectsProjectIdTasks";
import { putHrmTimeTrackingProjectsProjectIdTasksTaskId } from "../../../../providers/putHrmTimeTrackingProjectsProjectIdTasksTaskId";

@Controller("/hrmTimeTracking/projects/:projectId/tasks")
export class HrmtimetrackingProjectsTasksController {
  /**
   * Create a new task within a specific project.
   *
   * This operation creates a work item inside the target project record, which the domain model defines as the parent business container for work planning and work tracking. The underlying task entity stores the mutable operational state used for task boards, filtering, sorting, and assignment workflows, including the short task title displayed in task lists and project boards, the optional detailed explanation of the work to be completed, the current workflow status, the priority classification used for sorting and planning, the optional estimated effort measured in hours, the optional deadline for completing the task, the optional assigned employee, and the optional parent task for one-level subtask nesting.
   *
   * Access to this operation is restricted by project-scoped task management authority. According to the business rules, a project lead may manage tasks only within that project, while a user with broader project management authority may manage tasks across projects within the current organization context. If a caller has neither project-lead responsibility for the target project nor broader project management authority, the request must be rejected. The operation must also respect organization scoping so that the project being modified belongs to the caller's currently selected organization.
   *
   * This operation is tightly related to project membership rules. When an assignee is provided, the selected employee must already be a member of the same project, because task assignment is allowed only to employees participating in that project. The task may remain unassigned when the assignee field is omitted. If a parent task is provided, it must reference a task in the same project, because cross-project task hierarchy is invalid and the business rules allow only one level of subtask nesting. These validations ensure that the task structure remains consistent with the project-centered work model.
   *
   * After successful creation, the response returns the created task resource with its persisted identity and current state. Consumers typically use this operation together with project detail and task browsing operations: a project detail operation provides context about the target work initiative, and subsequent task list or task detail operations allow users to review the newly created task within authorized project scope. Validation failures should clearly report cases such as missing project, unauthorized actor, invalid assignee membership, duplicate task title within the same sibling scope, or invalid parent task selection.
   *
   * @param connection
   * @param projectId Target project's unique identifier
   * @param body Information required to create a task in the project
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement project-scoped task creation against hrm_time_tracking_tasks inside the caller's current organization context.
   *
   * 1. Resolve the authenticated actor and current organization context.
   * 2. Load hrm_time_tracking_projects by id = projectId, deleted_at IS NULL, and hrm_time_tracking_organization_id matching the current organization. If no matching project exists, reject the request.
   * 3. Authorize the caller.
   *    - Allow if the caller has broader project management authority in the current organization.
   *    - Otherwise, if the caller is an employee actor, load hrm_time_tracking_project_memberships for the target project and that employee with deleted_at IS NULL and membership_role representing project-lead. Allow only when such membership exists.
   *    - Otherwise reject the request.
   * 4. Validate request body fields against the task model and business rules.
   *    - title is required and must be suitable for the task title field.
   *    - description is optional.
   *    - status must be one of the allowed business values for tasks: open, in-progress, completed, or closed.
   *    - priority must be one of the allowed business values: low, medium, high, or urgent.
   *    - estimated_hours is optional.
   *    - due_date is optional.
   *    - hrm_time_tracking_employee_id is optional; if absent, create an unassigned task.
   *    - parent_id is optional.
   * 5. If hrm_time_tracking_employee_id is provided, verify an active project membership exists in hrm_time_tracking_project_memberships for the same project and employee with deleted_at IS NULL. If not, reject the request because an assignee must already be a member of the same project.
   * 6. If parent_id is provided, load the parent task by id with deleted_at IS NULL and ensure its hrm_time_tracking_project_id equals the target project id. Reject if the parent task does not exist in the same project. Also enforce the one-level subtask policy by rejecting creation under a parent that already has its own parent_id when the domain service enforces strict single-level nesting.
   * 7. Enforce uniqueness implied by @@unique([hrm_time_tracking_project_id, parent_id, title]). Before insert, check for an existing non-deleted sibling task in the same project with the same parent_id and title. Reject with a conflict if found.
   * 8. Insert the new hrm_time_tracking_tasks row with a generated UUID id, the target hrm_time_tracking_project_id, optional hrm_time_tracking_employee_id, optional parent_id, title, optional description, status, priority, optional estimated_hours, optional due_date, and current timestamps for created_at and updated_at. Set deleted_at to null.
   * 9. Return the created task record as the detailed task DTO.
   *
   * Error handling:
   * - Not found when the project or provided parent task is outside the current organization scope or does not exist.
   * - Forbidden when the caller lacks broader project management authority and is not a project lead for the target project.
   * - Validation error for invalid status, priority, incompatible assignee membership, or invalid hierarchy.
   * - Conflict for duplicate sibling title within the same project/parent scope.
   *
   * Transaction guidance:
   * - Perform validation reads and insert in a single transaction when possible to reduce race conditions around membership checks and unique sibling title creation.
   * - Rely on the database unique constraint as the final guard and translate constraint violations into a business conflict response.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingTask.ICreate,
  ): Promise<IHrmTimeTrackingTask> {
    try {
      return await postHrmTimeTrackingProjectsProjectIdTasks({
        projectId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of tasks for the specified project within the current organization.
   *
   * This operation returns current task records from the `hrm_time_tracking_tasks` entity for a single `hrm_time_tracking_projects` record. In the domain model, a project is the container for tasks and time tracking, and a task is the core unit of work execution within that project. The result is intended for project task lists and task-board style views where users need to browse the current task set for one visible project.
   *
   * The request is organization-scoped and must be evaluated only in the caller's currently selected organization context. The service must first confirm that the referenced project belongs to that organization. It must then apply actor-specific visibility rules. Owners may browse project tasks in the organization they administer. Managers may browse tasks when their organization-scoped permissions allow project visibility. Employees may browse tasks only for projects they are allowed to see, which requires the service to validate project membership through `hrm_time_tracking_project_memberships` before any task data is returned.
   *
   * Filtering and sorting must follow the documented task browsing rules. Supported filters are limited to task status, priority, and assigned employee. Supported sort options are limited to due date, priority, and creation date, and those options may be combined with filters during browsing. The response is paginated, and pagination must preserve the current organization context, the active filters, and the selected ordering. If the requested project does not exist in the selected organization, or if the caller does not have visibility to that project's tasks, the request must be rejected rather than exposing cross-organization or unauthorized data.
   *
   * This endpoint returns current task-list information only. Clients that need a historical audit of task status transitions should use the task history APIs after identifying the relevant tasks from this list. Together, these APIs support project browsing, task inspection, and synchronized task-list refresh behavior for authorized users in the same organization and visible project scope.
   *
   * @param connection
   * @param projectId Target project's ID
   * @param body Task filters, sorting options, and pagination input for project-scoped browsing
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Validate the authenticated session and resolve the caller's currently selected organization context before any data access.
   *
   * Load the target project from hrm_time_tracking_projects by id = {projectId}, deleted_at IS NULL, and hrm_time_tracking_organization_id equal to the active organization. If no such project exists in the active organization, reject the request as not found within the current workspace scope.
   *
   * Authorize access according to actor and organization-scoped permissions. For owners, allow project task browsing in the active organization. For managers, allow browsing when they have project management authority in the active organization. For employees, resolve the caller's employee record in the active organization and verify an active membership exists in hrm_time_tracking_project_memberships for the tuple (hrm_time_tracking_project_id = projectId, hrm_time_tracking_employee_id = currentEmployeeId) with deleted_at IS NULL. If the membership check fails, reject the request.
   *
   * Build the base query from hrm_time_tracking_tasks with conditions: hrm_time_tracking_project_id = projectId and deleted_at IS NULL. Apply only request-body filters supported by the business rules: status, priority, and assigned employee. If an assigned employee filter is provided, compare against hrm_time_tracking_employee_id. Do not broaden visibility beyond the authorized project scope. Optionally join parent task metadata and assignee summary data needed for the summary DTO, but keep the task row as the primary dataset.
   *
   * Apply sorting only by due_date, priority, or created_at, with a deterministic secondary sort such as id to keep stable pagination. Apply pagination from IHrmTimeTrackingTask.IRequest and return a paginated container of task summaries as IPageIHrmTimeTrackingTask.ISummary.
   *
   * For data integrity, do not return tasks whose parent task belongs to a different project; such data should already be prevented by service validation, but implementation should not trust inconsistent rows. If the project status is archived or completed, browsing historical tasks remains allowed, but no mutation behavior is implied by this endpoint.
   *
   * On failures, prefer explicit rejection for unauthorized access, project-not-in-context, or invalid filter values rather than returning ambiguous empty results. Logging and monitoring should preserve organization boundaries and avoid leaking whether similarly identified records exist in other organizations.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingTask.IRequest,
  ): Promise<IPageIHrmTimeTrackingTask.ISummary> {
    try {
      return await patchHrmTimeTrackingProjectsProjectIdTasks({
        projectId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the detailed information for a single task within a specific project.
   *
   * This operation returns one task record from the project that contains it, using the project as the business container for planned work and task execution. In the underlying database model, `hrm_time_tracking_tasks` stores the mutable operational state of work items, including the task title, optional description, current workflow status, priority classification, optional estimated effort in hours, optional due date, optional assignee employee reference, and optional parent task reference for one-level subtask nesting. The parent `hrm_time_tracking_projects` record provides the organizing context for that task because projects are defined as the core identity and lifecycle container for memberships, tasks, and time-tracking records.
   *
   * Access to this endpoint must respect organization-scoped visibility and project membership rules. Employees may view tasks only from projects to which they are currently assigned, and they must never be shown tasks from projects outside that visible set. Owners and managers with broader project management authority may retrieve task details across projects within the current organization context, while project leads are limited to the projects where they hold that responsibility. The implementation must therefore evaluate both the current organization context and the caller's relationship to the referenced project before disclosing task data.
   *
   * The returned resource should reflect the current task state rather than historical status transitions. Historical changes are preserved separately from the task table, so this endpoint is intended to provide the current operational view used by task detail screens, assignment review, due-date inspection, and parent-task context display. Assignee and parent task references may be null, because the schema explicitly allows tasks to remain unassigned and to exist without a parent task.
   *
   * This endpoint is commonly used after a task has been discovered through a task browsing operation for the user's visible projects. A list-style task search endpoint should typically be executed first when a client needs to find candidate tasks by status, priority, assignee, due date, or creation ordering. Once the client has the target identifiers, this detail endpoint provides the complete task record for focused review, editing preparation, or task-specific workflow actions.
   *
   * If the project does not exist, the task does not exist, the task does not belong to the specified project, or the caller is outside the authorized visibility scope for that project, the request must be rejected. The implementation should also exclude logically removed records from normal retrieval so that inactive task or membership records are not exposed as active business data.
   *
   * @param connection
   * @param projectId Target project's ID
   * @param taskId Target task's ID
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement a read-only service method that retrieves one task from `hrm_time_tracking_tasks` by `id = taskId` and `hrm_time_tracking_project_id = projectId`, while enforcing organization and membership visibility constraints.
   *
   * First, resolve the caller's current organization context from authentication/session middleware. Load the referenced project from `hrm_time_tracking_projects` using `projectId`, ensuring the project belongs to the caller's current organization and is not logically removed for normal business retrieval. If no such project exists, reject the request as not found or out of scope.
   *
   * Next, load the task from `hrm_time_tracking_tasks` using both the task ID and project ID together. This guards against cross-project leakage and ensures the nested route remains semantically correct. Exclude logically removed tasks from normal reads. If no matching task exists, reject the request.
   *
   * Apply authorization after establishing the project context. For employee actors, verify an active project membership exists in `hrm_time_tracking_project_memberships` for the caller's employee identity and the target project, and ignore memberships that are logically removed. If no active membership exists, reject the request because employees may view tasks only from assigned projects. For project-lead-specific enforcement, a matching membership with the appropriate `membership_role` may be used when the wider policy requires lead-only authority. Owners and managers with broader organization-level project visibility may bypass the employee-membership check only when the authorization layer has already established that broader authority.
   *
   * Return the task as `IHrmTimeTrackingTask`, mapped directly from confirmed schema fields: `id`, project linkage, optional assignee linkage, optional parent linkage, `title`, optional `description`, `status`, `priority`, optional `estimated_hours`, optional `due_date`, `created_at`, and `updated_at`. If the DTO contract includes related project, assignee, or parent summaries, populate them through additional joins or follow-up repository reads only when those related records are within the same authorized organization scope.
   *
   * Do not mutate any records in this operation. Do not expose tasks from other projects even if a valid `taskId` is supplied. Ensure null handling is preserved for optional assignee, parent, description, estimated hours, and due date fields. Error handling should distinguish between not found and forbidden only to the extent allowed by the platform's security policy, while avoiding disclosure of inaccessible project existence.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":taskId")
  public async at(
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingTask> {
    try {
      return await getHrmTimeTrackingProjectsProjectIdTasksTaskId({
        projectId,
        taskId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a task within a specific project and return the task's latest persisted state.
   *
   * This operation updates the mutable work-execution attributes of a task stored in the `hrm_time_tracking_tasks` table, which is described as the core unit of work execution inside a project. A task belongs to one `hrm_time_tracking_projects` record, may be assigned to one `hrm_time_tracking_employees` record, and may reference one parent task for a single level of subtask nesting. The project itself is the business container for planned work and time tracking, so this endpoint keeps the task update explicitly scoped beneath `/projects/{projectId}` to preserve that business relationship and to ensure the task is managed within the correct initiative.
   *
   * Access to this operation is restricted by project-management authority. Business rules state that a project lead may manage tasks only within the project where that employee is a project lead, while a user with broader project-management authority may manage tasks across projects within the current organization context. Requests from users without the required authority must be rejected. In addition, task visibility and access must remain organization-scoped and project-scoped, so the implementation must verify that the target task belongs to the specified project and that the caller is allowed to manage tasks for that project.
   *
   * The update must respect the validation rules defined by the task schema and the business requirements. The `title` remains the short task title displayed in task lists and project boards, while `description` is the optional detailed explanation of the work to be completed. The `status` field represents the current workflow state and must remain aligned with the allowed business values described for the task, and `priority` remains the planning and sorting classification. Optional planning attributes such as `estimated_hours` and `due_date` may be revised as part of normal task management. If the update changes the assignee, the specified employee must already be a member of the same project; otherwise the request must be rejected. If the update changes the parent task, the referenced parent must belong to the same project, because cross-project task hierarchies are not allowed.
   *
   * This operation is typically used after the client has already obtained project and task context from task-browsing or detail APIs. For example, a user would first browse visible tasks within authorized scope, then call this endpoint to revise task details, assignment, schedule, or hierarchy for one selected task. After a successful update, the response returns the current detailed task resource so client applications can refresh boards, lists, or task detail views with the authoritative state stored in the database.
   *
   * Expected failure cases include a missing project, a missing task, a task that does not belong to the supplied project, an assignee who is not an active member of the same project, a parent task from a different project, or an actor lacking the required task-management authority. The endpoint should fail atomically and must not persist partial changes when any validation or authorization check fails.
   *
   * @param connection
   * @param projectId Target project's ID
   * @param taskId Target task's ID
   * @param body Task update data
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Load the target project from `hrm_time_tracking_projects` by `projectId` and ensure it exists within the caller's current organization context and is not logically removed for active use. Load the target task from `hrm_time_tracking_tasks` by `taskId` and verify that `hrm_time_tracking_tasks.hrm_time_tracking_project_id` matches the supplied `projectId`. Reject the request when the project or task does not exist, when the task does not belong to the project, or when the record is not available for update.
   *
   * Resolve the caller's actor type and organization-scoped authority. Allow the operation when the caller has broader project-management authority for the current organization, or when the caller is an employee who is a project lead for the same project. To verify project-lead authority for an employee caller, query `hrm_time_tracking_project_memberships` for a non-deleted membership row matching the caller's employee identity and the target `hrm_time_tracking_project_id`, and require `membership_role` to indicate project-lead responsibility according to the service's business-role mapping. Reject all other callers.
   *
   * Validate the request body fields against the task domain rules before writing. If the payload includes an assignee reference, confirm that the referenced employee exists and has a non-deleted membership row in `hrm_time_tracking_project_memberships` for the same project. If the assignee is not a member of the same project, reject the update. If the payload includes `parentId`, load the parent task and require it to exist in the same project; reject any cross-project parent reference. Also enforce one-level nesting semantics by rejecting a parent task that is itself already a child task when that would create deeper nesting, and reject any attempt that would create a self-reference or circular relationship.
   *
   * Apply the update to the mutable columns of `hrm_time_tracking_tasks` only: `hrm_time_tracking_employee_id`, `parent_id`, `title`, `description`, `status`, `priority`, `estimated_hours`, `due_date`, and `updated_at`. Do not alter immutable identity fields or the owning `hrm_time_tracking_project_id` through this endpoint. Execute the validation and update in a single transaction so authorization, membership validation, hierarchy validation, and persistence remain consistent under concurrent access.
   *
   * Return the updated task as the canonical post-write representation. The response should be built from the persisted `hrm_time_tracking_tasks` row and may hydrate related project, assignee, or parent details as required by the `IHrmTimeTrackingTask` DTO. Error handling should distinguish authorization failure, missing resources, invalid project-task pairing, invalid assignee membership, and invalid parent-task hierarchy so downstream agents can map them to appropriate HTTP error responses and test cases.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":taskId")
  public async update(
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingTask.IUpdate,
  ): Promise<IHrmTimeTrackingTask> {
    try {
      return await putHrmTimeTrackingProjectsProjectIdTasksTaskId({
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
   * Permanently remove a single task from a project in the current organization context.
   *
   * This operation deletes one work item stored in the `hrm_time_tracking_tasks` table, which is the core unit of work execution within a project. The target task is identified by `taskId` and must belong to the parent project identified by `projectId`. The task record contains the mutable operational state used by task boards and task browsing, including the task title, optional detailed work description, current workflow status, priority classification, optional estimated effort in hours, optional due date, optional assigned employee, and optional one-level parent task relationship. Because tasks belong to `hrm_time_tracking_projects`, and projects belong to one organization, this deletion is always evaluated inside the caller's currently selected organization.
   *
   * This operation is restricted to organization members who are allowed to manage project-scoped records in that organization. Owners have full organization authority within their selected organization, and managers may perform this operation only when their assigned role grants project management permission in that same organization context. Employees can view tasks in projects to which they are assigned, including task title, description, status, priority, estimated hours, due date, assignee, and parent task information, but the loaded requirements do not grant them task deletion authority. Any attempt to delete a task outside the current organization scope or without sufficient permission must be rejected.
   *
   * The deletion behavior must respect the underlying historical and relational design of the schema. A task may have child tasks through the one-level `parent_id` relationship, historical status transition entries in `hrm_time_tracking_task_histories`, and optional work records in `hrm_time_tracking_timelogs`. Task history is retained as the chronological record of task status changes, and timelogs are preserved as historical records of work already performed. For that reason, this operation should only succeed when the target task has no associated timelogs and no remaining child tasks. This prevents the API from using database cascade behavior to remove historical work records or an entire task subtree implicitly.
   *
   * Clients typically use a task listing or detail retrieval operation before calling this endpoint so the user can confirm the exact task title, assignee, priority, due date, and project context that will be affected. After successful deletion, the task must no longer appear in project task lists, assignment views, or task board results for that organization. Because permanent deletion has no recovery path defined in the loaded requirements, clients should present a strong confirmation step before issuing this request.
   *
   * If the project does not exist in the current organization, if the task does not belong to the specified project, if the caller lacks project management permission, if child tasks still exist, or if any timelog is linked to the task, the operation must fail without partially deleting related records. The service should return a clear authorization or validation error so the caller understands whether the failure is caused by organization scoping, permission, or deletion preconditions.
   *
   * @param connection
   * @param projectId Target project's UUID in the current organization scope.
   * @param taskId Target task's UUID within the specified project.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement a project-scoped task deletion service for the `hrm_time_tracking_tasks` table.
   *
   * 1. Authenticate the caller and resolve the current organization context from the active session.
   * 2. Authorize the caller:
   *    - allow organization owners in the current organization;
   *    - allow managers only when their organization-scoped role grants project management permission;
   *    - reject employees and any caller outside the selected organization context.
   * 3. Load the target project by `projectId` and verify it belongs to the current organization using `hrm_time_tracking_projects.hrm_time_tracking_organization_id`. Reject if not found in scope.
   * 4. Load the target task by `taskId` and verify `hrm_time_tracking_tasks.hrm_time_tracking_project_id === projectId`. Reject if the task does not exist or does not belong to the specified project.
   * 5. Enforce deletion preconditions before issuing any delete:
   *    - query `hrm_time_tracking_timelogs` for existence of rows where `hrm_time_tracking_task_id = taskId` and reject when any row exists, because timelogs are historical work records that must be preserved;
   *    - query `hrm_time_tracking_tasks` for existence of child rows where `parent_id = taskId` and reject when any child task exists, so callers must remove or reorganize subtasks explicitly before deleting the parent task.
   * 6. Perform the delete in a transaction:
   *    - delete the row from `hrm_time_tracking_tasks` by primary key after preconditions pass;
   *    - rely on database cascade only for dependent `hrm_time_tracking_task_histories` rows, since they are task-local audit records and should not remain orphaned.
   * 7. Return success with no response body.
   *
   * Error handling requirements:
   * - return a not-found error when the project or task is missing in the caller's organization scope;
   * - return a forbidden error when the caller lacks project management permission in the selected organization;
   * - return a conflict or validation error when the task still has child tasks or linked timelogs;
   * - never partially delete related data when any precondition fails.
   *
   * Implementation notes:
   * - do not accept a request body;
   * - use UUID parsing and validation for both path parameters;
   * - ensure organization scoping is applied before task deletion so one organization's manager cannot affect another organization's project records;
   * - because deletion is permanent and no recovery path is defined in the loaded requirements, do not implement archival, recycle-bin behavior, or any restoration flow for this endpoint.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":taskId")
  public async erase(
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmTimeTrackingProjectsProjectIdTasksTaskId({
        projectId,
        taskId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
