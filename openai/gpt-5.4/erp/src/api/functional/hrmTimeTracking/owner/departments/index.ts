import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IHrmTimeTrackingDepartment } from "../../../../structures/IHrmTimeTrackingDepartment";
import { IPageIHrmTimeTrackingDepartment } from "../../../../structures/IPageIHrmTimeTrackingDepartment";

/**
 * Create a new department within the currently selected organization.
 *
 * This operation creates an organization-scoped department record used to represent an internal structural grouping such as a team, function, or division. In the HRM time tracking domain, a department identifies where an employee belongs in the organization's structure from a business perspective. It is not a permission container, does not define payroll terms, and does not represent project assignment ownership. The created record stores the raw department attributes defined by the department model, including the department name displayed within the organization, the optional explanation of the department's purpose or scope, and the optional parent department reference used for the permitted one-level hierarchy.
 *
 * Access to this operation is restricted to users acting within their currently selected organization who have organization management permission in that organization. Department creation must never affect another organization, and the system must reject any attempt to create a department by reusing cross-organization context or by referencing a parent department that belongs to a different organization. Users without organization management permission may still view department information through read-only operations, but they must not gain creation authority through department visibility alone.
 *
 * This operation works directly on the underlying hrm_time_tracking_departments table. The service creates a new record with a generated identifier, the current organization identifier, an optional parent_department_id, the provided name, the optional description, and current timestamps for created_at and updated_at. Because the database enforces uniqueness on the pair of organization identifier and department name, the system must ensure that the requested name is not already in use within the same organization. If a parent department is supplied, the system must verify that the referenced department exists, belongs to the same organization, and preserves the simplified hierarchy model in which departments may exist as top-level departments or as one-level child departments only.
 *
 * The parent relationship rules are central to this endpoint. A department may be created without a parent, in which case it becomes a top-level department. A department may also be created with one parent department, but the specified parent must itself be a top-level department. The system must reject any request that would create deeper nesting beyond one level. This preserves the business requirement that the organization structure shown in department lists and employee forms remains simple and understandable.
 *
 * After successful creation, the system should publish the department created event within the same organization context. That event allows current organization views to refresh department lists, management screens, and employee department-selection forms without exposing data to other organizations. Consumers that need to choose a parent department before calling this endpoint should first use the department list retrieval operation for the current organization so they can select an eligible top-level department identifier from the current tenant's visible structure.
 *
 * If validation fails, the system should return an error that clearly explains whether the failure was caused by insufficient permission, missing organization context, duplicate department name within the organization, nonexistent parent department, cross-organization parent reference, or an invalid hierarchy depth. On success, the response returns the full created department resource so client applications can immediately render the latest state.
 *
 * @param props.connection
 * @param props.body Department creation information
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor owner
 * @x-autobe-specification Authenticate the caller and resolve the currently
 *   selected organization context from the session or workspace selection
 *   state. Authorize the operation only when the caller has organization
 *   management permission in that current organization. Reject the request if
 *   the current organization context is missing or if the caller lacks the
 *   required permission.
 *
 * Validate the request body against IHrmTimeTrackingDepartment.ICreate. Require a department name and accept an optional description and optional parent department reference. Normalize and trim user-supplied text as appropriate for the service conventions before persistence.
 *
 * If a parent department identifier is provided, query hrm_time_tracking_departments by that identifier with deleted_at IS NULL. Reject the request if the parent does not exist. Verify that the parent's hrm_time_tracking_organization_id matches the current organization identifier. Reject cross-organization parent usage. Verify that the parent department itself has parent_department_id = NULL so the new department becomes, at most, a one-level child. Reject the request if the selected parent is already a child department, because deeper nesting is not allowed.
 *
 * Before insert, check for an existing active department in hrm_time_tracking_departments within the current organization that has the same name and deleted_at IS NULL. Also rely on the database unique constraint on [hrm_time_tracking_organization_id, name] as the final guard against race conditions. Translate uniqueness violations into a business-level conflict error indicating that the department name is already in use in the current organization.
 *
 * Create the hrm_time_tracking_departments row inside a transaction, generating id, setting hrm_time_tracking_organization_id from the current organization, mapping parent_department_id from the validated optional parent, copying name and description from the request, and setting created_at and updated_at to the current timestamp. Ensure deleted_at is NULL for the new record.
 *
 * After persistence, load the created department record with any parent relationship data needed by the standard IHrmTimeTrackingDepartment response mapper. Publish the department created event scoped only to the current organization. The event payload should include the new department identity and parent relationship so department lists, employee forms, and management views in the same organization can refresh correctly.
 *
 * Return the created department resource. Handle and map failure cases for authorization denial, organization-scope violations, parent not found, invalid hierarchy depth, validation errors, and duplicate-name conflicts.
 * @path /hrmTimeTracking/owner/departments
 * @accessor api.functional.hrmTimeTracking.owner.departments.create
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
          path: create.path(),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Department creation information
     */
    body: IHrmTimeTrackingDepartment.ICreate;
  };
  export type Body = IHrmTimeTrackingDepartment.ICreate;
  export type Response = IHrmTimeTrackingDepartment;

  export const METADATA = {
    method: "POST",
    path: "/hrmTimeTracking/owner/departments",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/hrmTimeTracking/owner/departments";
  export const random = (): IHrmTimeTrackingDepartment =>
    typia.random<IHrmTimeTrackingDepartment>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(),
      contentType: "application/json",
    });
    try {
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
 * Retrieve a filtered and paginated list of departments for the currently selected organization.
 *
 * This operation provides department browsing for the active organization workspace in the HRM time tracking platform. It returns department records derived from the organization-scoped departments table, which stores the raw department attributes and hierarchy linkage used to structure employees within a tenant. Each returned item should reflect the department's current display name and optional description, and may also include enough summary information to present its place in the allowed parent-child structure.
 *
 * Department visibility is strictly limited to the organization currently selected by the authenticated user. The service must not expose departments from any other organization, even when the same user belongs to multiple organizations. Owners, managers, and employees may use this operation to view departments in their active organization context. This visibility is read-only for users who do not have organization management permission; the ability to view the list must remain separate from create, update, and removal privileges.
 *
 * The underlying department data comes from an organization-owned record that may optionally reference one parent department to support a single level of hierarchy. In line with the database schema and department requirements, this operation must present only top-level departments and one nested child level beneath them. The response must not imply deeper recursive trees beyond that supported single parent-child relationship. If a department has a parent department, the response should make that relationship clear in a way suitable for list rendering and selection interfaces.
 *
 * This operation is commonly used before department detail retrieval or department maintenance flows. Clients may call this endpoint to populate department browsing screens, employee assignment forms, or management dashboards that need current department options within the active organization. When department records are created or updated through separate management endpoints, subsequent calls to this operation must reflect the latest department name, description, and parent linkage for the same organization.
 *
 * Expected behavior includes organization-scoped filtering, stable pagination, and predictable sorting for list rendering. Records marked by deleted_at should not appear in ordinary active department browsing results. If the user is not operating in a valid organization context, or if the request attempts to force access to another organization's departments through filter manipulation, the operation must reject the request according to the platform's authorization and organization-scope rules.
 *
 * @param props.connection
 * @param props.body Department search filters and pagination options
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor owner
 * @x-autobe-specification Implement a department list query over
 *   hrm_time_tracking_departments restricted to the authenticated user's
 *   currently selected organization context. Resolve the active organization
 *   from authentication/session context, not from client-supplied path input.
 *   Reject the request if no valid organization context is selected.
 *
 * Build the query from hrm_time_tracking_departments using hrm_time_tracking_organization_id = currentOrganizationId and deleted_at IS NULL as mandatory predicates. Support request-body driven pagination, free-text search, filtering, and sorting through IHrmTimeTrackingDepartment.IRequest. At minimum, allow search and filter behavior on department name, optional description presence or value, and parent/top-level status as long as every condition maps to actual schema fields. Use the table's name trigram index for efficient partial-name search where applicable.
 *
 * When returning summaries, include data needed for one-level hierarchy presentation. Join the parent department record when necessary to expose parent summary information, but do not recursively expand beyond the immediate parent. Do not construct deep trees. If requested sort criteria are absent, default to a stable organization-local order such as name ascending with id as a tiebreaker, or created_at descending with id as a tiebreaker, depending on the shared list convention used by the service.
 *
 * Return a paginated response of IHrmTimeTrackingDepartment.ISummary items inside IPageIHrmTimeTrackingDepartment.ISummary. The summary projection should be derived only from actual department fields and any immediate parent summary fields supported by generated DTOs. Keep organization ownership enforcement server-side even if the request body contains organization-related criteria; client input must never widen scope beyond the current organization.
 *
 * Authorization logic must permit owner, manager, and employee actors to read department lists within their current organization, while keeping this operation read-only. Do not require organization management permission for listing. On invalid filters, invalid pagination, missing organization context, or unauthorized organization access attempts, fail the request without exposing records from other organizations.
 * @path /hrmTimeTracking/owner/departments
 * @accessor api.functional.hrmTimeTracking.owner.departments.index
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
          path: index.path(),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Department search filters and pagination options
     */
    body: IHrmTimeTrackingDepartment.IRequest;
  };
  export type Body = IHrmTimeTrackingDepartment.IRequest;
  export type Response = IPageIHrmTimeTrackingDepartment.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/hrmTimeTracking/owner/departments",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/hrmTimeTracking/owner/departments";
  export const random = (): IPageIHrmTimeTrackingDepartment.ISummary =>
    typia.random<IPageIHrmTimeTrackingDepartment.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(),
      contentType: "application/json",
    });
    try {
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
 * Retrieve the detailed information for a single department in the current organization context.
 *
 * This operation returns one organization-scoped department from the department structure used to group employees within a tenant. The underlying department record is defined by the hrm_time_tracking_departments table, which stores the department name as the primary business label displayed within the organization, an optional description that explains the department's purpose or scope, and an optional parent_department_id that links the department into the allowed one-level hierarchy. The operation is intended for consumers that need the current authoritative state of a department after selecting the active organization workspace.
 *
 * Access to this operation is scoped by the current organization context rather than by global visibility. Owners, managers, and employees may read department information for the organization they are currently working in, but the system must not expose department data from another organization. This reflects the requirement that department viewing capability is separate from department management authority: users who cannot create, update, or remove departments may still retrieve department details in read-only form when the department belongs to their active organization.
 *
 * The returned data should reflect the same identifying business information used throughout department list and detail views: the department name and optional description, together with hierarchy linkage when a parent department exists. Because the database model stores departments as normalized organization-owned records, this operation should validate that the requested department belongs to the caller's current organization before returning it. If the record is associated with another organization, the request must be rejected rather than leaking cross-tenant structure information.
 *
 * Hierarchy handling must remain consistent with the department rules. A department may exist as a top-level node or as a child of one parent department, but the business model does not allow deeper nesting. This endpoint does not expand arbitrary tree structures; it exposes the department resource defined by the database and its one-level parent linkage so that clients can render the current organizational structure correctly.
 *
 * This operation is commonly used together with the department list retrieval endpoint. A client may first obtain the organization-scoped list of departments and then call this detail endpoint for a specific department identifier when richer information about one selected department is needed. After department creation or update events, clients may also call this endpoint to refresh the current authoritative state of the newly changed department within the same organization.
 *
 * @param props.connection
 * @param props.departmentId Target department's unique identifier within the current organization
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor owner
 * @x-autobe-specification Implement a read-only service method that loads one
 *   hrm_time_tracking_departments row by id and returns it only when it belongs
 *   to the authenticated user's currently selected organization context.
 *
 * Resolve the caller's active organization from the authentication/session context before querying. Execute a single-record lookup filtered by both hrm_time_tracking_departments.id = :departmentId and hrm_time_tracking_departments.hrm_time_tracking_organization_id = :currentOrganizationId. Exclude rows whose deleted_at is not null so that removed departments are not returned from normal detail views.
 *
 * Select the department's core fields required by the DTO: id, name, description, hrm_time_tracking_organization_id, parent_department_id, created_at, and updated_at. If the response contract for IHrmTimeTrackingDepartment includes parent details, load the parent department only when parent_department_id is present and ensure it is within the same organization. Do not traverse beyond the immediate parent because business rules allow only a one-level hierarchy.
 *
 * If no matching record exists for the given id inside the current organization, return a not-found style error without revealing whether the id exists in a different organization. If the user is authenticated but lacks access to the current organization context, deny the request according to organization-scoped access rules. Keep this endpoint read-only with no transaction beyond the consistency guarantees needed for a simple select.
 *
 * Map the database result into IHrmTimeTrackingDepartment using schema-accurate fields only. Preserve nullable handling for description and parent_department_id. Do not fabricate management metadata or unrelated aggregates. The handler should be safe for owners, managers, and employees because viewing departments is permitted independently from department management privileges.
 * @path /hrmTimeTracking/owner/departments/:departmentId
 * @accessor api.functional.hrmTimeTracking.owner.departments.at
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
     * Target department's unique identifier within the current organization
     */
    departmentId: string & tags.Format<"uuid">;
  };
  export type Response = IHrmTimeTrackingDepartment;

  export const METADATA = {
    method: "GET",
    path: "/hrmTimeTracking/owner/departments/:departmentId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/hrmTimeTracking/owner/departments/${encodeURIComponent(props.departmentId ?? "null")}`;
  export const random = (): IHrmTimeTrackingDepartment =>
    typia.random<IHrmTimeTrackingDepartment>();
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
      assert.param("departmentId")(() => typia.assert(props.departmentId));
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
 * Update a department within the current organization context.
 *
 * This operation modifies an existing department record that represents an organizational grouping within one organization. A department is used to express internal structure such as a team, function, or division, helping identify where employees belong in the organization from a business perspective. The update may change the department name, the optional description that explains the department's purpose or scope, and the optional parent department relationship that supports the allowed single-level hierarchy.
 *
 * Access to this operation is restricted to users who have organization management permission in the currently selected organization. The requirements distinguish department visibility from department management authority, so employees may be able to view department lists but must not be allowed to edit department records unless they hold the required management capability. The request must be evaluated against the user's active organization context, and updates must apply only to department records owned by that same organization.
 *
 * The underlying data is stored in the hrm_time_tracking_departments table. That table defines the department name displayed within the organization, an optional explanation of the department's purpose or scope, and an optional parent_department_id that links one department to another department record for hierarchy. The organization ownership field hrm_time_tracking_organization_id makes the record organization-scoped, while updated_at reflects the latest modification time. Because the table also includes deleted_at, implementations must ensure that removed department records are not updated as if they were active records.
 *
 * Parent department updates must respect the business rule that the structure is limited to top-level departments and one nested level beneath them. If a parent department is supplied, it must belong to the same organization as the department being updated. The target department cannot be assigned as its own parent, and a department whose chosen parent already has its own parent cannot be used to create a deeper hierarchy. These checks preserve the simple organizational structure required by the service.
 *
 * This operation is commonly used after department list viewing features show current organizational structure and a management user chooses to revise naming, descriptions, or placement. After a successful update, the refreshed department information should be returned so department lists, employee department assignment forms, and live administrative views can immediately reflect the current structure in the selected organization. Validation failures, missing department records, cross-organization access attempts, or hierarchy rule violations must cause the update to be rejected without partially applying changes.
 *
 * @param props.connection
 * @param props.departmentId Target department ID
 * @param props.body Department update information
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor owner
 * @x-autobe-specification Implement a service method that updates one active
 *   hrm_time_tracking_departments record by its id within the caller's
 *   currently selected organization context.
 *
 * 1. Authorize the caller before any mutation. Allow only users who have organization management permission in the current organization context. If the caller lacks that permission, reject the request.
 *
 * 2. Load the target department by id and ensure it belongs to the caller's current organization using hrm_time_tracking_organization_id. Exclude records that have deleted_at set. If no matching active department exists in the current organization, return a not-found or forbidden-style failure according to the platform's standard ownership error policy.
 *
 * 3. Validate request fields against mutable department attributes only. Permit updates to name, description, and parentDepartmentId or equivalent DTO field mapped to parent_department_id. Do not allow mutation of id, hrm_time_tracking_organization_id, created_at, updated_at, or deleted_at from client input.
 *
 * 4. If the name is being changed, enforce the database uniqueness rule on the pair [hrm_time_tracking_organization_id, name] among active department records in the same organization. Reject duplicate names within the organization.
 *
 * 5. If a parent department is provided, load that parent from hrm_time_tracking_departments and ensure: (a) it exists and is active, (b) it belongs to the same current organization, (c) its id is not equal to the target department id, and (d) it does not already have its own parent_department_id. These checks enforce the one-level hierarchy rule and prevent self-parenting and deeper nesting. If parent is null, treat the department as top-level.
 *
 * 6. Persist the update in a single transaction. Set name, description, and parent_department_id from the validated request and update updated_at to the current timestamp. Leave organization linkage unchanged.
 *
 * 7. Return the refreshed department entity after update. Include enough relation data for downstream DTO mapping if the response type expects parent or child summary information, but avoid recursive expansion that could create circular structures.
 *
 * 8. Publish or trigger the department-updated real-time propagation path if the service architecture supports live department views, so department lists and employee assignment selectors in the same organization reflect the latest structure.
 *
 * Handle error cases explicitly: unauthorized management attempt, department not found in current organization, attempt to use a department from another organization, duplicate department name within one organization, self-parent assignment, parent with its own parent, and attempts to update a logically removed record.
 * @path /hrmTimeTracking/owner/departments/:departmentId
 * @accessor api.functional.hrmTimeTracking.owner.departments.update
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
     * Target department ID
     */
    departmentId: string & tags.Format<"uuid">;

    /**
     * Department update information
     */
    body: IHrmTimeTrackingDepartment.IUpdate;
  };
  export type Body = IHrmTimeTrackingDepartment.IUpdate;
  export type Response = IHrmTimeTrackingDepartment;

  export const METADATA = {
    method: "PUT",
    path: "/hrmTimeTracking/owner/departments/:departmentId",
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
    `/hrmTimeTracking/owner/departments/${encodeURIComponent(props.departmentId ?? "null")}`;
  export const random = (): IHrmTimeTrackingDepartment =>
    typia.random<IHrmTimeTrackingDepartment>();
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
      assert.param("departmentId")(() => typia.assert(props.departmentId));
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
 * Permanently remove a department from the currently selected organization.
 *
 * This operation deletes one organization-scoped department record identified by `departmentId` from the tenant-specific department structure. In the underlying `hrm_time_tracking_departments` table, a department stores raw structural information such as its owning organization through `hrm_time_tracking_organization_id`, its optional one-level hierarchy link through `parent_department_id`, and its display fields `name` and `description`. The operation is intended for organizational structure maintenance, not workforce removal. The requirements explicitly state that when a department is deleted, the department is removed from the current organization's structure and department list while affected employees remain valid members of the organization.
 *
 * Access to this operation is restricted to users acting within their currently selected organization and holding organization management permission. Organization owners have full administrative authority within the organization, and managers may perform this operation only when their assigned permissions allow organization management. Employees without department-management authority may still view department information in read-only scenarios, but they must not be allowed to create, update, or delete department records. If a caller attempts to delete a department outside the current organization context or without the required authority, the request must be rejected.
 *
 * The delete behavior must preserve employee workforce continuity. Business requirements and department rules state that deleting a department must not delete any employees. Instead, every employee assigned to the deleted department must remain in the organization while only the department assignment is cleared. This means the department deletion is treated as an organizational structure update rather than an employee removal action. After completion, employees formerly linked to the removed department continue to exist as valid organization members with their other records preserved.
 *
 * This operation also affects live views and follow-up behavior. After deletion, the deleted department must no longer appear in department lists or employee form department options for the current organization, and attempts to access the deleted department should be rejected. The requirements also state that a department deleted event is published within the current organization so live administration and employee-facing lists can refresh accordingly. Clients commonly use this operation together with department listing endpoints to refresh the organization structure after the delete succeeds.
 *
 * @param props.connection
 * @param props.departmentId Unique identifier of the department to remove from the current organization.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor owner
 * @x-autobe-specification Implement a service-layer delete flow for a single
 *   department in the current organization context.
 *
 * 1. Resolve the authenticated actor and current organization context from session state. Authorize only organization owners or managers who possess organization management permission for the selected organization. Deny the request if the actor lacks permission.
 *
 * 2. Query `hrm_time_tracking_departments` by `id = departmentId` and ensure the record belongs to the actor's current organization by matching `hrm_time_tracking_organization_id`. If no matching department exists in the current organization scope, return a not-found or forbidden result according to the platform's organization-isolation policy, but do not expose cross-organization existence.
 *
 * 3. Within a transaction, load all organization employee records currently assigned to this department and clear their department assignment before finalizing department removal. The business requirement is that employees remain in the organization and only the deleted department assignment is removed. Preserve every other employee record attribute.
 *
 * 4. Delete the department record from `hrm_time_tracking_departments`. Because the schema includes `parent_department_id` and a self-relation with cascade behavior, ensure the implementation follows the intended business rule for hierarchy impact and does not violate referential integrity. The primary required effect is removal of the targeted department from the current organization's structure.
 *
 * 5. Commit the transaction only if both employee assignment clearing and department deletion succeed together. On failure, roll back all changes so no employee is left with a partially applied structural update.
 *
 * 6. After commit, publish the department deleted event for the current organization so live department lists, management views, and employee department option sets can refresh.
 *
 * 7. Future reads for this `departmentId` must be rejected as deleted or not found. Return success with no response body.
 *
 * Edge cases:
 * - Reject deletion attempts from actors without organization management permission.
 * - Reject deletion attempts when the department is outside the current organization context.
 * - Preserve employees even when many employees were assigned to the deleted department.
 * - Do not delete employee records as part of this operation.
 * - Ensure concurrent deletion or reassignment scenarios are handled transactionally to avoid stale department references.
 * @path /hrmTimeTracking/owner/departments/:departmentId
 * @accessor api.functional.hrmTimeTracking.owner.departments.erase
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
     * Unique identifier of the department to remove from the current organization.
     */
    departmentId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/hrmTimeTracking/owner/departments/:departmentId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/hrmTimeTracking/owner/departments/${encodeURIComponent(props.departmentId ?? "null")}`;
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
      assert.param("departmentId")(() => typia.assert(props.departmentId));
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
