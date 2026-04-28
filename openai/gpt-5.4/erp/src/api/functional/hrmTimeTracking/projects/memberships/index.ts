import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IHrmTimeTrackingProjectMembership } from "../../../../structures/IHrmTimeTrackingProjectMembership";
import { IPageIHrmTimeTrackingProjectMembership } from "../../../../structures/IPageIHrmTimeTrackingProjectMembership";

/**
 * Create a new membership that assigns an employee to a project in the current organization context.
 *
 * This operation creates an organization-scoped project assignment record in the project membership domain. The underlying `hrm_time_tracking_project_memberships` table is described as storing the membership of one employee in one project through references to `hrm_time_tracking_projects` and `hrm_time_tracking_employees`, while capturing the project-specific responsibility classification such as `member` or `project-lead`. In business terms, this is the action that makes a project available to an assigned employee as one of the projects they participate in.
 *
 * Access to this operation is intended for actors with project management authority, which in this service means organization owners and managers operating inside the currently selected organization. The operation must be executed strictly within that organization boundary. The related requirements state that project membership actions are organization-scoped and that employee-to-project assignments must remain isolated from memberships in other organizations. As a result, the service must verify that the target project and target employee both belong to the same active organization context before creating the record.
 *
 * The created membership becomes the authoritative link used by later workflows. Business rules state that task assignment to an employee requires that employee to be a member of the task's project, and timelog creation for a project also requires that employee to be assigned to that project first. Therefore, this endpoint is a prerequisite operation for downstream collaboration and time-tracking features. Clients commonly use `POST /projects/{projectId}/memberships` before using task assignment or project-based timelog APIs for the selected employee.
 *
 * Validation must follow both the requirements and the schema. The membership role must be one of the allowed business values `member` or `project-lead`. The system must reject requests that omit a valid employee reference, use a nonexistent project or employee, attempt to associate records from different organizations, or duplicate an existing employee-to-project assignment. Because the schema for `hrm_time_tracking_project_memberships` enforces one unique pairing of project and employee, clients should treat repeated assignment attempts as conflicts rather than idempotent updates.
 *
 * On success, the response returns the created project membership resource so the caller can immediately confirm the assigned employee, parent project, selected responsibility classification, and generated timestamps. If the project later gains or loses memberships, related project membership listing and assigned-project viewing operations should reflect that change for the affected employee.
 *
 * @param props.connection
 * @param props.projectId Unique identifier of the parent project
 * @param props.body Employee assignment data and membership role
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement this operation as creation of a child
 *   record in `hrm_time_tracking_project_memberships` under the parent
 *   `hrm_time_tracking_projects` record identified by `projectId`.
 *
 * 1. Authorize the caller as an organization owner or manager with project management authority in the current organization context.
 * 2. Resolve the parent project by `projectId` and reject the request if no active project exists or if the project is not accessible in the caller's current organization context. Treat rows with non-null `deleted_at` as unavailable for new membership creation.
 * 3. Parse the request body as `IHrmTimeTrackingProjectMembership.ICreate`. Read the employee identifier and the requested `membership_role` from the body. Do not expect the project identifier in the body because the route path already provides it.
 * 4. Validate that `membership_role` is exactly one of the business values `member` or `project-lead`.
 * 5. Resolve the target employee from `hrm_time_tracking_employees` using the identifier supplied in the request body. Reject when the employee does not exist or has been logically removed for assignment purposes.
 * 6. Enforce organization integrity required by the business rules. Compare the organization owning the project with the organization context of the employee workforce record used for project participation. If they do not belong to the same organization, reject the request.
 * 7. Check for an existing non-deleted membership row with the same pair `(hrm_time_tracking_project_id, hrm_time_tracking_employee_id)`. If one exists, reject with a conflict because duplicate assignments for the same employee and project are not allowed.
 * 8. Insert the new row with a generated UUID, `hrm_time_tracking_project_id`, `hrm_time_tracking_employee_id`, `membership_role`, `created_at`, `updated_at`, and `deleted_at = null`.
 * 9. Return the created membership entity.
 *
 * Use a transaction for the lookup-and-insert sequence if the implementation cannot rely solely on the database unique constraint. If the unique constraint is hit concurrently, translate it into a conflict response. Keep this operation limited to membership creation only; do not create tasks, timelogs, or any derived records here. However, the new membership must be immediately usable by subsequent task assignment and timelog validation logic.
 * @path /hrmTimeTracking/projects/:projectId/memberships
 * @accessor api.functional.hrmTimeTracking.projects.memberships.create
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
     * Unique identifier of the parent project
     */
    projectId: string & tags.Format<"uuid">;

    /**
     * Employee assignment data and membership role
     */
    body: IHrmTimeTrackingProjectMembership.ICreate;
  };
  export type Body = IHrmTimeTrackingProjectMembership.ICreate;
  export type Response = IHrmTimeTrackingProjectMembership;

  export const METADATA = {
    method: "POST",
    path: "/hrmTimeTracking/projects/:projectId/memberships",
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
    `/hrmTimeTracking/projects/${encodeURIComponent(props.projectId ?? "null")}/memberships`;
  export const random = (): IHrmTimeTrackingProjectMembership =>
    typia.random<IHrmTimeTrackingProjectMembership>();
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
 * Retrieve a filtered and paginated list of memberships for a specific project.
 *
 * This operation returns the current employee-to-project assignment records associated with the target project identified by `projectId`. It is designed for project membership review screens where organization users need to understand who is currently assigned to a project and what project-specific responsibility classification each assignment carries. The underlying membership data comes from `hrm_time_tracking_project_memberships`, which records one link between one employee and one project, and includes the `membership_role` that defines the assignment responsibility within that project.
 *
 * Access to this operation must be evaluated within the currently selected organization context. The related `hrm_time_tracking_projects` record belongs to exactly one organization through `hrm_time_tracking_organization_id`, and project memberships must remain strictly isolated between organizations. As a result, the operation must only return memberships for a project that belongs to the caller's active organization scope, and it must not expose memberships from any other organization. This behavior aligns with the requirement that project membership visibility be limited to the current organization and the authorized scope of the caller.
 *
 * The response is intended for list browsing rather than single-record inspection. Clients may provide structured search, pagination, and sorting criteria in the request body to browse current project memberships efficiently. Typical filters may include the project-specific `membership_role` and employee-oriented search options supported by the corresponding request DTO. Only active memberships should be included in normal results, because removed memberships must no longer appear in assigned project lists. The operation should therefore treat `deleted_at` on membership records as inactive membership state unless a future explicit administrative browsing rule says otherwise.
 *
 * This endpoint is closely related to membership lifecycle operations that assign an employee to a project or remove an employee from a project. Those operations change which rows exist as current project memberships, while this operation reads the resulting current set for one project. It also supports downstream task-assignment and time-logging workflows because project membership determines whether an employee can participate in a project, be assigned tasks for that project, and log time against it.
 *
 * If the target project does not exist, belongs to a different organization than the current context, or is outside the caller's authorized scope, the request must fail without leaking membership information. If valid, the operation returns a paginated collection of membership summaries suitable for project staffing views and project management dashboards.
 *
 * @param props.connection
 * @param props.projectId Target project's ID
 * @param props.body Project membership search and pagination criteria
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Validate that `projectId` refers to an existing row
 *   in `hrm_time_tracking_projects` and that the project belongs to the
 *   caller's currently selected organization via
 *   `hrm_time_tracking_organization_id`. Reject the request when the project
 *   does not exist, is not accessible in the active organization context, or
 *   the caller lacks permission to review project memberships.
 *
 * Build a list query rooted in `hrm_time_tracking_project_memberships` filtered by `hrm_time_tracking_project_id = :projectId`. Exclude rows whose `deleted_at` is not null so that removed memberships are not returned as active assignments. Join the related `hrm_time_tracking_employees` row through `hrm_time_tracking_employee_id` to populate employee-facing summary fields required by `IHrmTimeTrackingProjectMembership.ISummary`. If the summary DTO needs project fields, obtain them from the already validated `hrm_time_tracking_projects` row rather than broad cross-project joins.
 *
 * Apply structured request-body criteria from `IHrmTimeTrackingProjectMembership.IRequest`, including pagination, sorting, and supported filters such as `membership_role` and employee-oriented search inputs defined in the DTO. Constrain all filtering to the already selected project and organization scope. Do not allow request-body inputs to override the path-scoped project identity.
 *
 * Use stable pagination and deterministic sorting. Prefer explicit sortable fields that are actually present in the schema, such as membership `created_at`, `updated_at`, and `membership_role`, and employee fields that are exposed by the DTO and backed by joined schema columns. Return results as `IPageIHrmTimeTrackingProjectMembership.ISummary` with pagination metadata and the filtered membership summaries.
 *
 * Error handling must cover: project not found; project outside current organization context; unauthorized caller; malformed pagination or filter inputs; and any attempt to access data outside authorized scope. The operation must remain read-only and must not alter the employee account record, the project record, organization-level roles, or any other unrelated memberships.
 * @path /hrmTimeTracking/projects/:projectId/memberships
 * @accessor api.functional.hrmTimeTracking.projects.memberships.index
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
     * Target project's ID
     */
    projectId: string & tags.Format<"uuid">;

    /**
     * Project membership search and pagination criteria
     */
    body: IHrmTimeTrackingProjectMembership.IRequest;
  };
  export type Body = IHrmTimeTrackingProjectMembership.IRequest;
  export type Response = IPageIHrmTimeTrackingProjectMembership.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/hrmTimeTracking/projects/:projectId/memberships",
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
    `/hrmTimeTracking/projects/${encodeURIComponent(props.projectId ?? "null")}/memberships`;
  export const random = (): IPageIHrmTimeTrackingProjectMembership.ISummary =>
    typia.random<IPageIHrmTimeTrackingProjectMembership.ISummary>();
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
 * Retrieve detailed information for one project membership within a specific project.
 *
 * This operation returns the assignment record that connects one employee to one project in the HRM time tracking platform. The underlying project membership table is described as the organization-scoped assignment link between {@link hrm_time_tracking_projects} and {@link hrm_time_tracking_employees}, and it stores the project-specific responsibility classification in the `membership_role` column together with creation, update, and logical removal timestamps. In business terms, this record is the source that determines whether an employee participates in a project and whether that employee may collaborate, receive eligible task assignments, and log time against that project.
 *
 * Authorization for this operation must respect organization-scoped access boundaries. Owners and managers may retrieve memberships that belong to projects inside the current organization context when permitted by their role and project-management authority. Employees may retrieve membership information only within their authorized scope, and assigned-project visibility must remain isolated to the current organization. The operation must never expose memberships from another organization context, because the requirements state that project membership actions and visibility are strictly isolated between organizations.
 *
 * The response is based on the `hrm_time_tracking_project_memberships` record and should be resolved together with its parent project and assigned employee references as needed for the DTO. The parent project is described as the business container for planned work and recorded work effort, with source attributes such as `name`, `description`, `color_code`, `status`, `budget_hours`, `start_date`, and `end_date`. The assigned employee reference points to the authenticated employee account identity that includes fields such as `email`, `email_verified_at`, and `last_logged_in_at`. This allows consumers to understand not only the membership role but also the concrete project and employee context attached to the assignment.
 *
 * This endpoint is typically used after a caller has already identified a relevant project from project-browsing or assigned-project views. It complements membership creation, update, and removal flows by providing a precise read of one assignment record. If the specified membership does not belong to the supplied project, if the membership is logically removed, or if the caller attempts to cross organization boundaries or exceed authorized visibility, the operation must fail rather than returning unrelated assignment data.
 *
 * @param props.connection
 * @param props.projectId Target project's ID
 * @param props.membershipId Target project membership's ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Load the target project membership by `membershipId`
 *   from `hrm_time_tracking_project_memberships` and verify that its
 *   `hrm_time_tracking_project_id` matches the `projectId` path parameter
 *   before constructing the response.
 *
 * Join or separately load the parent record from `hrm_time_tracking_projects` to confirm the project exists, belongs to the caller's current organization context, and is the same project referenced by the membership row. Use the project relationship to enforce organization isolation because project memberships must operate only inside the selected organization.
 *
 * Load the related employee from `hrm_time_tracking_employees` for response composition if the DTO includes employee details. Only include data that is part of the defined DTO contract.
 *
 * Reject the request when the membership does not exist, when the membership is logically removed (`deleted_at` is not null), when the parent project does not exist or is logically removed, or when the membership belongs to a different project than the one identified in the path.
 *
 * Apply authorization rules before returning data. Owners and managers may access memberships within their permitted organization scope. Employee access must be restricted to authorized membership visibility in the current organization and must not reveal memberships outside that scope.
 *
 * Return a single `IHrmTimeTrackingProjectMembership` object representing the resolved assignment. Do not mutate any membership, project, or employee state during this read operation.
 * @path /hrmTimeTracking/projects/:projectId/memberships/:membershipId
 * @accessor api.functional.hrmTimeTracking.projects.memberships.at
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
     * Target project's ID
     */
    projectId: string & tags.Format<"uuid">;

    /**
     * Target project membership's ID
     */
    membershipId: string & tags.Format<"uuid">;
  };
  export type Response = IHrmTimeTrackingProjectMembership;

  export const METADATA = {
    method: "GET",
    path: "/hrmTimeTracking/projects/:projectId/memberships/:membershipId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/hrmTimeTracking/projects/${encodeURIComponent(props.projectId ?? "null")}/memberships/${encodeURIComponent(props.membershipId ?? "null")}`;
  export const random = (): IHrmTimeTrackingProjectMembership =>
    typia.random<IHrmTimeTrackingProjectMembership>();
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
      assert.param("membershipId")(() => typia.assert(props.membershipId));
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
 * Update a specific employee-to-project membership within a project.
 *
 * This operation modifies an existing project assignment record stored in the hrm_time_tracking_project_memberships table, which is described as the organization-scoped membership of one employee in one project. The membership record captures the project-specific responsibility classification through the membership_role field, such as member or project-lead, without duplicating broader project, employee, or organization attributes. Because the parent hrm_time_tracking_projects table defines a project as the business container for project memberships, tasks, and time-tracking records, this endpoint is intentionally nested under the target project resource.
 *
 * Access to this operation is limited to organization actors who manage project assignments in the currently selected organization context. Owners have full organization administrative authority, and managers may use this operation only when their assigned permissions include project and employee management capabilities. Employees are not the intended callers for modifying arbitrary membership assignments. The operation must respect the requirement that project membership actions are performed only within the current organization and that project participation authority must not extend outside that boundary.
 *
 * The update must preserve project membership integrity enforced by both business rules and schema structure. A membership must continue to reference a valid employee and a valid project, and the employee and project must belong to the same organization. The hrm_time_tracking_project_memberships table also prevents duplicate assignments for the same employee within the same project through its composite unique constraint on hrm_time_tracking_project_id and hrm_time_tracking_employee_id. As a result, any update that would create a duplicate active assignment or would associate the membership with an employee outside the parent project's organization must be rejected.
 *
 * This operation directly affects downstream work authorization behavior. The requirements state that project membership determines whether an employee may participate in project work and time tracking for that project, and that task assignment and timelog creation depend on the employee being a member of the relevant project. Updating a membership role therefore changes project-specific responsibility, while changing the assigned employee changes who may collaborate and log time against the project. Clients typically discover memberships through project membership list or detail endpoints before invoking this update operation for a specific membership.
 *
 * If the referenced project does not exist in the current authorized scope, if the membership does not belong to the specified project, or if the caller lacks sufficient permission in the organization context, the request must fail without modifying data. If validation fails because the target employee is invalid, belongs to a different organization, or would conflict with an existing project assignment, the operation must also reject the request and return an appropriate error response according to the platform's standard error handling.
 *
 * @param props.connection
 * @param props.projectId Target project's unique identifier
 * @param props.membershipId Target project membership's unique identifier
 * @param props.body Updated project membership assignment information
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement this operation as an update of a single
 *   hrm_time_tracking_project_memberships row under a parent
 *   hrm_time_tracking_projects row.
 *
 * 1. Authenticate the caller and resolve the current organization context from the session.
 * 2. Authorize only owner actors and manager actors who have project-membership management capability in the selected organization. Reject employee callers unless a higher-level policy explicitly grants them this permission.
 * 3. Load the parent project by id using projectId from hrm_time_tracking_projects, ensuring deleted_at is null and that the project belongs to the caller's current organization context.
 * 4. Load the target membership by membershipId from hrm_time_tracking_project_memberships, ensuring deleted_at is null and that hrm_time_tracking_project_id matches the loaded parent project's id. If not found, return a not-found error.
 * 5. Parse the IHrmTimeTrackingProjectMembership.IUpdate body. Apply only supported mutable fields from the DTO. At minimum, if membership_role is present, validate that it remains one of the business-allowed values member or project-lead.
 * 6. If the DTO allows changing the employee reference, load the referenced hrm_time_tracking_employees row and validate it exists. Then verify through organization-scoped business logic that the employee belongs to the same organization as the parent project. Reject cross-organization assignments.
 * 7. Before persisting any employee reassignment, check for another active membership row with the same hrm_time_tracking_project_id and hrm_time_tracking_employee_id and deleted_at is null, excluding the current membership id. If one exists, reject the update as a duplicate assignment.
 * 8. Update the membership row, set updated_at to the current timestamp, and preserve the parent project relation. Do not mutate project ownership or unrelated project fields in this operation.
 * 9. Return the updated membership as IHrmTimeTrackingProjectMembership.
 *
 * Use a transaction if the implementation performs multiple reads plus a write that must stay consistent against duplicate-assignment checks. Treat deleted_at as logical removal and exclude logically removed projects or memberships from normal update targets. Ensure audit and domain events, if implemented elsewhere in the platform, reflect that project membership changes can alter project participation and related task or timelog eligibility.
 * @path /hrmTimeTracking/projects/:projectId/memberships/:membershipId
 * @accessor api.functional.hrmTimeTracking.projects.memberships.update
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
     * Target project's unique identifier
     */
    projectId: string & tags.Format<"uuid">;

    /**
     * Target project membership's unique identifier
     */
    membershipId: string & tags.Format<"uuid">;

    /**
     * Updated project membership assignment information
     */
    body: IHrmTimeTrackingProjectMembership.IUpdate;
  };
  export type Body = IHrmTimeTrackingProjectMembership.IUpdate;
  export type Response = IHrmTimeTrackingProjectMembership;

  export const METADATA = {
    method: "PUT",
    path: "/hrmTimeTracking/projects/:projectId/memberships/:membershipId",
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
    `/hrmTimeTracking/projects/${encodeURIComponent(props.projectId ?? "null")}/memberships/${encodeURIComponent(props.membershipId ?? "null")}`;
  export const random = (): IHrmTimeTrackingProjectMembership =>
    typia.random<IHrmTimeTrackingProjectMembership>();
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
      assert.param("membershipId")(() => typia.assert(props.membershipId));
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
 * Permanently remove a project membership from a project within the current organization context.
 *
 * This operation deletes one assignment record from the project membership table, which is the normalized link between a project and an employee. In the underlying data model, `hrm_time_tracking_project_memberships` stores the organization-scoped participation of one employee in one project through `hrm_time_tracking_project_id` and `hrm_time_tracking_employee_id`, together with the `membership_role` that expresses project-specific responsibility such as member or project-lead. Removing this record ends the employee's participation in the selected project and ensures that the project no longer appears in that employee's assigned project list for the current organization.
 *
 * Access to this operation is restricted to users who have project management permission in the currently selected organization. This reflects the project-management enforcement rule that create, edit, archive, complete, and delete style project-management actions are allowed only when the caller has project management authority in that organization context. The implementation must therefore validate both the active organization context and the caller's permission before attempting the deletion. Ordinary employees may view only their own assigned projects and must not use this endpoint to manage memberships outside their authorized scope.
 *
 * The operation is intentionally nested under `/projects/{projectId}` because project memberships are subsidiary records of a project. The system must verify that the target membership belongs to the specified project and that the project belongs to the caller's current organization. This prevents cross-project or cross-organization manipulation. When the removed membership carried the project-lead responsibility, the user's project-lead task management authority for that project must also cease as a consequence of the membership removal.
 *
 * This endpoint should typically be used after a project management interface has listed current project members for a specific project and the authorized user has selected one membership to remove. After successful execution, any employee-facing assigned-project views must reflect the change so that removed memberships no longer appear. If the membership does not exist, does not belong to the specified project, or is outside the caller's permitted organization scope, the request must be rejected without altering any other project memberships.
 *
 * @param props.connection
 * @param props.projectId UUID of the project that owns the target membership.
 * @param props.membershipId UUID of the project membership to remove from the specified project.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement this operation as a project-scoped
 *   membership removal routine.
 *
 * 1. Resolve the caller's authenticated actor and current organization context.
 * 2. Authorize the caller: allow organization owners and managers only when they have project management permission in the current organization. Reject all other callers.
 * 3. Load the target project from `hrm_time_tracking_projects` by `id = projectId` and ensure it belongs to the caller's current organization via `hrm_time_tracking_organization_id`. Reject if not found in scope.
 * 4. Load the target membership from `hrm_time_tracking_project_memberships` by `id = membershipId` and ensure `hrm_time_tracking_project_id = projectId`. Reject if the membership is missing, already removed from active use, or belongs to a different project.
 * 5. Remove the membership record in a write transaction. Because the schema contains `deleted_at` and describes logical removal from active use, the implementation should mark the membership as removed by setting `deleted_at` and updating `updated_at` rather than deleting unrelated records. The operation must affect only this membership row.
 * 6. Do not modify the employee's other project memberships. The effect must remain limited to the current organization and the specified project.
 * 7. If the membership's `membership_role` represents project-lead responsibility, ensure downstream authorization or cached permission material for that project is recalculated so the employee no longer has project-lead task-management authority for this project.
 * 8. Return success with no response body.
 *
 * Error handling:
 * - Reject when the caller lacks project management permission in the current organization.
 * - Reject when `projectId` does not reference an in-scope project.
 * - Reject when `membershipId` does not reference an in-scope membership under the specified project.
 * - Reject when the target membership has already been removed from active use.
 * - Ensure idempotency is not assumed silently; repeated removal attempts against an already removed membership should return an error indicating the membership is no longer active.
 *
 * Data integrity notes:
 * - Treat `projectId` as the parent scope guard, not as redundant decoration.
 * - Never remove memberships from other projects or organizations.
 * - Preserve historical auditability of the membership record consistent with the schema's `deleted_at` comment about logical removal from active use.
 * @path /hrmTimeTracking/projects/:projectId/memberships/:membershipId
 * @accessor api.functional.hrmTimeTracking.projects.memberships.erase
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
     * UUID of the project that owns the target membership.
     */
    projectId: string & tags.Format<"uuid">;

    /**
     * UUID of the project membership to remove from the specified project.
     */
    membershipId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/hrmTimeTracking/projects/:projectId/memberships/:membershipId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/hrmTimeTracking/projects/${encodeURIComponent(props.projectId ?? "null")}/memberships/${encodeURIComponent(props.membershipId ?? "null")}`;
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
      assert.param("membershipId")(() => typia.assert(props.membershipId));
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
