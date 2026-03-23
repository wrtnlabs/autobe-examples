import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmPlatformTask } from "../../../../api/structures/IHrmPlatformTask";
import { IPageIHrmPlatformTask } from "../../../../api/structures/IPageIHrmPlatformTask";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteHrmPlatformMemberTasksTaskId } from "../../../../providers/deleteHrmPlatformMemberTasksTaskId";
import { getHrmPlatformMemberTasksTaskId } from "../../../../providers/getHrmPlatformMemberTasksTaskId";
import { patchHrmPlatformMemberTasks } from "../../../../providers/patchHrmPlatformMemberTasks";
import { putHrmPlatformMemberTasksTaskId } from "../../../../providers/putHrmPlatformMemberTasksTaskId";

@Controller("/hrmPlatform/member/tasks")
export class HrmplatformMemberTasksController {
  /**
   * Retrieve a filtered and paginated list of tasks from projects where the requesting employee is a member.
   *
   * This operation provides comprehensive task browsing capabilities with advanced filtering options. Employees can filter tasks by their workflow status (open, in-progress, completed, closed), priority level (low, medium, high, urgent), and assigned employee. The results can be sorted by due date, priority, or creation date to help teams organize their work effectively.
   *
   * Task visibility is restricted to projects where the requesting employee is assigned as a member. This ensures that employees only see work items relevant to their responsibilities. The operation returns task summaries optimized for list displays, including essential information such as title, status, priority, assigned employee, due date, and project context.
   *
   * Each task belongs to a project and may have an optional parent task for subtask relationships. Tasks support optional due dates for deadline tracking and estimated hours for effort planning. Status changes are automatically recorded in the task history for audit trail purposes, ensuring complete visibility into task progression from creation through completion.
   *
   * Related operations include GET /tasks/{taskId} for detailed task information, POST /tasks for creating new tasks, PUT /tasks/{taskId} for updating task properties, and GET /tasks/{taskId}/history for viewing the complete status change history.
   *
   * @param connection
   * @param body Search criteria, pagination parameters, and sorting options for task list
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query the hrm_platform_tasks table with pagination and filtering support.
   *
   * 1. Parse request body for filter criteria: status, priority, assigned_employee_id, search query, and pagination parameters (page, page_size, sort_by, sort_order).
   *
   * 2. Build base query joining hrm_platform_tasks with hrm_platform_projects to verify project membership.
   *
   * 3. Apply organization context filter - only return tasks from projects in the requesting employee's organization.
   *
   * 4. Apply project membership filter - join with hrm_platform_project_memberships to ensure the requesting employee is a member of each task's project.
   *
   * 5. Apply optional filters:
   *    - status: exact match against task.status field (values: open, in-progress, completed, closed)
   *    - priority: exact match against task.priority field (values: low, medium, high, urgent)
   *    - assigned_employee_id: exact match against task.assigned_employee_id (nullable)
   *    - search: partial text match on task.title using trigram similarity
   *
   * 6. Apply sorting based on sort_by parameter:
   *    - due_date: ORDER BY task.due_date (NULLS LAST for ascending, NULLS FIRST for descending)
   *    - priority: ORDER BY CASE task.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END
   *    - created_at: ORDER BY task.created_at
   *
   * 7. Apply pagination using cursor-based or offset-based approach based on page and page_size parameters.
   *
   * 8. Transform task records to IHrmPlatformTask.ISummary format, including:
   *    - id, title, status, priority, due_date, estimated_hours, created_at, updated_at
   *    - assigned_employee: { id, member_id } (or null if unassigned)
   *    - project: { id, name, color_code }
   *    - parent_task_id (or null if top-level task)
   *
   * 9. Return paginated response with IPageIHrmPlatformTask.ISummary structure containing pagination metadata and data array.
   *
   * 10. Handle edge cases:
   *     - Empty results: return empty data array with pagination metadata
   *     - Invalid filter values: reject request with validation error
   *     - Invalid sort_by: default to created_at descending
   *     - Unauthorized access: return 403 if employee not member of any projects
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IHrmPlatformTask.IRequest,
  ): Promise<IPageIHrmPlatformTask.ISummary> {
    try {
      return await patchHrmPlatformMemberTasks({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information about a specific task by its unique identifier.
   *
   * This operation returns the complete task record including all properties such as title, description, status, priority, due date, estimated hours, and assignment information. The task details include references to the parent project, assigned employee (if any), parent task (if this is a subtask), and the member who created the task.
   *
   * Access to task details is controlled by project membership. Employees can only view tasks within projects where they are assigned as members. Project leads and users with project management permissions can view all tasks within their assigned projects. This ensures that sensitive project information remains accessible only to authorized team members.
   *
   * The task status field indicates the current workflow state (open, in-progress, completed, or closed), and the priority field shows the urgency classification (low, medium, high, or urgent). Optional fields such as description, due date, and estimated hours may be null if not specified when the task was created or updated.
   *
   * @param connection
   * @param taskId Unique identifier of the task to retrieve
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query the hrm_platform_tasks table for a single task record matching the provided taskId UUID.
   *
   * 1. Validate that the taskId is a valid UUID format
   * 2. Query hrm_platform_tasks WHERE id = taskId AND deleted_at IS NULL
   * 3. If no record found, return 404 Not Found
   * 4. Verify the requesting employee has access to the task's project through project membership
   * 5. Return the complete task record with all fields
   * 6. Include related data through joins:
   *    - Project information (project_id)
   *    - Assigned employee details (assigned_employee_id, if not null)
   *    - Parent task reference (parent_task_id, if not null)
   *    - Creator member information (created_by_member_id)
   * 7. Ensure soft-deleted tasks (deleted_at IS NOT NULL) are excluded from results
   * 8. Return 403 Forbidden if the user lacks project membership access
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":taskId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
  ): Promise<IHrmPlatformTask> {
    try {
      return await getHrmPlatformMemberTasksTaskId({
        member,
        taskId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing task within a project with modified properties and attributes.
   *
   * This operation allows project leads and users with project management permissions to modify task details including title, description, status, priority, due date, estimated hours, employee assignment, and parent task relationship. The task must belong to a project where the authenticated user has appropriate authorization.
   *
   * When updating the task status, the system automatically creates a history entry in the task history audit trail, recording the previous status, new status, timestamp, and the member who made the change. This ensures complete visibility into task progression and supports accountability for workflow changes.
   *
   * Task assignment validation ensures that only employees who are active members of the project can be assigned to tasks. Parent task relationships enforce the one-level subtask hierarchy constraint, preventing subtasks from having their own subtasks.
   *
   * All updates are partial - only provided fields are modified while unchanged fields retain their existing values. The updated_at timestamp is automatically refreshed on each modification.
   *
   * @param connection
   * @param taskId Unique identifier of the task to update
   * @param body Task update data with optional fields to modify
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Update an existing task in the hrm_platform_tasks table.
   *
   * Authorization:
   * - Verify authenticated member has access to the task's project
   * - Check member has project-lead role in the project OR has project management permission
   * - Deny access if member is not a project member or lacks required permissions
   *
   * Validation:
   * - Task must exist and not be soft-deleted
   * - If title is provided, validate non-empty string
   * - If status is provided, validate against allowed values: open, in-progress, completed, closed
   * - If priority is provided, validate against allowed values: low, medium, high, urgent
   * - If assigned_employee_id is provided:
   *   - Verify employee exists and is not soft-deleted
   *   - Verify employee is a member of the task's project (check hrm_platform_project_memberships)
   *   - Verify employee status is 'active'
   * - If parent_task_id is provided:
   *   - Verify parent task exists and belongs to same project
   *   - Verify parent task is not a subtask itself (parent_task_id must be null)
   *   - Prevent circular references
   * - If due_date is provided, validate as valid DateTime
   * - If estimated_hours is provided, validate as non-negative number
   *
   * Status Change Handling:
   * - If status field is being modified:
   *   - Begin database transaction
   *   - Record old_status before update
   *   - Update task status
   *   - Create new hrm_platform_task_histories entry with:
   *     - hrm_platform_task_id: current task ID
   *     - hrm_platform_member_id: authenticated member ID
   *     - old_status: previous status value
   *     - new_status: new status value
   *     - created_at: current timestamp
   *   - Commit transaction
   *   - If history creation fails, rollback entire operation
   *
   * Field Updates:
   * - Update only provided fields (partial update semantics)
   * - Set updated_at to current timestamp
   * - Preserve unchanged fields
   * - If field is explicitly set to null, update database to null
   *
   * Response:
   * - Return complete task object with all fields
   * - Include assigned employee details if assigned
   * - Include parent task reference if subtask
   * - Do not include taskHistories array (use separate endpoint)
   * - Do not include subtasks array (use separate endpoint)
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":taskId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmPlatformTask.IUpdate,
  ): Promise<IHrmPlatformTask> {
    try {
      return await putHrmPlatformMemberTasksTaskId({
        member,
        taskId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Soft delete a task by marking it as deleted while preserving the record for audit purposes.
   *
   * This operation permanently removes a task from active work by setting its deleted_at timestamp. The task record and all associated history entries are preserved in the database but excluded from active task queries. This soft delete approach maintains complete audit trails of task lifecycle changes while preventing the task from appearing in active project work.
   *
   * The authenticated member must have task management permissions within the organization that owns the task. The system validates that the task belongs to the member's organization through the project relationship chain.
   *
   * Related operations include PATCH /tasks for listing active tasks (which excludes soft-deleted tasks), GET /tasks/{taskId} for viewing task details, and PUT /tasks/{taskId} for updating task properties. Task history entries created during the task's lifecycle remain accessible through GET /tasks/{taskId}/histories even after soft deletion.
   *
   * Once soft deleted, tasks cannot be restored through this API. Permanent removal from the database only occurs during organization deletion, which cascades to all associated tasks.
   *
   * @param connection
   * @param taskId Unique identifier of the task to soft delete
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Soft delete the task by setting deleted_at to current timestamp.
   *
   * 1. Validate authentication and organization context from request.
   * 2. Verify the authenticated member has task management permission in the organization.
   * 3. Query the task by taskId from hrm_platform_tasks table.
   * 4. Verify the task belongs to the authenticated member's organization (via project relationship).
   * 5. Check if task is already soft deleted - return error if so.
   * 6. Set deleted_at field to current UTC timestamp.
   * 7. Save the updated task record.
   * 8. Create an activity log entry recording the deletion action.
   * 9. Return the updated task entity with deleted_at timestamp.
   *
   * Important: Task histories (hrm_platform_task_histories) are preserved during soft delete. The cascade delete on the foreign key only triggers on hard delete (physical removal from database), not on soft delete (setting deleted_at).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":taskId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmPlatformMemberTasksTaskId({
        member,
        taskId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
