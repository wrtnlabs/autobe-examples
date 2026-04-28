import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IErpHrmTask } from "../../../../../structures/IErpHrmTask";
import { IPageIErpHrmTask } from "../../../../../structures/IPageIErpHrmTask";

export * as histories from "./histories/index";

/**
 * Create a new task within a specified project.
 *
 * This operation creates a task record in the `erp_hrm_tasks` table, associating it with the target project identified by `projectId`. A task is a discrete unit of work belonging to exactly one project, carrying a required title, a status (`open`, `in-progress`, `completed`, `closed`), and a priority (`low`, `medium`, `high`, `urgent`). The task defaults to `open` status and `medium` priority unless explicitly specified at creation time.
 *
 * Authorization is strictly enforced: only an authenticated member who holds the `project:manage` organization-level permission OR who is a project lead (project_role = `project-lead`) of the target project may create tasks within that project. Regular project members (`project-lead` role not assigned) are not permitted to create tasks. Members who are not part of the project at all cannot create tasks regardless of organization role.
 *
 * The optional `assignee_id` field, when provided, must reference an organization member who is currently an active project member of this same project. The service layer must verify membership in `erp_hrm_project_members` (non-deleted) before accepting the assignment. Assigning to a non-member of the project is rejected.
 *
 * Tasks support a one-level subtask hierarchy. When `parent_id` is provided, the referenced task must belong to the same project and must itself be a top-level task (i.e., it must not already have its own parent). A task that is already a subtask cannot be designated as a parent — only one level of nesting is permitted. Top-level tasks have `parent_id` set to null.
 *
 * Every subsequent status change on the created task will automatically generate an immutable audit record in `erp_hrm_task_histories`, capturing the old status, new status, timestamp, and the performing member.
 *
 * Related operations: `PATCH /erpHrm/member/projects/{projectId}/tasks` to list and filter tasks within the project; `GET /erpHrm/member/projects/{projectId}/tasks/{taskId}` to retrieve a specific task's detail; `PUT /erpHrm/member/projects/{projectId}/tasks/{taskId}` to update an existing task; `DELETE /erpHrm/member/projects/{projectId}/tasks/{taskId}` to remove a task.
 *
 * @param props.connection
 * @param props.projectId The UUID of the project within which the new task will be created.
 * @param props.body Creation payload for a new task, including title, status, priority, optional assignee, optional parent task reference, and planning metadata.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1. Authenticate the calling member and resolve their
 *   organization_member record scoped to the organization that owns the target
 *   project.
 *
 * 2. Look up the project by `projectId` in `erp_hrm_projects` where `deleted_at IS NULL`. Return 404 if not found or if the project does not belong to the caller's current organization.
 *
 * 3. Authorization check — the caller must satisfy at least one of:
 *    a. Their organization role has the `project:manage` permission (check `erp_hrm_role_permissions`).
 *    b. They have a non-deleted `erp_hrm_project_members` record for this project with `project_role = 'project-lead'`.
 *    If neither condition is met, return 403.
 *
 * 4. Validate request body fields:
 *    - `title`: required, non-empty string.
 *    - `status`: must be one of 'open', 'in-progress', 'completed', 'closed'. Defaults to 'open' if omitted.
 *    - `priority`: must be one of 'low', 'medium', 'high', 'urgent'. Defaults to 'medium' if omitted.
 *    - `assignee_id`: if provided, verify there is a non-deleted `erp_hrm_project_members` record linking this organization member to the project. Return 422 if not a project member.
 *    - `parent_id`: if provided, the referenced task must exist in the same project (`erp_hrm_project_id` matches), be non-deleted, and have `parent_id IS NULL` (must be a top-level task). Return 422 if the parent is itself a subtask.
 *    - `estimated_hours`: optional positive float.
 *    - `due_date`: optional datetime.
 *    - `description`: optional string.
 *
 * 5. Insert a new record into `erp_hrm_tasks` with a generated UUID, setting `erp_hrm_project_id`, `erp_hrm_organization_member_id` (from assignee_id), `parent_id`, `title`, `description`, `status`, `priority`, `estimated_hours`, `due_date`, `created_at`, `updated_at` (both set to NOW()), and `deleted_at = NULL`.
 *
 * 6. Insert an initial entry in `erp_hrm_task_histories` capturing the creation event (status set to 'open', recorded by the creating organization member).
 *
 * 7. Return the newly created task as an `IErpHrmTask` object including all fields and any related summaries (assignee info, parent task reference if applicable).
 * @path /erpHrm/member/projects/:projectId/tasks
 * @accessor api.functional.erpHrm.member.projects.tasks.create
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
     * The UUID of the project within which the new task will be created.
     */
    projectId: string & tags.Format<"uuid">;

    /**
     * Creation payload for a new task, including title, status, priority, optional assignee, optional parent task reference, and planning metadata.
     */
    body: IErpHrmTask.ICreate;
  };
  export type Body = IErpHrmTask.ICreate;
  export type Response = IErpHrmTask;

  export const METADATA = {
    method: "POST",
    path: "/erpHrm/member/projects/:projectId/tasks",
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
    `/erpHrm/member/projects/${encodeURIComponent(props.projectId ?? "null")}/tasks`;
  export const random = (): IErpHrmTask => typia.random<IErpHrmTask>();
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
 * Retrieve a filtered and paginated list of tasks belonging to a specific project.
 *
 * This operation returns task records stored in the `erp_hrm_tasks` table, scoped to the project identified by `projectId`. Each task is a discrete unit of work within a project, carrying a title, optional description, status (open, in-progress, completed, closed), priority (low, medium, high, urgent), optional estimated hours, optional due date, and an optional assignee who must be an active project member.
 *
 * Tasks support a one-level subtask hierarchy via a self-referencing parent FK. This listing operation returns both top-level tasks and subtasks within the project, with subtask indicators included in the summary payload.
 *
 * Access control is strictly enforced based on the requester's role and project membership:
 * - Regular employees can view tasks only in projects they are currently assigned to as a project member (`erp_hrm_project_members`). Attempts to view tasks in a project the requester is not a member of will be rejected.
 * - Users with the `project:manage` organization-level permission and project leads can view, filter, and sort tasks across all projects for which they have access, regardless of whether they are directly listed as a project member.
 *
 * Filtering is supported independently or in combination on the following criteria:
 * - `status`: one or more of open, in-progress, completed, closed
 * - `priority`: one or more of low, medium, high, urgent
 * - `assigneeId`: the UUID of an assigned organization member
 *
 * Sorting is supported on the following fields: `dueDate`, `priority`, `createdAt`. Both ascending and descending sort orders are supported. When no sort order is specified, tasks are returned ordered by `created_at` descending.
 *
 * Pagination follows the standard IPage pattern with configurable page number and page size.
 *
 * This operation must be preceded by identifying the target project, which can be obtained via `GET /projects/{projectId}` or the project listing endpoint.
 *
 * @param props.connection
 * @param props.projectId The UUID of the target project whose tasks are to be listed (global scope).
 * @param props.body Search criteria including status/priority/assignee filters, sort field and order, and pagination parameters.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1. Authenticate the requesting member session and
 *   resolve their organization context. 2. Look up the target project by
 *   `projectId` (UUID) in `erp_hrm_projects`. Verify that the project belongs
 *   to the requester's organization and is not deleted (`deleted_at IS NULL`).
 *   Return 404 if not found. 3. Authorization check: a. If the requester has
 *   the `project:manage` permission (check their role's permissions via
 *   `erp_hrm_role_permissions`), allow access regardless of project membership.
 *   b. If the requester is a project lead of this project (check
 *   `erp_hrm_project_members` where `project_id = projectId` AND
 *   `organization_member_id = requester's org member id` AND `project_role =
 *   'project-lead'` AND `deleted_at IS NULL`), allow access. c. Otherwise,
 *   verify the requester is an active project member (`erp_hrm_project_members`
 *   where `project_id = projectId` AND `organization_member_id = requester's
 *   org member id` AND `deleted_at IS NULL`). If not found, return 403. 4.
 *   Build a query against `erp_hrm_tasks` WHERE `erp_hrm_project_id =
 *   projectId` AND `deleted_at IS NULL`. 5. Apply filters from request body: -
 *   If `statuses` array is provided and non-empty, add `status IN (...)`
 *   clause. Reject invalid status values with 400. - If `priorities` array is
 *   provided and non-empty, add `priority IN (...)` clause. Reject invalid
 *   priority values with 400. - If `assigneeId` is provided, add
 *   `erp_hrm_organization_member_id = assigneeId` clause. 6. Apply sorting: -
 *   Map `sortBy` field values: 'dueDate' → `due_date`, 'priority' → `priority`
 *   (use custom sort order: urgent > high > medium > low for DESC, reverse for
 *   ASC), 'createdAt' → `created_at`. - Apply `sortOrder` (asc/desc). Default:
 *   `created_at DESC`. 7. Apply pagination: calculate OFFSET and LIMIT from
 *   `page` and `limit` parameters. Count total matching records for pagination
 *   metadata. 8. Join with `erp_hrm_organization_members` for assignee summary
 *   info if `erp_hrm_organization_member_id` is set. 9. Return paginated
 *   results as `IPageIErpHrmTask.ISummary` with pagination metadata (total
 *   count, current page, page size, total pages).
 * @path /erpHrm/member/projects/:projectId/tasks
 * @accessor api.functional.erpHrm.member.projects.tasks.index
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
     * The UUID of the target project whose tasks are to be listed (global scope).
     */
    projectId: string & tags.Format<"uuid">;

    /**
     * Search criteria including status/priority/assignee filters, sort field and order, and pagination parameters.
     */
    body: IErpHrmTask.IRequest;
  };
  export type Body = IErpHrmTask.IRequest;
  export type Response = IPageIErpHrmTask.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/erpHrm/member/projects/:projectId/tasks",
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
    `/erpHrm/member/projects/${encodeURIComponent(props.projectId ?? "null")}/tasks`;
  export const random = (): IPageIErpHrmTask.ISummary =>
    typia.random<IPageIErpHrmTask.ISummary>();
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
 * Retrieve the full details of a single task within a specific project.
 *
 * This operation returns a complete task record from the `erp_hrm_tasks` table, including all planning attributes (title, description, status, priority, estimated hours, due date), the assigned organization member, the parent task reference (if this task is a subtask), and the full chronological audit trail of status changes from `erp_hrm_task_histories`.
 *
 * Access to this endpoint is strictly scoped by project membership. An authenticated member may only retrieve task details for projects in which they hold an active project membership record (`erp_hrm_project_members`). Attempting to retrieve a task from a project the caller is not a member of will result in a rejection. Members who hold a role with the `project:manage` permission are exempt from this restriction and may view tasks in any project within the current organization.
 *
 * The task status field reflects the current lifecycle state of the task (`open`, `in-progress`, `completed`, `closed`), while the priority field (`low`, `medium`, `high`, `urgent`) indicates the urgency level. Both fields are populated from the `erp_hrm_tasks` table. The full history of status transitions is returned as an ordered list of `erp_hrm_task_histories` entries, each capturing the old status, new status, the timestamp of the transition, and the organization member who performed the change.
 *
 * If the task is a subtask, the `parent_id` field will reference the parent task's UUID. Subtasks are independent records with their own status, priority, assignee, and due date. Only one level of subtask nesting is supported.
 *
 * This endpoint is typically used in conjunction with `PATCH /projects/{projectId}/tasks` (the task list endpoint) to allow users to drill into a specific task after browsing the project's task list.
 *
 * @param props.connection
 * @param props.projectId The UUID of the project that contains the target task.
 * @param props.taskId The UUID of the task to retrieve.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1. Validate that the authenticated member belongs to
 *   the organization that owns the project identified by projectId (via
 *   erp_hrm_projects.organization_id). 2. Look up the project in
 *   erp_hrm_projects by projectId (UUID). If not found or deleted_at is set,
 *   return 404. 3. Check authorization: a. If the member's role has the
 *   'project:manage' permission, allow access regardless of project membership.
 *   b. Otherwise, verify that an active (deleted_at IS NULL)
 *   erp_hrm_project_members record exists linking the calling member to this
 *   project. If not found, return 403. 4. Look up the task in erp_hrm_tasks by
 *   taskId (UUID) where erp_hrm_project_id = projectId and deleted_at IS NULL.
 *   If not found, return 404. 5. Eagerly load related data: a. Task histories
 *   from erp_hrm_task_histories WHERE erp_hrm_task_id = taskId, ordered by
 *   created_at ASC. b. Assignee info from erp_hrm_organization_members (if
 *   erp_hrm_organization_member_id is set). c. Parent task summary (if
 *   parent_id is set) — only top-level fields (id, title, status) to avoid deep
 *   nesting. d. Subtasks list from erp_hrm_tasks WHERE parent_id = taskId AND
 *   deleted_at IS NULL. 6. Return the assembled IErpHrmTask response object. 7.
 *   Edge cases: - If taskId does not belong to the given projectId, return 404.
 *   - Soft-deleted tasks (deleted_at IS NOT NULL) must not be returned.
 * @path /erpHrm/member/projects/:projectId/tasks/:taskId
 * @accessor api.functional.erpHrm.member.projects.tasks.at
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
     * The UUID of the project that contains the target task.
     */
    projectId: string & tags.Format<"uuid">;

    /**
     * The UUID of the task to retrieve.
     */
    taskId: string & tags.Format<"uuid">;
  };
  export type Response = IErpHrmTask;

  export const METADATA = {
    method: "GET",
    path: "/erpHrm/member/projects/:projectId/tasks/:taskId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/erpHrm/member/projects/${encodeURIComponent(props.projectId ?? "null")}/tasks/${encodeURIComponent(props.taskId ?? "null")}`;
  export const random = (): IErpHrmTask => typia.random<IErpHrmTask>();
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
 * Update the details of an existing task within a specific project.
 *
 * This operation allows a project lead or a user holding the `project:manage` organization-level permission to modify the attributes of a task record stored in the `erp_hrm_tasks` table. Updatable fields include the task title, description, current status, priority level, estimated hours, due date, and the assigned organization member. Every field in the request body is optional — only the fields explicitly provided will be updated; all others retain their current values.
 *
 * Access control is enforced at two levels. First, the requesting member must be authenticated and belong to the same organization as the project. Second, the member must either hold the `project:manage` permission (which grants task management authority across all projects in the organization) or be assigned the `project-lead` role within the specific project identified by `projectId` in the `erp_hrm_project_members` table. A regular project member without either of these elevated privileges is not permitted to update tasks.
 *
 * When the `status` field is updated, the system automatically creates an immutable audit entry in `erp_hrm_task_histories`, capturing the previous status, the new status, the timestamp of the change, and the identity of the organization member who made the change. This audit trail cannot be modified or deleted and is used for compliance, reporting, and task lifecycle visibility.
 *
 * The `assignee` (organization member) specified in the request body must be an active project member of the same project — verified against the `erp_hrm_project_members` table. Attempting to assign a task to a member who is not listed as a project member will result in a validation error. If the assignee field is explicitly set to null, the task becomes unassigned.
 *
 * The task identified by `taskId` must belong to the project identified by `projectId`. If either ID is not found, or if the task does not belong to the given project, the request is rejected. Subtask nesting rules are also enforced: a task that is already a subtask (has a `parent_id`) cannot be designated as a parent for another task — only one level of nesting is permitted.
 *
 * Related operations: Use `GET /projects/{projectId}/tasks/{taskId}` to retrieve the current state of the task before updating. Use `PATCH /projects/{projectId}/tasks` to browse and filter tasks within the project. Task history entries produced by status changes can be reviewed via the task history endpoints.
 *
 * @param props.connection
 * @param props.projectId The UUID of the project that contains the task to be updated.
 * @param props.taskId The UUID of the task to update. Must belong to the specified project.
 * @param props.body Fields to update on the task. Only provided fields are modified; omitted fields retain their current values.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1. Authenticate the requesting member and resolve
 *   their organization context. 2. Look up the project by projectId in
 *   erp_hrm_projects where deleted_at IS NULL. Return 404 if not found. 3. Look
 *   up the task by taskId in erp_hrm_tasks where erp_hrm_project_id = projectId
 *   AND deleted_at IS NULL. Return 404 if not found or does not belong to the
 *   project. 4. Authorize the request: check if the requesting organization
 *   member holds `project:manage` permission via their role's
 *   erp_hrm_role_permissions, OR if they have a record in
 *   erp_hrm_project_members with project_id = projectId AND project_role =
 *   'project-lead' AND deleted_at IS NULL. If neither condition is met, return
 *   403. 5. Validate request body fields: a. title: if provided, must be a
 *   non-empty string. b. status: if provided, must be one of ['open',
 *   'in-progress', 'completed', 'closed']. c. priority: if provided, must be
 *   one of ['low', 'medium', 'high', 'urgent']. d. estimated_hours: if
 *   provided, must be a positive number. e. due_date: if provided, must be a
 *   valid ISO datetime. f. assignee_id: if provided (non-null), verify that the
 *   referenced organization member has an active record in
 *   erp_hrm_project_members with project_id = projectId AND deleted_at IS NULL.
 *   Return 422 if not a project member. g. parent_id: if provided, verify the
 *   referenced parent task belongs to the same project, is not itself a subtask
 *   (its own parent_id must be null), and is not the current task itself.
 *   Return 422 if violation. 6. Begin a database transaction: a. If status is
 *   being changed: capture old_status from the current task record. After
 *   updating the task, insert a new row into erp_hrm_task_histories with:
 *   task_id, old_status, new_status, changed_by_organization_member_id
 *   (requester), and created_at = NOW(). b. Apply all provided field updates to
 *   erp_hrm_tasks (set updated_at = NOW()). 7. Commit the transaction. 8.
 *   Return the full updated task record joined with relevant relations (project
 *   info, assignee info, parent task summary if applicable) as IErpHrmTask.
 * @path /erpHrm/member/projects/:projectId/tasks/:taskId
 * @accessor api.functional.erpHrm.member.projects.tasks.update
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
     * The UUID of the project that contains the task to be updated.
     */
    projectId: string & tags.Format<"uuid">;

    /**
     * The UUID of the task to update. Must belong to the specified project.
     */
    taskId: string & tags.Format<"uuid">;

    /**
     * Fields to update on the task. Only provided fields are modified; omitted fields retain their current values.
     */
    body: IErpHrmTask.IUpdate;
  };
  export type Body = IErpHrmTask.IUpdate;
  export type Response = IErpHrmTask;

  export const METADATA = {
    method: "PUT",
    path: "/erpHrm/member/projects/:projectId/tasks/:taskId",
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
    `/erpHrm/member/projects/${encodeURIComponent(props.projectId ?? "null")}/tasks/${encodeURIComponent(props.taskId ?? "null")}`;
  export const random = (): IErpHrmTask => typia.random<IErpHrmTask>();
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
 * Remove a specific task from a project by marking it as deleted.
 *
 * This operation marks a task record as deleted by setting its soft-deletion timestamp (`deleted_at`), effectively removing it from all active project views without physically destroying the database record. The task is identified by both the parent project identifier (`projectId`) and the task's own unique identifier (`taskId`). After deletion, the task and all its associated subtasks are excluded from all normal query results and are treated as removed within the system.
 *
 * Access to this operation is restricted to authenticated members who either hold the `project:manage` permission within the organization or are assigned the `project-lead` role in the target project. Regular project members without elevated privileges are not permitted to delete tasks. Any attempt by an unauthorized user will be rejected with an appropriate authorization error.
 *
 * The `erp_hrm_tasks` database entity supports a one-level subtask hierarchy via a self-referencing `parent_id` foreign key. When a parent task is deleted, its associated subtasks are also cascaded through the `deleted_at` field update, ensuring no orphaned subtask records remain. All immutable audit entries in `erp_hrm_task_histories` linked to the deleted task are retained as historical data — since this is a soft-delete operation, cascade deletion of task history records is NOT triggered (that only applies to physical database deletion).
 *
 * The response returns the full task record as it existed at the moment of deletion, enabling clients to update their local state and remove the task from views. Callers should ensure the task belongs to the specified project; if the task does not exist within the given project, or if the project itself does not exist or has been deleted, the operation returns a not-found error.
 *
 * Related operations: Use `PATCH /erpHrm/member/projects/{projectId}/tasks` to list tasks and find the target task ID before deletion. Use `GET /erpHrm/member/projects/{projectId}/tasks/{taskId}` to retrieve the current task state before deletion.
 *
 * @param props.connection
 * @param props.projectId The unique identifier (UUID) of the project that contains the task to be deleted.
 * @param props.taskId The unique identifier (UUID) of the task to be deleted within the specified project.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1. Authenticate the requesting member and retrieve
 *   their organization context. 2. Load the project record from
 *   erp_hrm_projects where id = projectId and deleted_at IS NULL. Return 404 if
 *   not found. 3. Verify that the requesting member belongs to the same
 *   organization as the project (via
 *   erp_hrm_organization_members.organization_id). Return 403 if not. 4.
 *   Authorization check: the requesting member must either (a) hold the
 *   'project:manage' permission (verified through their role's permissions in
 *   erp_hrm_role_permissions), OR (b) have a project membership record in
 *   erp_hrm_project_members where project_id = projectId AND
 *   organization_member_id = requestingMemberId AND project_role =
 *   'project-lead' AND deleted_at IS NULL. Return 403 if neither condition is
 *   met. 5. Load the task record from erp_hrm_tasks where id = taskId AND
 *   erp_hrm_project_id = projectId AND deleted_at IS NULL. Return 404 if not
 *   found or already deleted. 6. Begin a database transaction. 7. If the task
 *   has subtasks (parent_id = taskId in erp_hrm_tasks), set their deleted_at to
 *   NOW() as well. 8. Set erp_hrm_tasks.deleted_at = NOW() and
 *   erp_hrm_tasks.updated_at = NOW() for the target task. 9. Note:
 *   erp_hrm_task_histories entries are automatically cascade-deleted by the DB
 *   onDelete: Cascade relationship when the parent task is deleted; however,
 *   since this is a soft deletion approach, task history records remain unless
 *   the task is physically deleted. For consistency with the soft-delete
 *   pattern, retain task histories as historical data. 10. Commit the
 *   transaction. 11. Return the full task record (as it was at the time of
 *   deletion, including the newly set deleted_at timestamp). 12. Edge cases: if
 *   taskId refers to a subtask, only that subtask is deleted (not siblings). If
 *   the task is already soft-deleted, return 404. Verify the task's
 *   erp_hrm_project_id matches the given projectId to prevent cross-project
 *   deletion.
 * @path /erpHrm/member/projects/:projectId/tasks/:taskId
 * @accessor api.functional.erpHrm.member.projects.tasks.erase
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
     * The unique identifier (UUID) of the project that contains the task to be deleted.
     */
    projectId: string & tags.Format<"uuid">;

    /**
     * The unique identifier (UUID) of the task to be deleted within the specified project.
     */
    taskId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/erpHrm/member/projects/:projectId/tasks/:taskId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/erpHrm/member/projects/${encodeURIComponent(props.projectId ?? "null")}/tasks/${encodeURIComponent(props.taskId ?? "null")}`;
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
