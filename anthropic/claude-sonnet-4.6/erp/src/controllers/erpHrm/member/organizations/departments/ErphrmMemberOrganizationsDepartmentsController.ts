import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmDepartment } from "../../../../../api/structures/IErpHrmDepartment";
import { IPageIErpHrmDepartment } from "../../../../../api/structures/IPageIErpHrmDepartment";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteErpHrmMemberOrganizationsOrganizationIdDepartmentsDepartmentId } from "../../../../../providers/deleteErpHrmMemberOrganizationsOrganizationIdDepartmentsDepartmentId";
import { getErpHrmMemberOrganizationsOrganizationIdDepartmentsDepartmentId } from "../../../../../providers/getErpHrmMemberOrganizationsOrganizationIdDepartmentsDepartmentId";
import { patchErpHrmMemberOrganizationsOrganizationIdDepartments } from "../../../../../providers/patchErpHrmMemberOrganizationsOrganizationIdDepartments";
import { postErpHrmMemberOrganizationsOrganizationIdDepartments } from "../../../../../providers/postErpHrmMemberOrganizationsOrganizationIdDepartments";
import { putErpHrmMemberOrganizationsOrganizationIdDepartmentsDepartmentId } from "../../../../../providers/putErpHrmMemberOrganizationsOrganizationIdDepartmentsDepartmentId";

