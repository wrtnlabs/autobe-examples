import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IHrmPlatformTask } from "../../../../../structures/IHrmPlatformTask";
import { IPageIHrmPlatformTask } from "../../../../../structures/IPageIHrmPlatformTask";

export * as histories from "./histories/index";
export * as status from "./status/index";

/**
 * Create a new task within a specified project.
 *
 * This operation allows project leads and users with project:manage permission to create work items (tasks) within their assigned projects. Tasks represent individual work units that can be tracked, assigned to employees, and organized in a one-level hierarchical structure with parent-child relationships.
 *
 * The task creation requires a title field which serves as the primary identifier for the work item. Optional fields include description for detailed task specifications, status for workflow tracking, priority for urgency classification, estimated hours for capacity planning, due date for timeline management, assigned employee for task ownership, and parent task for subtask organization.
 *
 * Authorization is restricted to project leads (employees with 'project-lead' role in the project membership) and users with project:manage permission across the organization. The assigned employee, if specified, must be a member of the same project. The parent task, if specified, must belong to the same project to maintain hierarchical consistency.
 *
 * Upon successful creation, the task is assigned a unique UUID identifier and initialized with creation timestamps. The task status defaults to 'open' if not explicitly provided, and priority defaults to 'medium'. Task creation is immediately visible to all project members and triggers real-time events for connected clients.
 *
 * Related operations include GET /projects/{projectId}/tasks for retrieving the task list, GET /projects/{projectId}/tasks/{taskId} for viewing task details, and PUT /projects/{projectId}/tasks/{taskId} for modifying existing tasks.
 *
 * @param props.connection
 * @param props.projectId Target project's UUID identifier
 * @param props.body Task creation information including title, description, status, priority, estimated hours, due date, assigned employee, and optional parent task for subtask hierarchy
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement task creation with the following logic:
 *
 * 1. Authorization check:
 *    - Verify member actor is authenticated
 *    - Validate projectId exists and belongs to user's selected organization
 *    - Check if user is project lead (hrm_platform_project_members.role = 'project-lead') OR has project:manage permission
 *    - Return 403 Forbidden if unauthorized
 *
 * 2. Validate project status:
 *    - Fetch project from hrm_platform_projects
 *    - Verify project is not soft-deleted (deleted_at IS NULL)
 *    - Return 404 Not Found if project doesn't exist
 *
 * 3. Validate request body:
 *    - title is required, must be non-empty string (min 1 char, max 255 chars)
 *    - status must be one of: 'open', 'in-progress', 'completed', 'closed'
 *    - priority must be one of: 'low', 'medium', 'high', 'urgent'
 *    - estimated_hours must be positive number if provided
 *    - due_date must be valid ISO datetime if provided
 *
 * 4. Validate optional references:
 *    - If assignedEmployeeId provided: verify employee exists in hrm_platform_employees, is not soft-deleted, and is a project member (exists in hrm_platform_project_members for this project)
 *    - If parentTaskId provided: verify parent task exists, is not soft-deleted, belongs to same project, and is not itself a child task (enforce one-level nesting)
 *
 * 5. Create task record:
 *    - Generate UUID for id
 *    - Set hrm_platform_projects_id to projectId
 *    - Set hrm_platform_tasks_id to parentTaskId (null if not provided)
 *    - Set hrm_platform_employees_id to assignedEmployeeId (null if not provided)
 *    - Set title, description, status (default 'open'), priority (default 'medium'), estimated_hours, due_date
 *    - Set created_at and updated_at to current timestamp
 *    - Insert into hrm_platform_tasks table
 *
 * 6. Create task history record:
 *    - Insert initial status change record into hrm_platform_task_histories
 *    - Record: actor = current user, old_status = null, new_status = 'open', timestamp = now
 *
 * 7. Return created task with all fields including timestamps
 *
 * 8. Error handling:
 *    - 400 Bad Request: validation errors, invalid references
 *    - 403 Forbidden: insufficient permissions
 *    - 404 Not Found: project or referenced entities don't exist
 *    - 409 Conflict: parent task is already a child (enforce one-level nesting)
 *    - 500 Internal Server Error: database errors
 * @path /hrmPlatform/member/projects/:projectId/tasks
 * @accessor api.functional.hrmPlatform.member.projects.tasks.create
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
          path: create.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Target project's UUID identifier
     */
    projectId: string & tags.Format<"uuid">;

    /**
     * Task creation information including title, description, status, priority, estimated hours, due date, assigned employee, and optional parent task for subtask hierarchy
     */
    body: IHrmPlatformTask.ICreate;
  };
  export type Body = IHrmPlatformTask.ICreate;
  export type Response = IHrmPlatformTask;

  export const METADATA = {
    method: "POST",
    path: "/hrmPlatform/member/projects/:projectId/tasks",
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
    `/hrmPlatform/member/projects/${encodeURIComponent(props.projectId ?? "null")}/tasks`;
  export const random = (): IHrmPlatformTask =>
    typia.random<IHrmPlatformTask>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("projectId")(() => typia.assert(props.projectId));
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
 * Retrieve a filtered and paginated list of tasks within a specific project.
 *
 * This operation provides advanced search capabilities for tasks belonging to the specified project. Employees can only view tasks from projects to which they are assigned, enforced through the hrm_platform_project_members junction table. Project leads and users with project:manage permission have full access to all tasks within their authorized projects.
 *
 * The endpoint supports comprehensive filtering by task status (open, in-progress, completed, closed), priority levels (low, medium, high, urgent), and assigned employee. Results can be sorted by due date, priority, or creation date in ascending or descending order. Pagination is implemented with configurable page size and cursor-based navigation for efficient handling of large task collections.
 *
 * Task summaries include essential information: title, status, priority, assigned employee details, estimated hours, due date, and creation timestamp. Full task details can be retrieved using the GET /projects/{projectId}/tasks/{taskId} endpoint. Task history with status change records is accessible through the GET /projects/{projectId}/tasks/{taskId}/history endpoint.
 *
 * The operation enforces strict data isolation based on project membership. Users without membership in the specified project will receive a 403 Forbidden response. Soft-deleted tasks (where deleted_at is not null) are excluded from results unless explicitly requested by administrators with appropriate permissions.
 *
 * @param props.connection
 * @param props.projectId Target project's unique identifier (UUID format). The user must be a member of this project to access its tasks.
 * @param props.body Search criteria, filters, and pagination parameters for task list retrieval
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Query hrm_platform_tasks table filtered by hrm_platform_projects_id matching the projectId path parameter. Join with hrm_platform_project_members to verify user's project membership before returning results. Apply soft-delete filter to exclude tasks where deleted_at is not null.
 *
 * Implement filtering logic based on request body criteria: status IN (open, in-progress, completed, closed), priority IN (low, medium, high, urgent), hrm_platform_employees_id matching assigned employee UUID. Support multiple filter combinations with AND logic.
 *
 * Apply sorting based on request parameters: due_date, priority, or created_at with ASC/DESC direction. Default sort is created_at DESC.
 *
 * Implement cursor-based pagination using created_at and id as composite cursor for consistent ordering across pages. Page size defaults to 20, maximum 100.
 *
 * Authorization check: Verify current user has membership in the project via hrm_platform_project_members table. Allow access if user is project-lead, member, or has project:manage permission at organization level.
 *
 * Return paginated response with IPageIHrmPlatformTask.ISummary schema containing data array and pagination metadata (cursor, hasMore, totalCount).
 * @path /hrmPlatform/member/projects/:projectId/tasks
 * @accessor api.functional.hrmPlatform.member.projects.tasks.index
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
          path: index.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Target project's unique identifier (UUID format). The user must be a member of this project to access its tasks.
     */
    projectId: string & tags.Format<"uuid">;

    /**
     * Search criteria, filters, and pagination parameters for task list retrieval
     */
    body: IHrmPlatformTask.IRequest;
  };
  export type Body = IHrmPlatformTask.IRequest;
  export type Response = IPageIHrmPlatformTask.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/hrmPlatform/member/projects/:projectId/tasks",
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
    `/hrmPlatform/member/projects/${encodeURIComponent(props.projectId ?? "null")}/tasks`;
  export const random = (): IPageIHrmPlatformTask.ISummary =>
    typia.random<IPageIHrmPlatformTask.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("projectId")(() => typia.assert(props.projectId));
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
 * Retrieve detailed information about a specific task within a project context.
 *
 * This operation returns complete task details including the task title, description, current status, priority level, estimated hours, due date, and employee assignment information. The task must belong to the specified project, and the requesting member must have project membership to access the task details.
 *
 * Members can view tasks with any status including open, in-progress, completed, and closed as defined in the hrm_platform_tasks table. The response includes all task metadata such as creation timestamp (created_at), last update timestamp (updated_at), and hierarchical information if the task is a subtask with a parent task relationship.
 *
 * Project leads have full visibility into all tasks within their assigned projects and can view task details for monitoring and management purposes. Users with project:manage permission can also access task details across any project regardless of their project-lead assignment within hrm_platform_project_members.
 *
 * The task is scoped to the project context through the hrm_platform_projects_id foreign key relationship. Tasks cannot exist outside of a project and are cascade-deleted when their parent project is deleted. Soft deletion is supported via the deleted_at field, allowing tasks to be marked as deleted while preserving historical data for audit purposes in the hrm_platform_tasks table.
 *
 * @param props.connection
 * @param props.projectId Target project's unique identifier (UUID scope)
 * @param props.taskId Target task's unique identifier (UUID scope)
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Query hrm_platform_tasks table by taskId with project context validation.
 *
 * 1. Validate projectId exists in hrm_platform_projects and belongs to requesting user's organization
 * 2. Validate taskId exists and belongs to the specified projectId (enforce project-task relationship)
 * 3. Verify requesting member has access to the project (exists in hrm_platform_project_members for this project)
 * 4. Join with hrm_platform_employees to fetch assigned employee details if hrm_platform_employees_id is set
 * 5. Join with hrm_platform_tasks (self-join) to fetch parent task details if hrm_platform_tasks_id is set
 * 6. Return full task object with embedded employee and parent task information
 * 7. Handle soft deletion: return 404 if task.deleted_at is not null
 * 8. Enforce organization isolation through project's hrm_platform_organization_id
 * @path /hrmPlatform/member/projects/:projectId/tasks/:taskId
 * @accessor api.functional.hrmPlatform.member.projects.tasks.at
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
     * Target project's unique identifier (UUID scope)
     */
    projectId: string & tags.Format<"uuid">;

    /**
     * Target task's unique identifier (UUID scope)
     */
    taskId: string & tags.Format<"uuid">;
  };
  export type Response = IHrmPlatformTask;

  export const METADATA = {
    method: "GET",
    path: "/hrmPlatform/member/projects/:projectId/tasks/:taskId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/hrmPlatform/member/projects/${encodeURIComponent(props.projectId ?? "null")}/tasks/${encodeURIComponent(props.taskId ?? "null")}`;
  export const random = (): IHrmPlatformTask =>
    typia.random<IHrmPlatformTask>();
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
      assert.param("projectId")(() => typia.assert(props.projectId));
      assert.param("taskId")(() => typia.assert(props.taskId));
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
 * Update an existing task within a project with modified task attributes.
 *
 * This operation allows project leads and users with project:manage permission to update task properties including description, estimated hours, due date, assigned employee, priority, status, and parent task relationship. The task title cannot be modified once created and will be excluded from update operations.
 *
 * Authorization requires the authenticated employee to be either a project lead within the target project or possess the project:manage permission at the organization level. The employee must verify that any assigned employee is a member of the same project before assignment. Parent task relationships must reference tasks within the same project to maintain hierarchical integrity.
 *
 * Status changes are automatically recorded in the task history audit trail through hrm_platform_task_histories, capturing the timestamp, previous status, new status, and the employee who performed the change. This provides complete auditability for task workflow transitions.
 *
 * Related operations include GET /projects/{projectId}/tasks/{taskId} for retrieving current task details and PATCH /projects/{projectId}/tasks for listing tasks with filtering capabilities. Task deletion is handled through DELETE /projects/{projectId}/tasks/{taskId} endpoint.
 *
 * @param props.connection
 * @param props.projectId Target project's UUID identifier
 * @param props.taskId Target task's UUID identifier
 * @param props.body Task update payload with modifiable fields. Title field is excluded as it is immutable after creation.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Query hrm_platform_tasks table by taskId and verify hrm_platform_projects_id matches projectId. Validate project belongs to current organization context from member session. Check authorization: verify authenticated employee is project lead in project or has project:manage permission. Load IHrmPlatformTask.IUpdate request body and validate title is not present (immutable field). For assigned employee: verify hrm_platform_employees_id references a valid employee who is a member of the project via hrm_platform_project_members junction table. For parent task: verify hrm_platform_tasks_id references a task within the same project if provided. Update allowed fields: description, status, priority, estimated_hours, due_date, hrm_platform_employees_id, hrm_platform_tasks_id. Record status change in hrm_platform_task_histories if status field changed: insert record with timestamp, old status, new status, and employee ID. Return updated task as IHrmPlatformTask. Handle errors: 404 if project or task not found, 403 if unauthorized, 400 if title included or invalid employee/project membership, 409 if parent task not in same project.
 * @path /hrmPlatform/member/projects/:projectId/tasks/:taskId
 * @accessor api.functional.hrmPlatform.member.projects.tasks.update
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
     * Target project's UUID identifier
     */
    projectId: string & tags.Format<"uuid">;

    /**
     * Target task's UUID identifier
     */
    taskId: string & tags.Format<"uuid">;

    /**
     * Task update payload with modifiable fields. Title field is excluded as it is immutable after creation.
     */
    body: IHrmPlatformTask.IUpdate;
  };
  export type Body = IHrmPlatformTask.IUpdate;
  export type Response = IHrmPlatformTask;

  export const METADATA = {
    method: "PUT",
    path: "/hrmPlatform/member/projects/:projectId/tasks/:taskId",
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
    `/hrmPlatform/member/projects/${encodeURIComponent(props.projectId ?? "null")}/tasks/${encodeURIComponent(props.taskId ?? "null")}`;
  export const random = (): IHrmPlatformTask =>
    typia.random<IHrmPlatformTask>();
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
      assert.param("projectId")(() => typia.assert(props.projectId));
      assert.param("taskId")(() => typia.assert(props.taskId));
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
 * Permanently remove a task from a project.
 *
 * This operation deletes a specific task identified by its UUID from the parent project. The task must exist within the specified project, and the requesting user must have sufficient permissions to perform this action.
 *
 * **Authorization Requirements:**
 *
 * Only users with project lead role for the project or users with project:manage permission can delete tasks. Project leads have task management rights within their assigned projects, including creating, editing, and deleting tasks. Users with project:manage permission have broader oversight capabilities across all projects in the organization.
 *
 * **Deletion Behavior:**
 *
 * When a task is deleted, it is permanently removed from the database. Any timelogs associated with this task are preserved and remain linked to the project, as timelogs must be maintained for historical records and timesheet integrity. The task deletion does not cascade to timelogs or timesheets.
 *
 * **Validation Rules:**
 *
 * The system verifies that the task exists within the specified project before deletion. The projectId path parameter must correspond to an active project in the requesting user's organization context. The taskId must match an existing task that belongs to that project. Soft deletion is not performed; this is a permanent deletion operation.
 *
 * **Related Operations:**
 *
 * Before deleting a task, users may want to review the task details using GET /projects/{projectId}/tasks/{taskId} to confirm the correct task is being removed. Users can view all tasks in a project using PATCH /projects/{projectId}/tasks to browse the complete task list.
 *
 * @param props.connection
 * @param props.projectId UUID of the parent project containing the task (global scope)
 * @param props.taskId UUID of the task to delete (scoped to project)
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1. Extract projectId and taskId from path parameters (both UUID format).
 * 2. Validate user authentication and organization context from member session.
 * 3. Verify user has project lead role for the project OR project:manage permission.
 * 4. Query hrm_platform_tasks table WHERE id = taskId AND hrm_platform_projects_id = projectId.
 * 5. If task not found, return 404 Not Found error.
 * 6. Verify task belongs to user's organization via project's hrm_platform_organization_id.
 * 7. Execute DELETE on hrm_platform_tasks WHERE id = taskId.
 * 8. Preserve associated timelogs (they reference task_id but are not deleted).
 * 9. Return 204 No Success response on successful deletion.
 * 10. Log activity event for task deletion with actor and timestamp.
 *
 * Edge cases:
 * - Task does not exist: 404 error
 * - Task belongs to different project: 404 error
 * - User lacks permission: 403 Forbidden
 * - Project does not exist: 404 error
 * - Project belongs to different organization: 403 Forbidden
 * @path /hrmPlatform/member/projects/:projectId/tasks/:taskId
 * @accessor api.functional.hrmPlatform.member.projects.tasks.erase
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
     * UUID of the parent project containing the task (global scope)
     */
    projectId: string & tags.Format<"uuid">;

    /**
     * UUID of the task to delete (scoped to project)
     */
    taskId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/hrmPlatform/member/projects/:projectId/tasks/:taskId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/hrmPlatform/member/projects/${encodeURIComponent(props.projectId ?? "null")}/tasks/${encodeURIComponent(props.taskId ?? "null")}`;
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
      assert.param("projectId")(() => typia.assert(props.projectId));
      assert.param("taskId")(() => typia.assert(props.taskId));
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
