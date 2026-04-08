import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmTask } from "../../../../../api/structures/IErpHrmTask";
import { IPageIErpHrmTask } from "../../../../../api/structures/IPageIErpHrmTask";
import { AdminAuth } from "../../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../../decorators/payload/AdminPayload";
import { deleteErpHrmAdminProjectsProjectIdTasksTaskId } from "../../../../../providers/deleteErpHrmAdminProjectsProjectIdTasksTaskId";
import { getErpHrmAdminProjectsProjectIdTasksAnalytics } from "../../../../../providers/getErpHrmAdminProjectsProjectIdTasksAnalytics";
import { getErpHrmAdminProjectsProjectIdTasksTaskId } from "../../../../../providers/getErpHrmAdminProjectsProjectIdTasksTaskId";
import { patchErpHrmAdminProjectsProjectIdTasks } from "../../../../../providers/patchErpHrmAdminProjectsProjectIdTasks";
import { postErpHrmAdminProjectsProjectIdTasks } from "../../../../../providers/postErpHrmAdminProjectsProjectIdTasks";
import { putErpHrmAdminProjectsProjectIdTasksTaskId } from "../../../../../providers/putErpHrmAdminProjectsProjectIdTasksTaskId";

@Controller("/erpHrm/admin/projects/:projectId/tasks")
export class ErphrmAdminProjectsTasksController {
  /**
   * Create a new task within a specific project.
   *
   * This endpoint creates a task under a project identified by the projectId path parameter. The task can optionally be assigned to a project member and can optionally have a parent task for subtasking (one level of nesting only).
   *
   * Task creation requires either the project:manage permission at the organization level or the project-lead role on the specific project. Users with organization-level project:manage permission can create tasks on any project, while project leads can only create tasks within projects where they hold the project-lead role.
   *
   * When creating a task, the system validates that the assigned employee (if provided) is a member of the project. Parent tasks must belong to the same project and cannot themselves have a parent task.
   *
   * Newly created tasks default to status "open" and priority "medium". Status changes are automatically recorded in task history for audit trail purposes.
   *
   * @param connection
   * @param projectId Unique identifier of the project to create the task under (global scope).
   * @param body Task creation payload including title, optional description, status (defaults to open), priority (defaults to medium), estimated hours, due date, assigned employee reference, and parent task reference for subtasking.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Create a new task for the specified project.
   *
   * 1. VALIDATE projectId exists and belongs to the user's current organization context.
   *
   * 2. AUTHORIZATION: Verify the requesting user has either:
   *    - project:manage permission at the organization level, OR
   *    - project-lead role on the specified project (via erp_hrm_project_members)
   *    If neither condition is met, return 403 Forbidden.
   *
   * 3. VALIDATE request body:
   *    - title: required, non-empty string, max 255 characters
   *    - description: optional string
   *    - status: optional, must be one of ["open", "in-progress", "completed", "closed"], default "open"
   *    - priority: optional, must be one of ["low", "medium", "high", "urgent"], default "medium"
   *    - estimated_hours: optional, positive number
   *    - due_date: optional, valid datetime
   *    - erp_hrm_employee_id: optional, if provided must reference a valid project member
   *    - parent_id: optional, if provided must reference a valid task in the same project with no existing parent
   *
   * 4. If erp_hrm_employee_id is provided:
   *    - Verify the employee is a member of the project (query erp_hrm_project_members)
   *    - If not a member, return 400 Bad Request with error: "Assigned employee must be a project member"
   *
   * 5. If parent_id is provided:
   *    - Verify parent task exists and belongs to the same project
   *    - Verify parent task has no existing parent_id (only one level of nesting allowed)
   *    - If validation fails, return 400 Bad Request
   *
   * 6. INSERT new task record into erp_hrm_tasks with:
   *    - id: generated UUID
   *    - erp_hrm_project_id: from path parameter
   *    - erp_hrm_employee_id: from request (nullable)
   *    - parent_id: from request (nullable)
   *    - title: from request
   *    - description: from request (nullable)
   *    - status: from request or default "open"
   *    - priority: from request or default "medium"
   *    - estimated_hours: from request (nullable)
   *    - due_date: from request (nullable)
   *    - created_at: current timestamp
   *    - updated_at: current timestamp
   *
   * 7. Return the newly created task with HTTP 201 Created.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTask.ICreate,
  ): Promise<IErpHrmTask> {
    try {
      return await postErpHrmAdminProjectsProjectIdTasks({
        admin,
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
   * This endpoint allows users to search and filter tasks based on various criteria including task status, priority level, and assigned employee. The results are scoped to the specified project, ensuring tasks from other projects are not included.
   *
   * Task filtering supports exact match on status (open, in-progress, completed, closed), priority (low, medium, high, urgent), and assigned employee. Multiple filters can be combined simultaneously. Sorting options include due date, priority, and creation date with ascending or descending order.
   *
   * The response includes paginated task summaries optimized for list display, with each summary containing essential task information such as title, status, priority, due date, and assignee details. Archived projects preserve all their task data and remain searchable through this endpoint.
   *
   * Users must have appropriate permissions to access tasks: employees who are project members can view tasks in their assigned projects, project leads can view and manage tasks within their projects, and users with project manage permission can access tasks across all projects in the organization.
   *
   * @param connection
   * @param projectId Unique identifier of the project to scope task search (must belong to user's organization)
   * @param body Search criteria including filters (status, priority, assignee), sorting options, and pagination parameters
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Query erp_hrm_tasks table filtered by erp_hrm_project_id matching the path parameter. Apply exact-match filters on status, priority, and erp_hrm_employee_id fields as provided in request body. Support sorting by due_date, priority, and created_at with configurable order (asc/desc). Implement cursor-based or offset pagination with configurable page size (default 20, max 100). Join with erp_hrm_employees table to resolve assignee names when employee filter or output includes assignee information. Validate that the project exists and belongs to the user's organization before returning results. If the project does not exist or user lacks access, return 404 error. Ensure all task data remains isolated within the owning organization.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTask.IRequest,
  ): Promise<IPageIErpHrmTask.ISummary> {
    try {
      return await patchErpHrmAdminProjectsProjectIdTasks({
        admin,
        projectId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a specific task by its unique identifier within a project.
   *
   * This endpoint returns the complete task details including its title, description, status, priority, estimated hours, due date, and assignment information. The task must belong to the specified project, and the requesting user must have appropriate permissions to view it.
   *
   * The response includes the project reference, the assigned employee details (if any), the parent task reference (if this is a subtask), and the complete history of status transitions with timestamps and user attribution. Subtasks associated with this task are also included in the response.
   *
   * Authorization is validated against the user's role and project membership. Employees can view tasks in projects they are assigned to. Project leads can view all tasks within their project. Users with project:manage permission at the organization level can access tasks across all projects.
   *
   * The operation enforces organization data isolation. All task data is scoped to the organization context established in the session. Attempting to retrieve a task from a project outside the current organization context results in a not found error.
   *
   * @param connection
   * @param projectId Unique identifier of the project containing the task (global scope)
   * @param taskId Unique identifier of the task to retrieve (scoped to project)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Retrieve task by ID within project context.
   *
   * Implementation steps:
   * 1. Extract projectId and taskId from path parameters
   * 2. Verify user has valid organization session context
   * 3. Validate authorization:
   *    - User must have project:view permission OR be a project member OR be a project lead
   *    - If project:view permission exists, grant access
   *    - If user is project lead on the specified project, grant access
   *    - If user is a member of the project (found in erp_hrm_project_members), grant access
   *    - Otherwise, deny with 403 Forbidden
   * 4. Query erp_hrm_projects to verify projectId exists and belongs to user's organization
   * 5. Query erp_hrm_tasks to verify taskId exists and erp_hrm_project_id matches projectId
   * 6. If task not found or project mismatch, return 404 Not Found
   * 7. Load related data:
   *    - Project details (name, color, status)
   *    - Assignee employee details (if erp_hrm_employee_id is set)
   *    - Parent task details (if parent_id is set, exclude its subtasks)
   *    - Task history entries ordered by created_at descending
   *    - Direct subtasks (tasks where parent_id equals this task's ID)
   * 8. Return complete task entity with all loaded relations
   *
   * Error handling:
   * - 401 Unauthorized: No valid session or organization context
   * - 403 Forbidden: User lacks permission to view this task
   * - 404 Not Found: Project or task does not exist, or task does not belong to specified project
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":taskId")
  public async at(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmTask> {
    try {
      return await getErpHrmAdminProjectsProjectIdTasksTaskId({
        admin,
        projectId,
        taskId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing task within a specific project.
   *
   * This endpoint modifies the properties of a task. Only tasks belonging to the specified project can be updated through this endpoint. The requesting user must be authorized either as a project lead for the containing project or hold the project:manage permission at the organization level.
   *
   * When updating the assigned employee, the system validates that the new employee is a member of the project. Task status changes are automatically recorded in the task history for audit purposes.
   *
   * The task status follows a workflow: open -> in-progress -> completed -> closed. Valid status transitions depend on current status. Priority levels (low, medium, high, urgent) can be changed freely. Parent task can be set to create subtasks, but only one level of nesting is allowed.
   *
   * @param connection
   * @param projectId Unique identifier of the project containing the task (global scope).
   * @param taskId Unique identifier of the task to update (scoped to project).
   * @param body Update payload containing task properties to modify. All fields are optional; only provided fields will be updated.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification 1. Extract projectId and taskId from path parameters.
   * 2. Verify the task belongs to the specified project; return 404 if not found or mismatched.
   * 3. Verify authorization: check if user has project:manage permission OR is a project-lead for the project; return 403 if unauthorized.
   * 4. Validate request body fields:
   *    - title: non-empty string, max 255 characters
   *    - description: optional string, max 2000 characters
   *    - status: must be one of open, in-progress, completed, closed
   *    - priority: must be one of low, medium, high, urgent
   *    - estimated_hours: optional positive number
   *    - due_date: optional ISO 8601 datetime
   *    - erp_hrm_employee_id: optional UUID, must reference a project member if provided
   *    - parent_id: optional UUID, must reference a task in the same project, cannot create circular reference
   * 5. If erp_hrm_employee_id is provided, verify the employee is a member of the project; return 400 if not a project member.
   * 6. If parent_id is provided, verify the parent task exists in the same project and does not create circular nesting; return 400 if invalid.
   * 7. Update the task record with provided fields.
   * 8. If status changed, create an erp_hrm_task_histories entry recording the transition.
   * 9. Return the complete updated task entity with related project and assignee information.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":taskId")
  public async update(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTask.IUpdate,
  ): Promise<IErpHrmTask> {
    try {
      return await putErpHrmAdminProjectsProjectIdTasksTaskId({
        admin,
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
   * Permanently removes a task from its parent project.
   *
   * This operation permanently deletes the specified task and all associated task history records. The task must belong to the project identified by projectId. Only users with the project:manage permission or users who are project leads on the specified project can delete tasks.
   *
   * Deleting a task does not affect the project's timelogs or other tasks. However, all task history entries recording status transitions for this task are also permanently removed as part of the cascade delete.
   *
   * This operation cannot be undone. Consider archiving a task instead if you need to preserve the record while preventing further work on it.
   *
   * @param connection
   * @param projectId Unique identifier of the project containing the task (global scope)
   * @param taskId Unique identifier of the task to delete
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification 1. Validate user authorization: verify user has project:manage permission OR is a project lead on the specified project.
   * 2. Verify project exists and belongs to current organization.
   * 3. Verify task exists and its erp_hrm_project_id matches the provided projectId.
   * 4. Verify task is not protected by any immutable constraint.
   * 5. Delete the task record (cascade deletes erp_hrm_task_histories records).
   * 6. Return null response body on successful deletion.
   *
   * Error handling:
   * - 403 if user lacks authorization
   * - 404 if project does not exist
   * - 404 if task does not exist or does not belong to the specified project
   * - 500 on database or server errors
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":taskId")
  public async erase(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteErpHrmAdminProjectsProjectIdTasksTaskId({
        admin,
        projectId,
        taskId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve comprehensive analytics and statistics about tasks within a specific project.
   *
   * This endpoint provides aggregated metrics that help project leads and managers understand task distribution, progress, and workload within the project. The analytics include status breakdowns showing how many tasks are open, in-progress, completed, and closed, as well as priority distribution across low, medium, high, and urgent levels.
   *
   * The response includes completion metrics calculated from total versus completed tasks, average estimated hours for tasks with estimates, and overdue task counts based on due date comparison with current timestamp. Temporal trends show task creation patterns over the last 30 days.
   *
   * This operation requires the requesting user to have project:manage permission for the specified project, or be a member of the project. Users with organization-level project management permissions can access analytics for any project in their organization. The analytics data is scoped to the organization context.
   *
   * @param connection
   * @param projectId Unique identifier of the project to retrieve task analytics for (UUID format)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Query erp_hrm_projects table to verify project exists and user has access permission. Return 404 if project not found.
   *
   * Query erp_hrm_tasks table filtered by erp_hrm_project_id matching the path parameter.
   *
   * Execute the following aggregations:
   * 1. Status breakdown: COUNT tasks grouped by status field (open, in-progress, completed, closed)
   * 2. Priority breakdown: COUNT tasks grouped by priority field (low, medium, high, urgent)
   * 3. Completion rate: total_tasks > 0 ? (completed_tasks + closed_tasks) / total_tasks * 100 : 0
   * 4. Average estimated hours: AVG(estimated_hours) WHERE estimated_hours IS NOT NULL
   * 5. Overdue tasks: COUNT WHERE due_date < CURRENT_TIMESTAMP AND status NOT IN ('completed', 'closed')
   * 6. Temporal trend: COUNT tasks created in last 30 days, grouped by date
   *
   * Join with erp_hrm_employees table for assignee information if needed for detailed breakdowns.
   *
   * Apply organization context filtering via erp_hrm_projects.erp_hrm_organization_id matching the authenticated user's organization scope.
   *
   * Return computed analytics object with all aggregated metrics. Handle empty project (no tasks) by returning zero counts for all metrics.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get("analytics")
  public async analytics(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmTask> {
    try {
      return await getErpHrmAdminProjectsProjectIdTasksAnalytics({
        admin,
        projectId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
