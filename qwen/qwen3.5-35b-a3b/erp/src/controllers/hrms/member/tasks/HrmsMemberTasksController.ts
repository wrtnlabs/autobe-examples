import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmsTask } from "../../../../api/structures/IHrmsTask";
import { IPageIHrmsTask } from "../../../../api/structures/IPageIHrmsTask";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteHrmsMemberTasksTaskId } from "../../../../providers/deleteHrmsMemberTasksTaskId";
import { getHrmsMemberTasksTaskId } from "../../../../providers/getHrmsMemberTasksTaskId";
import { patchHrmsMemberTasks } from "../../../../providers/patchHrmsMemberTasks";
import { putHrmsMemberTasksTaskId } from "../../../../providers/putHrmsMemberTasksTaskId";

@Controller("/hrms/member/tasks")
export class HrmsMemberTasksController {
  /**
   * Retrieve a filtered and paginated list of tasks within the current organization's context.
   *
   * This operation provides comprehensive search capabilities for browsing tasks across all projects in your organization. You can filter tasks by project assignment, employee assignment, status, priority, date ranges, and billable status. The results support sorting by multiple fields including title, due date, priority, and creation date.
   *
   * Pagination is cursor-based for efficient handling of large result sets. Each task returned includes essential information: task identifier, project reference, assigned employee, status, priority, estimated hours, and due date. Full task details can be retrieved using the task ID via the GET /hrms/member/tasks/:taskId endpoint.
   *
   * Authorization requires membership in the organization with appropriate permissions to view tasks. By default, all organization members can view tasks in their assigned projects and tasks assigned to them. Users with project management permissions can view all tasks within their managed projects.
   *
   * @param connection
   * @param body Search criteria and pagination parameters for filtering and sorting tasks
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query the hrms_tasks table with the following implementation details:
   *
   * 1. Organization Context Extraction:
   *    - Extract organization_id from the authenticated user's session
   *    - Verify user is a member of this organization via hrms_organization_members
   *    - Return 404 if user has no organization membership
   *
   * 2. Filtering Logic (all optional):
   *    - projectId: Filter tasks belonging to specific project(s)
   *    - employeeId: Filter tasks assigned to specific employee(s)
   *    - status: Filter by single status or array of statuses (open, in-progress, completed, closed)
   *    - priority: Filter by single priority or array of priorities (low, medium, high, urgent)
   *    - billable: Filter by billable flag (true/false)
   *    - dueDateRange: Object with 'gte' and/or 'lte' date filters
   *    - createdDateRange: Object with 'gte' and/or 'lte' date filters
   *    - search: Full-text search on task title and description using GIN indexes
   *    - includeSubtasks: Boolean to include child tasks (default false)
   *    - excludeSubtasks: Boolean to exclude tasks with parent_task_id
   *    - onlyUnassigned: Boolean to return only tasks without employee assignment
   *
   * 3. Sorting Logic:
   *    - sortBy: Supported fields are title, status, priority, estimated_hours, due_date, created_at, updated_at
   *    - sortOrder: 'asc' or 'desc' (default: 'desc' for date fields, 'asc' for others)
   *    - Multi-field sorting: Sort by priority first, then due_date
   *
   * 4. Pagination Logic:
   *    - page: Current page number (1-based, default: 1)
   *    - pageSize: Number of results per page (default: 20, max: 100)
   *    - Calculate total count for pagination metadata
   *    - Apply OFFSET and LIMIT to query results
   *
   * 5. Join Requirements:
   *    - LEFT JOIN hrms_projects to get project name and status for filtering
   *    - LEFT JOIN hrms_employees to get employee display_name for filtering
   *    - Exclude soft-deleted tasks (deleted_at IS NULL)
   *
   * 6. Permissions Check:
   *    - User must be organization member
   *    - Standard members can see:
   *      * Tasks in projects they are members of
   *      * Tasks assigned to them (hrms_employee_id matches)
   *    - Users with project:manage permission can see all tasks in managed projects
   *    - Organization owners can see all organization tasks
   *
   * 7. Response Structure:
   *    - data: Array of IHrmsTask.ISummary objects
   *    - pagination: { page, pageSize, totalItems, totalPages, hasNextPage, hasPrevPage }
   *
   * 8. Edge Cases:
   *    - No matching results: Return empty data array with pagination metadata
   *    - Invalid filter values: Return 400 Bad Request with field-specific error
   *    - Invalid sortBy field: Return 400 with valid sort fields list
   *    - pageSize exceeding limit: Cap at 100 or return 400
   *
   * 9. Performance Considerations:
   *    - Use compound index on (hrms_project_id, status) for common filter combinations
   *    - Use GIN indexes on title and description for search operations
   *    - Limit joined data to required fields only
   *    - Consider caching frequently accessed filter combinations
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IHrmsTask.IRequest,
  ): Promise<IPageIHrmsTask.ISummary> {
    try {
      return await patchHrmsMemberTasks({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a specific task from the project management system by its unique identifier.
   *
   * This operation returns complete details about a single task including its title, description, status, priority level, estimated hours, due date, and billable flag. The task belongs to a project and may be assigned to an employee who is a member of that project.
   *
   * Users can only access tasks from projects they are assigned to or have project:view permission for. The system validates organization context and user permissions before returning the task data.
   *
   * The task status reflects the current state in the lifecycle workflow: open, in-progress, completed, or closed. Priority indicates urgency level: low, medium, high, or urgent. The billable flag determines whether tracked time on this task can be billed to a client.
   *
   * Related operations:
   * - GET /organizations/{organizationId}/tasks - List all tasks in a project with filters
   * - GET /organizations/{organizationId}/tasks/{taskId}/history - View status change history
   * - PUT /organizations/{organizationId}/tasks/{taskId} - Modify task details
   *
   * @param connection
   * @param taskId The unique identifier of the task to retrieve
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query the hrms_tasks table for a single record matching the provided taskId (UUID format).
   *
   * Implementation steps:
   * 1. Extract organization context from the authenticated user's session
   * 2. Validate the taskId is a valid UUID format
   * 3. Retrieve the task record where id = taskId
   * 4. Verify the task is not soft-deleted (deleted_at is null)
   * 5. Check user authorization:
   *    - User must belong to the organization that owns the task's project
   *    - Verify user has project:view permission for the task's project OR
   *    - Verify user is assigned to the task AND is a project member
   *    - If task is assigned to another employee, verify that employee's project membership
   * 6. Join with hrms_projects to get project details if needed
   * 7. Join with hrms_employees to get assigned employee display name if hrms_employee_id is present
   * 8. Return the complete task object with all fields
   * 9. Return 404 Not Found if task does not exist or is soft-deleted
   * 10. Return 403 Forbidden if user lacks permission to view the task
   *
   * Edge cases:
   * - Task has been soft-deleted: Return 404
   * - Task belongs to different organization: Return 404
   * - User is not a member of the task's project: Return 403
   * - Task assigned employee left the organization: Return task with null assignedEmployee details
   *
   * Data validation:
   * - Ensure all DateTime fields are serialized consistently (ISO 8601)
   * - Ensure Float values for estimated_hours are properly formatted
   * - Ensure relationship references (project, assignedEmployee) are populated with minimal data for list views
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":taskId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
  ): Promise<IHrmsTask> {
    try {
      return await getHrmsMemberTasksTaskId({
        member,
        taskId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing task's details including title, description, status, priority, estimated hours, due date, billable flag, and assigned employee.
   *
   * This operation allows project leads and users with project management permission to modify all task attributes. The task must exist and belong to a project where the requesting user has update permissions.
   *
   * When updating the status field, the system automatically records the status change in the task history, including the timestamp, previous status, new status, and the user who made the change. Only status values 'open', 'in-progress', 'completed', or 'closed' are accepted.
   *
   * The assigned employee can be changed to any employee who is a member of the task's project. If the employee is removed (set to null), the task becomes unassigned but remains in the system.
   *
   * Estimated hours and due date are optional fields that can be updated independently. The billable flag indicates whether time tracked against this task can be billed to a client.
   *
   * All updates are immediately persisted to the database. The task's updated_at timestamp is automatically set to the current time.
   *
   * @param connection
   * @param taskId The unique identifier of the task to update
   * @param body Task update data containing any fields to be modified
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Validate task exists by querying hrms_tasks table WHERE id = taskId
   * 2. Verify task is not soft-deleted (deleted_at IS NULL)
   * 3. Fetch task's project to validate user permissions
   * 4. Check user has project:manage permission OR is project lead
   * 5. Validate assigned employee (if provided) is a member of the project
   * 6. Validate status is one of: open, in-progress, completed, closed
   * 7. Validate priority is one of: low, medium, high, urgent
   * 8. Update task fields from request body using UPDATE hrms_tasks SET ...
   * 9. If status changed, insert record into hrms_task_status_histories
   * 10. Update updated_at to CURRENT_TIMESTAMP
   * 11. Return updated task with all fields
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":taskId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmsTask.IUpdate,
  ): Promise<IHrmsTask> {
    try {
      return await putHrmsMemberTasksTaskId({
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
   * Soft delete a task by marking it as deleted.
   *
   * This operation removes a task identified by its unique task identifier from active task lists by marking it as deleted. The task record is preserved in the database with a soft delete timestamp, allowing historical data to remain accessible while removing the task from active workflows.
   *
   * Access Control: Only project leads have the authority to delete tasks within their assigned projects. Regular project members cannot delete tasks, even those they were assigned to. This restriction enforces the project lead's exclusive task management authority as defined in the project management workflow.
   *
   * Soft Delete Behavior: When a task is soft deleted, its status is not changed to 'closed' or 'completed'. Instead, a deletion timestamp is recorded. The task remains queryable for historical reporting purposes but will not appear in active task listings. All associated timelogs remain intact with their task references preserved.
   *
   * Task Status History: The task's status history records in hrms_task_status_histories are also soft deleted (marked with deleted_at), maintaining complete audit trails while removing them from active views.
   *
   * Activity Logging: The deletion operation is logged in the organization's activity log, recording the timestamp, the user who performed the deletion, and the deleted task's identifier and title.
   *
   * @param connection
   * @param taskId The unique identifier of the task to delete
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Validate taskId parameter format (UUID string)
   * 2. Query the task entity to retrieve task details including projectId
   * 3. Verify the task exists in the system
   * 4. Retrieve the project to get organization context
   * 5. Check if the requesting user is a project member of this project
   * 6. Verify the user has 'project:lead' role/permission for this project
   * 7. If user is not a project lead, return 403 Forbidden with authorization error
   * 8. Delete the task record from hrms_tasks table
   * 9. Update any associated timelogs to set taskId to null (or handle according to task-timelog relationship)
   * 10. Delete task status history records for this task from hrms_task_status_histories
   * 11. Log the deletion in hrms_activity_logs with: action='task_deleted', userId, organizationId, taskId, taskTitle, timestamp
   * 12. Return 204 No Content on successful deletion
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
      return await deleteHrmsMemberTasksTaskId({
        member,
        taskId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
