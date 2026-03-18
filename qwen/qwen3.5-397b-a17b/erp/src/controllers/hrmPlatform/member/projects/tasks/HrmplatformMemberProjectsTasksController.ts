import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmPlatformTask } from "../../../../../api/structures/IHrmPlatformTask";
import { IPageIHrmPlatformTask } from "../../../../../api/structures/IPageIHrmPlatformTask";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteHrmPlatformMemberProjectsProjectIdTasksTaskId } from "../../../../../providers/deleteHrmPlatformMemberProjectsProjectIdTasksTaskId";
import { getHrmPlatformMemberProjectsProjectIdTasksTaskId } from "../../../../../providers/getHrmPlatformMemberProjectsProjectIdTasksTaskId";
import { patchHrmPlatformMemberProjectsProjectIdTasks } from "../../../../../providers/patchHrmPlatformMemberProjectsProjectIdTasks";
import { postHrmPlatformMemberProjectsProjectIdTasks } from "../../../../../providers/postHrmPlatformMemberProjectsProjectIdTasks";
import { putHrmPlatformMemberProjectsProjectIdTasksTaskId } from "../../../../../providers/putHrmPlatformMemberProjectsProjectIdTasksTaskId";

@Controller("/hrmPlatform/member/projects/:projectId/tasks")
export class HrmplatformMemberProjectsTasksController {
  /**
   * Create a new task within a project.
   *
   * This operation creates a new work item (task) within the specified project. Tasks are the fundamental units of work tracking in the HRM platform, supporting status workflow management, priority levels, time estimation, and optional assignment to team members.
   *
   * The task creation requires the caller to be either a project lead (member with project-lead role in the project) or a user with project:manage permission. The assigned employee, if specified, must be a member of the project to ensure proper access control and workflow integrity.
   *
   * Tasks support one-level parent-child hierarchy for subtask organization. A subtask references its parent task through the parent_id field. Subtasks cannot have their own children, enforcing a flat two-level structure. The parent task must belong to the same project as the new task.
   *
   * Task status values (open, in-progress, completed, closed) define the workflow state. When a task is created with a status other than the default, the initial status is recorded in the task history audit trail. Priority levels (low, medium, high, urgent) enable task sorting and filtering for effective work queue management.
   *
   * Related operations: PATCH /projects/{projectId}/tasks for listing tasks with filtering and pagination. GET /tasks/{taskId} for retrieving detailed task information. PUT /tasks/{taskId} for updating task attributes. POST /tasks/{taskId}/histories is automatically triggered when status changes occur.
   *
   * @param connection
   * @param projectId Target project's ID (UUID format)
   * @param body Task creation information including title, optional description, status, priority, estimated hours, due date, assigned employee, and parent task reference
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Create a new task record in the hrm_platform_tasks table with the following implementation logic:
   *
   * 1. Validate caller authorization: Check if the authenticated user is a project lead (has project membership with role='project-lead') OR has project:manage permission in the organization. Reject with 403 if neither condition is met.
   *
   * 2. Verify project existence and state: Query hrm_platform_projects by projectId. Ensure the project exists and is not soft-deleted. If project is archived or completed, creation may still be allowed but should be noted in business logic.
   *
   * 3. Validate assigned employee (if provided): If hrm_platform_employee_id is in the request, verify the employee exists, belongs to the same organization as the project, and is an active member of the project (exists in hrm_platform_project_members with the project). Reject with 400 if employee is not a project member.
   *
   * 4. Validate parent task (if provided): If parent_id is in the request, verify the parent task exists, belongs to the same project, is not soft-deleted, and does not itself have a parent (enforcing one-level nesting). Reject with 400 if parent has its own parent.
   *
   * 5. Validate status and priority values: Ensure status is one of ['open', 'in-progress', 'completed', 'closed'] and priority is one of ['low', 'medium', 'high', 'urgent']. Reject with 400 for invalid values.
   *
   * 6. Create task record: Insert into hrm_platform_tasks with all provided fields. Set created_at and updated_at to current timestamp. Set deleted_at to null.
   *
   * 7. Create initial task history: If status is provided (not default), create a record in hrm_platform_task_histories with old_status=null, new_status=provided status, user_id=caller's member_id, created_at=current timestamp.
   *
   * 8. Return the created task with full details including all fields and relationships.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmPlatformTask.ICreate,
  ): Promise<IHrmPlatformTask> {
    try {
      return await postHrmPlatformMemberProjectsProjectIdTasks({
        member,
        projectId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of tasks within a specific project.
   *
   * This operation provides comprehensive task search capabilities for project members. Employees can view all tasks within projects they are assigned to through project membership, including tasks assigned to other team members. The endpoint supports filtering by task status (open, in-progress, completed, closed), priority level (low, medium, high, urgent), and assigned employee to help identify workload distribution and find tasks assigned to particular individuals.
   *
   * Multiple status and priority filters can be applied simultaneously, allowing users to narrow down tasks matching specific criteria. The task list supports flexible sorting by due date to show tasks with nearest or furthest deadlines first, by priority level to surface urgent tasks, or by creation date to show recently created or oldest tasks. Multiple sort criteria can be combined, such as sorting by priority first then by due date within each priority level.
   *
   * Access is restricted to employees who are members of the project through hrm_platform_project_members assignment, or users with project management permission. Tasks in archived or completed projects remain visible for historical reference, though no new timelogs can be logged against them. The response includes task summary information optimized for list displays, with pagination support for handling large task collections efficiently.
   *
   * @param connection
   * @param projectId Target project's ID (UUID format). Tasks are scoped to this specific project.
   * @param body Search criteria and pagination parameters for filtering and sorting tasks
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query hrm_platform_tasks table filtered by hrm_platform_project_id matching the path parameter. Apply search filters from request body: status array (open, in-progress, completed, closed), priority array (low, medium, high, urgent), hrm_platform_employee_id for assigned employee filtering. Support multi-criteria sorting by due_date, priority, or created_at with ascending/descending order. Implement cursor-based or offset pagination with limit and page parameters. Before returning results, verify the requesting user is a member of the project through hrm_platform_project_members table - users can only view tasks in projects they are assigned to. For tasks in archived or completed projects, status transitions to open or in-progress are blocked per section 186, but viewing is still allowed. Join with hrm_platform_employees for assignee display name if needed in summary response. Exclude soft-deleted tasks (deleted_at is not null). Return paginated summary data optimized for list displays.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmPlatformTask.IRequest,
  ): Promise<IPageIHrmPlatformTask.ISummary> {
    try {
      return await patchHrmPlatformMemberProjectsProjectIdTasks({
        member,
        projectId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information for a specific task within a project.
   *
   * This operation returns complete task details including title, description, status, priority, estimated hours, due date, and assignment information. The task must belong to the specified project, and the requesting user must have access to that project through project membership or appropriate permissions.
   *
   * Task visibility is restricted to project members and users with project:view or project:manage permissions. Employees can only view tasks in projects they are assigned to through project membership records. This ensures proper data isolation and access control within the organization.
   *
   * The response includes all task fields from the hrm_platform_tasks table. Task status values are: open, in-progress, completed, or closed. Priority levels are: low, medium, high, or urgent. The assigned employee information is included if the task has an assignee.
   *
   * Related operations include PATCH /projects/{projectId}/tasks for listing tasks with filtering and sorting, PUT /projects/{projectId}/tasks/{taskId} for updating task details, and GET /projects/{projectId}/tasks/{taskId}/history for viewing the task's status change audit trail.
   *
   * @param connection
   * @param projectId Target project's ID (UUID format)
   * @param taskId Target task's ID (UUID format)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query the hrm_platform_tasks table by task ID with project ID verification.
   *
   * 1. Verify the task exists and matches the provided projectId
   * 2. Check user authorization: user must be a project member or have project:view/project:manage permission
   * 3. Ensure task is not soft-deleted (deleted_at is null)
   * 4. Join with hrm_platform_employees to include assignee information if present
   * 5. Return complete task details including all fields
   *
   * Handle edge cases:
   * - Task not found: return 404
   * - Task belongs to different project: return 404 (don't leak existence)
   * - User lacks project access: return 403
   * - Task is soft-deleted: return 404
   *
   * No transaction needed for read-only operation. Use efficient indexing on hrm_platform_project_id and id columns.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":taskId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
  ): Promise<IHrmPlatformTask> {
    try {
      return await getHrmPlatformMemberProjectsProjectIdTasksTaskId({
        member,
        projectId,
        taskId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing task within a project with modified attributes.
   *
   * This operation allows project leads and users with project management permission to modify task details including title, description, status, priority, estimated hours, due date, assigned employee, and parent task relationship. The projectId in the path establishes the project context for authorization and validation.
   *
   * When the task status is changed during the update, the system automatically creates an immutable audit record in the task history table. This history entry captures the timestamp, the previous status value, the new status value, and the user who made the change, providing a complete audit trail of task workflow transitions.
   *
   * Authorization is enforced at two levels: the user must be either a project lead (an employee with the project-lead role assignment in the hrm_platform_project_members table for this specific project) or possess the project:manage permission through their organizational role. The assigned employee, if specified, must be a member of the project to ensure proper access control.
   *
   * Parent task relationships are limited to one level of nesting only. A subtask cannot have its own subtasks. The parent task, if provided, must belong to the same project as the task being updated. Tasks in archived or completed projects cannot have their status changed to open or in-progress, preserving project lifecycle integrity.
   *
   * This operation complements the task creation endpoint (POST /projects/{projectId}/tasks) and the task retrieval endpoint (GET /projects/{projectId}/tasks/{taskId}). For listing tasks with filtering and pagination, use PATCH /projects/{projectId}/tasks.
   *
   * @param connection
   * @param projectId Target project's ID (UUID format)
   * @param taskId Target task's ID (UUID format)
   * @param body Update information for the task with modifiable attributes
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query the hrm_platform_tasks table to find the task by taskId. Verify the task belongs to the specified projectId. Check authorization: user must be a project lead (employee with project-lead role in hrm_platform_project_members for this project) OR have project:manage permission through their role. Validate assigned employee (if provided) is a member of the project by checking hrm_platform_project_members. Validate parent task (if provided) belongs to the same project and is not a subtask itself (one-level nesting only). If status field is being changed, create a new record in hrm_platform_task_histories with old_status, new_status, user_id, and created_at timestamp. Update the task record with provided fields. Return the updated task entity with all fields.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":taskId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmPlatformTask.IUpdate,
  ): Promise<IHrmPlatformTask> {
    try {
      return await putHrmPlatformMemberProjectsProjectIdTasksTaskId({
        member,
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
   * Permanently remove a task from a project by marking it as soft deleted.
   *
   * This operation allows project leads or users with project management permissions to delete tasks within their assigned projects. The task is soft deleted by setting the deleted_at timestamp, preserving referential integrity with related entities such as task histories and child tasks.
   *
   * When a parent task is deleted, all child tasks (subtasks) are also soft deleted through cascading. The deletion is permanent from the user perspective, though the data remains in the database for audit purposes. Task history records for status changes remain preserved.
   *
   * Authorization requires either project lead role in the target project or the project:manage permission. The projectId path parameter ensures the task belongs to the specified project before deletion.
   *
   * Related operations: GET /projects/{projectId}/tasks/{taskId} retrieves task details before deletion. PATCH /projects/{projectId}/tasks lists all tasks with filtering options.
   *
   * @param connection
   * @param projectId Target project's ID (UUID format)
   * @param taskId Target task's ID (UUID format)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Soft delete the task by setting deleted_at timestamp to current time.
   *
   * 1. Verify the task exists and belongs to the specified project
   * 2. Check authorization: user must be project lead or have project:manage permission
   * 3. Set deleted_at = CURRENT_TIMESTAMP on the task record
   * 4. Cascade soft delete to all child tasks (subtasks) if any exist
   * 5. Return 204 No Content on success
   * 6. Return 404 if task not found or doesn't belong to project
   * 7. Return 403 if user lacks permission
   *
   * The deleted_at field enables task recovery if needed. Child tasks are automatically cascade-deleted through the database relation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":taskId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmPlatformMemberProjectsProjectIdTasksTaskId({
        member,
        projectId,
        taskId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
