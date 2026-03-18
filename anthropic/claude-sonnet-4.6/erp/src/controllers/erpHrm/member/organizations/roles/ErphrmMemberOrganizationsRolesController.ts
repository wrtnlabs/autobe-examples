import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmRole } from "../../../../../api/structures/IErpHrmRole";
import { IPageIErpHrmRole } from "../../../../../api/structures/IPageIErpHrmRole";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteErpHrmMemberOrganizationsOrganizationIdRolesRoleId } from "../../../../../providers/deleteErpHrmMemberOrganizationsOrganizationIdRolesRoleId";
import { getErpHrmMemberOrganizationsOrganizationIdRolesRoleId } from "../../../../../providers/getErpHrmMemberOrganizationsOrganizationIdRolesRoleId";
import { patchErpHrmMemberOrganizationsOrganizationIdRoles } from "../../../../../providers/patchErpHrmMemberOrganizationsOrganizationIdRoles";
import { postErpHrmMemberOrganizationsOrganizationIdRoles } from "../../../../../providers/postErpHrmMemberOrganizationsOrganizationIdRoles";
import { putErpHrmMemberOrganizationsOrganizationIdRolesRoleId } from "../../../../../providers/putErpHrmMemberOrganizationsOrganizationIdRolesRoleId";

@Controller("/erpHrm/member/organizations/:organizationId/roles")
export class ErphrmMemberOrganizationsRolesController {
  /**
   * Create a new custom role within the specified organization.
   *
   * This operation allows an organization owner to define a new custom role by providing a unique display name and selecting one or more permission codes from the available catalogue. The newly created role is immediately available to be assigned to organization members. All three built-in roles (Owner, Manager, Employee) are created automatically when an organization is provisioned and cannot be created through this endpoint.
   *
   * Custom roles belong exclusively to the organization in which they are created, enforcing the multi-tenancy isolation model described in the system design. A role created in one organization is entirely invisible and inaccessible from any other organization context, even if the same user belongs to multiple organizations.
   *
   * The role's permission codes are stored as individual rows in the `erp_hrm_role_permissions` child table. Each code unlocks a specific category of actions within the organization. Available permission codes are: `org:manage`, `employee:manage`, `employee:view`, `project:manage`, `project:view`, `time:manage`, `time:approve`, `time:view_all`, and `report:view`. The combination of `role_id` and `permission_code` is unique, so duplicate codes in the request are silently deduplicated.
   *
   * The role `name` must be unique within the organization. Attempting to create a role with a name identical to an existing role (including built-in role names such as 'Owner', 'Manager', or 'Employee') will result in a conflict error.
   *
   * Only members who hold a role with the `org:manage` permission (typically the organization Owner) are authorized to perform this operation. Other members will receive a forbidden error.
   *
   * Related operations:
   * - `PATCH /organizations/{organizationId}/roles` — list all roles in the organization.
   * - `GET /organizations/{organizationId}/roles/{roleId}` — retrieve details of a specific role.
   * - `PUT /organizations/{organizationId}/roles/{roleId}` — update an existing custom role's name or permission codes.
   * - `DELETE /organizations/{organizationId}/roles/{roleId}` — remove a custom role when no members are assigned to it.
   *
   * @param connection
   * @param organizationId The UUID of the organization in which the new custom role will be created.
   * @param body Name and permission codes for the new custom role to be created.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Authenticate the requesting member and verify they belong to the organization identified by `organizationId` (look up `erp_hrm_organization_members` where `organization_id = organizationId` and `member_id = currentMemberId` and `deleted_at IS NULL`).
   * 2. Verify the member's assigned role (via `erp_hrm_roles` → `erp_hrm_role_permissions`) includes the `org:manage` permission code. Reject with 403 Forbidden if not.
   * 3. Validate that the provided `name` is non-empty and does not already exist in `erp_hrm_roles` for this organization (`@@unique([erp_hrm_organization_id, name])`). Return 409 Conflict if duplicate.
   * 4. Validate each supplied `permission_code` value is one of the allowed codes: `org:manage`, `employee:manage`, `employee:view`, `project:manage`, `project:view`, `time:manage`, `time:approve`, `time:view_all`, `report:view`. Reject with 422 for any unrecognized code.
   * 5. Within a single database transaction:
   *    a. Insert a new row into `erp_hrm_roles` with `erp_hrm_organization_id = organizationId`, `name`, `is_builtin = false`, and current timestamps for `created_at` and `updated_at`.
   *    b. Deduplicate the supplied permission codes and insert one row per unique code into `erp_hrm_role_permissions` linked to the new role.
   * 6. Return the fully populated role record including its permission entries as `IErpHrmRole`.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmRole.ICreate,
  ): Promise<IErpHrmRole> {
    try {
      return await postErpHrmMemberOrganizationsOrganizationIdRoles({
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
   * Retrieve a paginated, filtered list of roles belonging to a specific organization.
   *
   * This operation returns all roles — both built-in and custom — that are scoped to the given organization. Roles are named permission sets that govern what each organization member is allowed to do within the organization. Every organization always has exactly three built-in roles (Owner, Manager, and Employee), identified by the `is_builtin` flag, plus any custom roles that the organization owner has defined.
   *
   * The organization context is strictly enforced: only roles belonging to the organization identified by `organizationId` are returned. No cross-organization role data is ever exposed, in accordance with the platform's multi-tenancy isolation policy. The requesting member must be an authenticated member of the target organization.
   *
   * The request body accepts optional search criteria including a name keyword (partial match) and an `is_builtin` filter to distinguish built-in roles from custom ones. Pagination and sorting parameters are also supported, allowing clients to page through large role sets efficiently.
   *
   * Each role in the response includes its identifier, display name, built-in flag, the set of permission codes it grants (sourced from the `erp_hrm_role_permissions` child table), and timestamps. This list is typically used by administrators to populate role-assignment dropdowns, display the organization's access control structure, or manage custom role definitions.
   *
   * Related operations: use `POST /organizations/{organizationId}/roles` to create a new custom role, `PUT /organizations/{organizationId}/roles/{roleId}` to update an existing custom role's name or permissions, and `DELETE /organizations/{organizationId}/roles/{roleId}` to remove a custom role that has no assigned members.
   *
   * @param connection
   * @param organizationId The UUID of the organization whose roles are to be listed.
   * @param body Search filters and pagination parameters for querying the organization's roles.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Validate that the authenticated member belongs to the organization identified by organizationId. Reject with 403 if the member is not part of this organization or the organization is deleted (deleted_at IS NOT NULL).
   *
   * 2. Parse the request body (IErpHrmRole.IRequest) for optional filters:
   *    - name: string keyword for partial/trigram name search (uses the GIN trigram index on erp_hrm_roles.name)
   *    - is_builtin: optional boolean to filter only built-in or only custom roles
   *    - Pagination: page number, page size (default 20, max 100)
   *    - Sorting: by name (asc/desc) or created_at (asc/desc)
   *
   * 3. Query erp_hrm_roles WHERE erp_hrm_organization_id = organizationId, applying any name/is_builtin filters. Use the @@unique([erp_hrm_organization_id, name]) index for organization scoping.
   *
   * 4. For each matching role, join/load the erp_hrm_role_permissions child records to include the list of permission codes in the summary response.
   *
   * 5. Apply ordering and pagination (LIMIT/OFFSET or cursor). Return total count for pagination metadata.
   *
   * 6. Return IPageIErpHrmRole.ISummary with pagination object and data array of role summaries. Each summary includes: id, name, is_builtin, permission codes array, created_at, updated_at.
   *
   * Edge cases:
   * - If organizationId does not exist or is deleted, return 404.
   * - If the member session does not belong to this organization, return 403.
   * - An organization always has at least 3 built-in roles; an empty result should never occur for a valid organization.
   * - No specific permission code is required to view the role list (all members may view roles to understand their own permissions), unless business rules restrict this — apply the least-privilege access check as per member role.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmRole.IRequest,
  ): Promise<IPageIErpHrmRole.ISummary> {
    try {
      return await patchErpHrmMemberOrganizationsOrganizationIdRoles({
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
   * Retrieve the full detail of a specific role within an organization.
   *
   * This operation returns a single `erp_hrm_roles` record identified by its UUID (`roleId`), scoped to the organization identified by `organizationId`. The response includes the role's display name, whether it is a system-defined built-in role (`is_builtin`), all assigned permission codes from the `erp_hrm_role_permissions` child table, and the role's timestamps.
   *
   * Roles are named permission sets that define what organization members are allowed to do within their organization. Every organization has exactly three immutable built-in roles — Owner, Manager, and Employee — and may have additional custom roles created by the organization owner. This endpoint allows retrieval of any role regardless of whether it is built-in or custom.
   *
   * Access is restricted to authenticated members of the target organization. Only members whose assigned role grants the `employee:manage` or `org:manage` permission code may view role details. Members without these permissions are denied access. All data is strictly isolated to the organization identified by `organizationId`; roles from other organizations are never returned regardless of the caller's other memberships.
   *
   * The `organizationId` path parameter enforces multi-tenancy: every request must be scoped to the caller's current active organization context, and the system validates that the requested role belongs to that organization before returning any data. If the role does not exist within the specified organization, a 404 error is returned.
   *
   * Related operations: use `PATCH /organizations/{organizationId}/roles` to retrieve a paginated list of all roles in the organization, `POST /organizations/{organizationId}/roles` to create a new custom role, `PUT /organizations/{organizationId}/roles/{roleId}` to update a custom role's name or permissions, and `DELETE /organizations/{organizationId}/roles/{roleId}` to remove a custom role that has no assigned members.
   *
   * @param connection
   * @param organizationId The UUID of the organization to which the role belongs (global scope).
   * @param roleId The UUID of the target role to retrieve (scoped to the organization).
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Authenticate the calling member and resolve their current organization context. Reject with 401 if not authenticated.
   * 2. Validate that `organizationId` corresponds to an existing, non-deleted organization (`erp_hrm_organizations.deleted_at IS NULL`). Return 404 if not found.
   * 3. Verify that the calling member has an active `erp_hrm_organization_members` record in the specified organization (`deleted_at IS NULL`, `status = 'active'`). Return 403 if not a member.
   * 4. Check that the calling member's assigned role has the `employee:manage` or `org:manage` permission code (via join to `erp_hrm_role_permissions`). Return 403 if neither permission is present.
   * 5. Query `erp_hrm_roles` WHERE `id = roleId` AND `erp_hrm_organization_id = organizationId`. Return 404 if no matching record found.
   * 6. Eagerly load the associated `erp_hrm_role_permissions` records for the role to include all permission codes in the response.
   * 7. Map the result to `IErpHrmRole` DTO, including: `id`, `organizationId` (from `erp_hrm_organization_id`), `name`, `isBuiltin` (from `is_builtin`), `permissions` (array of `permission_code` strings from child table), `createdAt`, `updatedAt`.
   * 8. Return 200 with the `IErpHrmRole` payload.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":roleId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("roleId")
    roleId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmRole> {
    try {
      return await getErpHrmMemberOrganizationsOrganizationIdRolesRoleId({
        member,
        organizationId,
        roleId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the name and permission codes of a custom role within a specific organization.
   *
   * This operation allows an authorized organization member to modify an existing custom role record stored in the `erp_hrm_roles` table. A role is a named grouping of permission codes that collectively define what an organization member is allowed to do within the organization. The updatable fields are the role's `name` (which must remain unique within the organization per the `@@unique([erp_hrm_organization_id, name])` constraint) and its associated permission codes stored in the `erp_hrm_role_permissions` child table.
   *
   * Only custom roles (`is_builtin = false`) may be modified through this endpoint. The three built-in roles — Owner, Manager, and Employee — are system-defined and their names and permissions cannot be altered. Any attempt to update a built-in role will be rejected with an appropriate error.
   *
   * The caller must be an authenticated member of the target organization and must hold the `org:manage` permission code through their assigned role. All data is strictly scoped to the specified organization; the role identified by `roleId` must belong to the organization identified by `organizationId`, otherwise the request is rejected.
   *
   * Permission codes available for assignment are: `org:manage`, `employee:manage`, `employee:view`, `project:manage`, `project:view`, `time:manage`, `time:approve`, `time:view_all`, and `report:view`. The update replaces the role's entire set of permission codes with the new set provided in the request body — this is a full replacement, not a partial merge. The underlying `erp_hrm_role_permissions` rows are deleted and re-inserted within a single transaction to reflect the new permission set.
   *
   * Upon a successful update, the `updated_at` timestamp on the `erp_hrm_roles` record is refreshed, and the role's new permissions take effect immediately for all organization members currently assigned to this role. Related operations include `PATCH /organizations/{organizationId}/roles` to list roles, `GET /organizations/{organizationId}/roles/{roleId}` to retrieve a single role, and `POST /organizations/{organizationId}/roles` to create a new custom role.
   *
   * @param connection
   * @param organizationId The UUID of the organization that owns the role (global scope).
   * @param roleId The UUID of the role to update (scoped to the organization).
   * @param body Updated name and permission codes for the custom role.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Authenticate the requesting member and resolve their organization context. Verify the member belongs to the organization identified by `organizationId`.
   * 2. Check that the requesting member's assigned role includes the `org:manage` permission code. Reject with 403 if not.
   * 3. Query `erp_hrm_roles` by `id = roleId` AND `erp_hrm_organization_id = organizationId`. Return 404 if no matching record is found.
   * 4. Check the `is_builtin` flag on the found role. If `is_builtin = true`, reject with 422 or 409 — built-in roles cannot be modified.
   * 5. Validate the incoming request body:
   *    - `name` must be a non-empty string. Check uniqueness within the organization using the `@@unique([erp_hrm_organization_id, name])` constraint. If a different role in the same organization already has that name, return 409 Conflict.
   *    - `permissionCodes` must be a non-empty array (or allow empty array if all permissions are to be revoked) containing only valid permission code strings from the defined set: `org:manage`, `employee:manage`, `employee:view`, `project:manage`, `project:view`, `time:manage`, `time:approve`, `time:view_all`, `report:view`. Reject invalid codes with 400.
   * 6. Execute the update in a single database transaction:
   *    a. Update the `erp_hrm_roles` record: set `name` to the new value, set `updated_at` to the current UTC timestamp.
   *    b. Delete all existing `erp_hrm_role_permissions` rows where `role_id = roleId`.
   *    c. Insert new `erp_hrm_role_permissions` rows for each permission code in the request, each with a new UUID `id`, the `role_id`, the `permission_code`, and `created_at` set to the current UTC timestamp.
   * 7. Return the updated role entity including its full permission code list, reflecting the new state from the database.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":roleId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("roleId")
    roleId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmRole.IUpdate,
  ): Promise<IErpHrmRole> {
    try {
      return await putErpHrmMemberOrganizationsOrganizationIdRolesRoleId({
        member,
        organizationId,
        roleId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently delete a custom role from an organization.
   *
   * This operation permanently removes a custom role identified by `roleId` from the organization identified by `organizationId`. Upon successful completion, the role record and all its associated permission codes (stored in the `erp_hrm_role_permissions` table) are irreversibly removed from the database. The deleted role record is returned in the response to allow callers to confirm the removal.
   *
   * Only the organization owner is permitted to perform this operation. Any authenticated member who does not hold the Owner built-in role will receive an authorization error regardless of any other permissions they may have.
   *
   * Built-in roles — Owner, Manager, and Employee — are identified by the `is_builtin` flag in the `erp_hrm_roles` table and are permanently protected. Attempting to delete any built-in role will result in an error, even if the requester is the organization owner.
   *
   * A custom role may only be deleted when no `erp_hrm_organization_members` records are currently assigned to it. If one or more members hold the target role, the deletion request will be rejected to prevent member records from being left without a role assignment. The caller must reassign all affected members to a different role before the deletion can proceed.
   *
   * Upon successful deletion, the system records the action in the organization's activity log (`erp_hrm_activity_logs`), capturing who deleted the role and when.
   *
   * Related operations: Use `PATCH /organizations/{organizationId}/roles` to list all roles in the organization and identify members assigned to the target role before attempting deletion. Use `PUT /organizations/{organizationId}/members/{memberId}` to reassign members away from the role prior to deletion.
   *
   * @param connection
   * @param organizationId The UUID of the organization that owns the role.
   * @param roleId The UUID of the custom role to be permanently deleted.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Authenticate the requesting member and verify their session is scoped to the target organization (organizationId).
   * 2. Verify the requester holds the Owner built-in role within that organization. If not, return 403 Forbidden.
   * 3. Query erp_hrm_roles WHERE id = roleId AND erp_hrm_organization_id = organizationId. If not found, return 404 Not Found.
   * 4. Check the is_builtin flag on the retrieved role. If is_builtin = true, return 400 Bad Request with an error indicating built-in roles cannot be deleted.
   * 5. Query erp_hrm_organization_members WHERE erp_hrm_role_id = roleId to check for currently assigned members. If any records exist, return 409 Conflict with an error indicating the role has assigned members and cannot be deleted.
   * 6. Within a database transaction:
   *    a. Delete all erp_hrm_role_permissions rows WHERE role_id = roleId (cascade is defined, but explicit deletion ensures atomicity).
   *    b. Delete the erp_hrm_roles row WHERE id = roleId.
   *    c. Insert a new erp_hrm_activity_logs entry recording the deletion event (action type: role deleted, performed by the requesting member, scoped to the organization).
   * 7. Return the previously retrieved role entity (including its permissions snapshot) as the response body.
   * 8. Edge cases: concurrent deletion requests for the same role should be handled by the database unique constraint; the second request will receive a 404 after the first completes.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":roleId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("roleId")
    roleId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteErpHrmMemberOrganizationsOrganizationIdRolesRoleId({
        member,
        organizationId,
        roleId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