@Controller("/erpHrm/member/organizations/:organizationId/departments")
export class ErphrmMemberOrganizationsDepartmentsController {
  /**
   * Create a new department within a specific organization.
   *
   * This operation allows an authenticated organization member holding the **organization management permission** to create a new department scoped to their organization. The department serves as an organizational grouping used to classify employees within a single organization by functional area, team, or business unit.
   *
   * A department requires a `name` that must be unique within the organization. An optional `description` may be provided to clarify the department's purpose or scope. Optionally, a `parentId` can be specified to place the new department one level below an existing top-level department, establishing a two-tier hierarchical structure. The parent department referenced must already exist within the same organization and must itself be a top-level department (i.e., it must not already be a child of another department). This constraint ensures the hierarchy is limited to exactly one level of nesting.
   *
   * The newly created department is immediately visible to all members of the organization regardless of their role or permission level. Viewing departments is available to all organization members, but creation is restricted to members with the organization management permission. Any attempt to create a department without this permission is rejected and no change is made.
   *
   * Departments are strictly scoped to the organization in which they are created. Members of other organizations have no visibility into or access to this organization's departments. The organization context is enforced server-side based on the `organizationId` path parameter combined with the authenticated member's current session.
   *
   * This operation corresponds to the `erp_hrm_departments` table, which stores the department's `name`, optional `description`, `organization_id` (derived from the path), optional `parent_id`, and audit timestamps (`created_at`, `updated_at`). The `deleted_at` field remains null for newly created records.
   *
   * Related operations: Use `GET /organizations/{organizationId}/departments` (or the paginated list endpoint) to retrieve all departments after creation. Use `PUT /organizations/{organizationId}/departments/{departmentId}` to edit an existing department's name, description, or parent assignment.
   *
   * @param connection
   * @param organizationId The UUID of the organization within which the new department will be created.
   * @param body Details required to create a new department, including name, optional description, and optional parent department reference.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Authenticate the requesting member and verify
     *   the member belongs to the organization identified by `organizationId`
     *   (check erp_hrm_organization_members where organization_id =
     *   organizationId and member_id = authenticated member's id and deleted_at
     *   IS NULL).
   *
   * 2. Verify the requesting member's role has the 'organization manage' permission by checking erp_hrm_roles and erp_hrm_role_permissions. If the member lacks this permission, return 403 Forbidden.
   *
   * 3. Confirm the organization exists and is not deleted (erp_hrm_organizations where id = organizationId and deleted_at IS NULL). Return 404 if not found.
   *
   * 4. Validate request body:
   *    - `name` must be non-empty string.
   *    - Check uniqueness: no existing non-deleted department in the same organization has the same name (SELECT from erp_hrm_departments where organization_id = organizationId and name = request.name and deleted_at IS NULL). If duplicate, return 409 Conflict.
   *    - `parentId` (optional): if provided, verify the referenced department exists within the same organization (organization_id = organizationId) and is not deleted (deleted_at IS NULL) and is itself a top-level department (parent_id IS NULL). If it is already a child department, return 422 Unprocessable Entity.
   *
   * 5. Insert a new record into erp_hrm_departments:
   *    - id: generate new UUID
   *    - organization_id: organizationId from path
   *    - parent_id: request.parentId or NULL
   *    - name: request.name
   *    - description: request.description or NULL
   *    - created_at: current timestamp
   *    - updated_at: current timestamp
   *    - deleted_at: NULL
   *
   * 6. Return the newly created department record as IErpHrmDepartment, including all fields and resolved parent department reference if applicable.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmDepartment.ICreate,
  ): Promise<IErpHrmDepartment> {
    try {
      return await postErpHrmMemberOrganizationsOrganizationIdDepartments({
        member,
        organizationId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a paginated and filtered list of departments within a specific organization.
   *
   * This operation returns all departments that belong to the specified organization, presented as a paginated list. Each entry in the result includes the department's name, optional description, and its optional parent department reference, allowing callers to understand the organizational hierarchy at a glance.
   *
   * All authenticated members of the organization — regardless of their assigned role or permission level — are permitted to view the department list. This broad visibility is by design: departments serve as a descriptive classification layer that all employees need to navigate, such as when filtering the employee directory by department or understanding team structure.
   *
   * Data isolation is strictly enforced: only departments belonging to the organization identified by `organizationId` are returned. A member operating within a different organization context cannot access the department list of another organization, even if they hold membership in multiple organizations. Unauthenticated requests and requests from users who are not members of the specified organization are rejected.
   *
   * The underlying `erp_hrm_departments` table stores each department record with a required `name` (unique within the organization), an optional `description`, and an optional `parent_id` referencing another department in the same organization for one-level hierarchical grouping. Only departments where `deleted_at` is null are included in the response — removed departments are not surfaced.
   *
   * Search and filtering capabilities may include partial name matching, filtering by parent department (to retrieve only top-level or child departments), and configurable pagination with sorting. The caller provides these criteria via the request body.
   *
   * Related operations: use `POST /organizations/{organizationId}/departments` to create a new department, `PUT /organizations/{organizationId}/departments/{departmentId}` to update an existing department, and `DELETE /organizations/{organizationId}/departments/{departmentId}` to remove a department.
   *
   * @param connection
   * @param organizationId The UUID of the organization whose department list is being retrieved (globally unique).
   * @param body Search criteria and pagination parameters for filtering the department list.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Authenticate the requesting member and verify
     *   they are an active member of the organization identified by
     *   `organizationId`. Reject with 403 if not a member or organization not
     *   found (deleted_at IS NOT NULL).
   *
   * 2. Query the `erp_hrm_departments` table with `WHERE organization_id = :organizationId AND deleted_at IS NULL`.
   *
   * 3. Apply optional filters from the request body:
   *    - `keyword`: partial name match using the GIN trigram index on `name` column (ilike or trigram similarity search).
   *    - `parentId`: filter by `parent_id = :parentId` (or `parent_id IS NULL` for top-level departments when explicitly requested).
   *
   * 4. Apply sorting (default: `created_at ASC`, or by `name ASC` if requested).
   *
   * 5. Apply pagination using the `IRequest` pagination parameters (page number and page size). Return the total count along with the paginated data.
   *
   * 6. For each department in the result set, include: id, name, description, parent_id (and optionally a summary of the parent department), created_at, updated_at.
   *
   * 7. Return the paginated result as `IPageIErpHrmDepartment.ISummary` with pagination metadata (total count, current page, page size).
   *
   * Edge cases:
   * - If the organization does not exist or is soft-deleted, return 404.
   * - If the member is not part of the organization, return 403.
   * - If no departments exist, return an empty page result (not 404).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmDepartment.IRequest,
  ): Promise<IPageIErpHrmDepartment.ISummary> {
    try {
      return await patchErpHrmMemberOrganizationsOrganizationIdDepartments({
        member,
        organizationId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the details of a specific department within an organization.
   *
   * This operation returns full detail for a single department record from the `erp_hrm_departments` table, identified by its unique UUID and scoped to the specified organization. The department entity represents an organizational grouping used to classify employees within a single organization by functional area, team, or business unit.
   *
   * Access to this endpoint is granted to all authenticated members of the organization regardless of their role or permission level. Viewing department details does not require the organization management permission — it is available to Owners, Managers, and Employees alike. However, the requesting member must belong to the organization identified by `organizationId`; attempting to access departments of a different organization will be rejected to enforce strict per-organization data isolation.
   *
   * The response includes the department's display name (unique within the organization), its optional description, and an optional reference to its parent department when a hierarchical grouping has been established. Departments support a shallow two-tier hierarchy: a department may have one parent, but that parent cannot itself be a child of another department. This parent relationship is returned as part of the response to allow clients to understand the organizational structure.
   *
   * Departments that have been removed (i.e., those with a non-null `deleted_at` timestamp in the database) are not returned by this operation. Requesting the ID of a removed department results in a 404 Not Found response.
   *
   * This endpoint is commonly used in conjunction with `GET /erpHrm/member/organizations/{organizationId}/departments` (list) to display the full organizational hierarchy, and alongside employee list endpoints when filtering or assigning members to departments.
   *
   * @param connection
   * @param organizationId The UUID of the organization that owns the department. Used to enforce organizational data isolation.
   * @param departmentId The UUID of the target department to retrieve.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Authenticate the requesting member and resolve
     *   their current organization context. 2. Verify the requesting member
     *   belongs to the organization identified by organizationId (i.e., an
     *   active erp_hrm_organization_members record exists with organization_id
     *   = organizationId and member_id = authenticated member's id, and
     *   deleted_at IS NULL). 3. If the member does not belong to this
     *   organization, reject with 403 Forbidden. 4. Query the
     *   erp_hrm_departments table WHERE id = departmentId AND organization_id =
     *   organizationId AND deleted_at IS NULL. 5. If no matching record is
     *   found, respond with 404 Not Found. 6. If found, return the department
     *   record including its id, organization_id, parent_id (nullable), name,
     *   description (nullable), created_at, updated_at. 7. Optionally, join
     *   with the parent department record (if parent_id is not null) to return
     *   parent department's id and name as a nested summary object. 8. All
     *   members of the organization — regardless of their role or permission
     *   level — are authorized to retrieve department details. No additional
     *   permission check is required beyond organizational membership
     *   verification.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":departmentId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("departmentId")
    departmentId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmDepartment> {
    try {
      return await getErpHrmMemberOrganizationsOrganizationIdDepartmentsDepartmentId(
        {
          member,
          organizationId,
          departmentId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing department's name, description, and/or parent department assignment within an organization.
   *
   * This operation allows authorized users to modify the identifying and structural attributes of a department. The editable fields include the department's display name, its optional human-readable description, and its optional parent department reference — which controls its position within the two-tier organizational hierarchy.
   *
   * Only members who hold the organization management permission (`org:manage`) within the target organization are allowed to perform this operation. Any attempt by a member who lacks this permission — regardless of their role level — is rejected without making any change to the department record. Members with only employee-view or project-manage permissions cannot edit departments.
   *
   * The department being updated is identified by its UUID (`departmentId`) and must belong to the organization identified by `organizationId`. The system enforces strict data isolation: a member scoped to one organization cannot edit departments in another organization, even if they hold membership there.
   *
   * If a new parent department is specified in the update, the system validates that the one-level nesting constraint is satisfied. The designated parent must itself be a top-level department within the same organization — that is, the parent must not already have a parent of its own. Attempting to assign a sub-department as the parent of another department is rejected. Additionally, a department cannot designate itself as its own parent. If the department being updated already has active child departments, it cannot be given a parent, as this would create a two-level nesting depth.
   *
   * The department's name must remain unique within the organization after the update, enforced by the `@@unique([organization_id, name])` constraint on the `erp_hrm_departments` table. If the submitted name conflicts with another existing department's name in the same organization, the update is rejected.
   *
   * Upon successful update, the `updated_at` timestamp on the `erp_hrm_departments` record is refreshed. The updated information is immediately visible to all members of the organization when they browse the department list. Related data — including member assignments, child department references, and any other organizational records — is not affected by this update.
   *
   * Prerequisite: The organization and the department must both exist and be active (not marked as removed). The target department can be retrieved via `GET /erpHrm/member/organizations/{organizationId}/departments/{departmentId}` and the full department list via `PATCH /erpHrm/member/organizations/{organizationId}/departments`.
   *
   * @param connection
   * @param organizationId The UUID of the organization to which the department belongs (global scope).
   * @param departmentId The UUID of the department to update (scoped to the organization).
   * @param body Updated field values for the department, including name, optional description, and optional parent department assignment.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Authenticate the requesting member and confirm
     *   they hold an active membership in the organization identified by
     *   `organizationId`. Reject with 403 if the member does not belong to this
     *   organization or if their session's organization context does not match.
   *
   * 2. Load the member's role and verify they possess the organization management permission. Reject with 403 if the permission is absent.
   *
   * 3. Look up the `erp_hrm_departments` record where `id = departmentId` AND `organization_id = organizationId` AND `deleted_at IS NULL`. Return 404 if not found.
   *
   * 4. Validate the request body fields:
   *    a. `name`: Required. Check `@@unique([organization_id, name])` — query for any existing department with the same organization_id and the new name, excluding the current department's id. Reject with 422 if a conflict is found.
   *    b. `description`: Optional, nullable. Accept any string or null.
   *    c. `parent_id`: Optional, nullable.
   *       - If provided and non-null: verify the referenced department exists in the same organization (`organization_id = organizationId`) and is not deleted. Reject with 422 if not found.
   *       - Verify the referenced parent has `parent_id IS NULL` (is a top-level department). Reject with 422 if the target parent is itself a sub-department.
   *       - Verify `parent_id != departmentId` (cannot self-reference). Reject with 422 if equal.
   *       - If the current department has children (i.e., other departments reference it as parent), it is still allowed to have its own parent changed — the one-level constraint only prevents grandchild nesting, not re-parenting a department that has children (since those children would now be grandchildren — this scenario must also be checked: if the department being updated has children, it cannot be given a parent, as that would create 2-level nesting). Reject with 422 if the department already has active children and a non-null parent_id is requested.
   *
   * 5. Perform the UPDATE on `erp_hrm_departments`: set `name`, `description`, `parent_id`, and `updated_at = now()` where `id = departmentId`.
   *
   * 6. Return the updated `erp_hrm_departments` record, including its relations (organization summary, parent department summary if present).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":departmentId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("departmentId")
    departmentId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmDepartment.IUpdate,
  ): Promise<IErpHrmDepartment> {
    try {
      return await putErpHrmMemberOrganizationsOrganizationIdDepartmentsDepartmentId(
        {
          member,
          organizationId,
          departmentId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes a department from the specified organization.
   *
   * This operation deletes a department record identified by its unique ID within the target organization. Only authenticated members who hold the organization management permission are authorized to perform this action. Attempts by users who lack this permission — including those with only employee view or project management permissions — will be rejected without making any changes to department data.
   *
   * When a department is deleted, all organization members who were previously assigned to that department have their department association cleared and set to null. Their employment records, roles, contracts, timelogs, timesheets, and all other associated data remain fully intact. No employee records are removed as a result of this operation.
   *
   * If the deleted department was serving as a parent to any child departments, those child departments will have their parent reference cleared as well, promoting them to top-level departments within the organization. This cascade happens automatically as part of the deletion and does not require any prior reassignment of child departments.
   *
   * The department name is required to be unique within an organization (enforced by the @@unique([organization_id, name]) constraint in the erp_hrm_departments table). Once deleted, the name may be reused for a new department within the same organization.
   *
   * This operation is irreversible. Once deleted, the department record and its structural relationships cannot be recovered. Callers should use `GET /organizations/{organizationId}/departments/{departmentId}` to confirm the department's current state before issuing a deletion request if needed.
   *
   * @param connection
   * @param organizationId The unique identifier (UUID) of the organization that owns the department.
   * @param departmentId The unique identifier (UUID) of the department to be deleted.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Authenticate the requesting member's session
     *   and resolve their current organization context. 2. Verify that the
     *   requesting member belongs to the organization identified by
     *   organizationId. Return 403 if not. 3. Check that the member's assigned
     *   role includes the organization management permission code. Return 403
     *   Forbidden if not. 4. Look up the erp_hrm_departments record where id =
     *   departmentId AND organization_id = organizationId AND deleted_at IS
     *   NULL. Return 404 if not found. 5. Begin a database transaction: a. Set
     *   deleted_at = NOW() on the target erp_hrm_departments record
     *   (soft-delete at DB layer). b. Update all erp_hrm_organization_members
     *   records where department_id = departmentId: set department_id = NULL.
     *   c. Update all erp_hrm_departments records where parent_id =
     *   departmentId: set parent_id = NULL. 6. Commit the transaction. If any
     *   step fails, rollback and return 500. 7. Return HTTP 204 No Content on
     *   success.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":departmentId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("departmentId")
    departmentId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteErpHrmMemberOrganizationsOrganizationIdDepartmentsDepartmentId(
        {
          member,
          organizationId,
          departmentId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
