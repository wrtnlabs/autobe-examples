import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmRole } from "../../../../../../api/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "../../../../../../api/structures/IErpHrmRolePermission";
import { MemberAuth } from "../../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../../decorators/payload/MemberPayload";
import { deleteErpHrmMemberOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId } from "../../../../../../providers/deleteErpHrmMemberOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId";
import { patchErpHrmMemberOrganizationsOrganizationIdRolesRoleIdPermissions } from "../../../../../../providers/patchErpHrmMemberOrganizationsOrganizationIdRolesRoleIdPermissions";
import { postErpHrmMemberOrganizationsOrganizationIdRolesRoleIdPermissions } from "../../../../../../providers/postErpHrmMemberOrganizationsOrganizationIdRolesRoleIdPermissions";

@Controller(
  "/erpHrm/member/organizations/:organizationId/roles/:roleId/permissions",
)
export class ErphrmMemberOrganizationsRolesPermissionsController {
  /**
   * Add a permission code to a specific role within an organization.
   *
   * This operation creates a new entry in the role permissions table (`erp_hrm_role_permissions`), granting an additional permission code to the target role. Each role within an organization can hold any combination of the available permission codes: `org:manage`, `employee:manage`, `employee:view`, `project:manage`, `project:view`, `time:manage`, `time:approve`, `time:view_all`, and `report:view`. Each row in `erp_hrm_role_permissions` represents a single, discrete permission grant — adding a permission is accomplished by inserting a new row, and each `(role_id, permission_code)` pair must be unique across the table.
   *
   * Security and authorization requirements are strict: only a member holding the **Owner** role within the specified organization may invoke this endpoint. Attempting to add a permission while holding any other role — including a custom role with broad permissions — will be denied. This mirrors the business rule that the authority to manage custom roles and their permission codes is exclusively reserved for organization owners.
   *
   * This operation applies exclusively to **custom roles** (`is_builtin = false`). The three built-in roles (Owner, Manager, Employee) are system-defined and their permissions cannot be altered via this endpoint. Attempts to modify built-in role permissions will be rejected.
   *
   * Before calling this endpoint, consumers should first retrieve the list of roles via `PATCH /organizations/{organizationId}/roles` to obtain the target `roleId`, and may also call `GET /organizations/{organizationId}/roles/{roleId}` to see the role's current permission set. Duplicate permission grants (i.e., adding a permission code that the role already holds) are rejected due to the unique constraint on `(role_id, permission_code)` in `erp_hrm_role_permissions`.
   *
   * Upon successful creation, the system returns the newly created `erp_hrm_role_permissions` record, including its generated UUID, the associated `role_id`, the granted `permission_code`, and the `created_at` timestamp. The new permission takes effect immediately for all organization members currently assigned to the role.
   *
   * @param connection
   * @param organizationId The UUID of the organization that owns the target role.
   * @param roleId The UUID of the custom role to which the permission code will be added.
   * @param body The permission code to be granted to the specified role.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Authenticate the caller as a member session and resolve their organization membership for the given organizationId (from erp_hrm_organization_members joined to erp_hrm_roles).
   * 2. Verify the caller's role within the organization is the built-in 'Owner' role (is_builtin = true, name = 'Owner'). If not, return 403 Forbidden.
   * 3. Look up the target role by roleId scoped to organizationId in erp_hrm_roles. If not found, return 404 Not Found.
   * 4. Verify that the target role is a custom role (is_builtin = false). If is_builtin = true, return 422 Unprocessable Entity with a message that built-in role permissions cannot be modified.
   * 5. Validate the incoming permission_code from the request body against the allowed set: ['org:manage', 'employee:manage', 'employee:view', 'project:manage', 'project:view', 'time:manage', 'time:approve', 'time:view_all', 'report:view']. Return 400 Bad Request for any unknown code.
   * 6. Check for duplicates: query erp_hrm_role_permissions WHERE role_id = roleId AND permission_code = requestBody.permission_code. If found, return 409 Conflict.
   * 7. Insert a new row into erp_hrm_role_permissions with a generated UUID id, role_id = roleId, permission_code = requestBody.permission_code, created_at = now().
   * 8. Return the created erp_hrm_role_permissions row as IErpHrmRolePermission.
   * 9. This operation should run in a single database transaction.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("roleId")
    roleId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmRolePermission.ICreate,
  ): Promise<IErpHrmRolePermission> {
    try {
      return await postErpHrmMemberOrganizationsOrganizationIdRolesRoleIdPermissions(
        {
          member,
          organizationId,
          roleId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the complete set of permission codes assigned to a custom role within an organization.
   *
   * This operation replaces the entire permission set of the target role atomically. All existing permission code entries in `erp_hrm_role_permissions` for the role are removed and replaced with the new set provided in the request body. The replacement is performed within a single database transaction to ensure consistency.
   *
   * Only organization owners are authorized to invoke this operation. Members holding any other role — including Manager or Employee — are denied access regardless of their permission codes. This restriction applies to both built-in and custom roles.
   *
   * Built-in roles (Owner, Manager, Employee) are identified by the `is_builtin` flag on the `erp_hrm_roles` record. The system enforces immutability of built-in role permissions: any attempt to modify the permission codes of a built-in role will be rejected immediately, regardless of the requesting user's authority.
   *
   * The permission codes accepted by this operation are drawn from a fixed catalogue: `org:manage`, `employee:manage`, `employee:view`, `project:manage`, `project:view`, `time:manage`, `time:approve`, `time:view_all`, and `report:view`. Each code corresponds to a specific category of organizational capability as defined in `erp_hrm_role_permissions.permission_code`. Any code outside this catalogue will cause the request to be rejected.
   *
   * A custom role may be assigned zero or more permission codes. Supplying an empty array clears all permissions from the role. When permissions are updated, the new permission set takes effect immediately for all organization members currently assigned to that role.
   *
   * This operation is scoped to the organization identified by `organizationId`. Multi-tenancy isolation is enforced: the role must belong to the specified organization, and the authenticated member's organization context must match. Cross-organization access is strictly prohibited.
   *
   * Upon successful update, the system records the change in the organization's activity log, capturing what was modified and who performed the action.
   *
   * Related operations: `GET /organizations/{organizationId}/roles/{roleId}` retrieves the current state of the role including its permissions before making changes. `PATCH /organizations/{organizationId}/roles` lists all roles in the organization.
   *
   * @param connection
   * @param organizationId The UUID of the organization that owns the role. Scopes the operation to a specific tenant.
   * @param roleId The UUID of the custom role whose permissions are being updated. Must belong to the specified organization.
   * @param body The new set of permission codes to assign to the role, replacing the existing permission set entirely.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Authenticate the requesting member and verify their organization context matches `organizationId`.
   * 2. Verify the member has the Owner role (is_builtin=true, name='Owner') within the organization — reject with 403 Forbidden if not.
   * 3. Fetch the `erp_hrm_roles` record by `roleId` WHERE `erp_hrm_organization_id = organizationId` — return 404 if not found.
   * 4. Check the `is_builtin` flag on the fetched role. If `is_builtin = true`, reject immediately with 422 Unprocessable Entity, informing the caller that built-in role permissions are system-defined and immutable.
   * 5. Validate each permission code in the request body against the allowed catalogue: ['org:manage', 'employee:manage', 'employee:view', 'project:manage', 'project:view', 'time:manage', 'time:approve', 'time:view_all', 'report:view']. Reject with 400 Bad Request on any unrecognized code.
   * 6. Validate there are no duplicate permission codes in the input list.
   * 7. Within a single database transaction:
   *    a. DELETE all existing `erp_hrm_role_permissions` rows WHERE `role_id = roleId`.
   *    b. INSERT new `erp_hrm_role_permissions` rows for each provided permission code, generating a new UUID for each, setting `role_id = roleId`, `permission_code = <code>`, `created_at = now()`.
   *    c. UPDATE `erp_hrm_roles.updated_at = now()` for the role record.
   * 8. Record an activity log entry in `erp_hrm_activity_logs` for this permission update action, referencing the organization and the acting member.
   * 9. Return the updated `erp_hrm_roles` record with its new `erp_hrm_role_permissions` included.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("roleId")
    roleId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmRolePermission.IUpdate,
  ): Promise<IErpHrmRole> {
    try {
      return await patchErpHrmMemberOrganizationsOrganizationIdRolesRoleIdPermissions(
        {
          member,
          organizationId,
          roleId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes a single permission code entry from a custom role within an organization.
   *
   * Each permission grant on a role is stored as an individual row in the `erp_hrm_role_permissions` table, identified by its own UUID (`permissionId`). This operation targets and deletes one such row, immediately revoking the corresponding permission code (e.g., `org:manage`, `employee:manage`, `project:view`, etc.) from the role. Because role assignments take effect immediately, all organization members currently assigned this role will lose access to the capabilities governed by the removed permission code the moment the deletion is committed.
   *
   * **Authorization**: Only the organization owner may modify role permissions. Members holding any other role — including custom roles with broad permissions such as `org:manage` — are not permitted to alter role permission assignments. Any attempt by a non-owner actor to call this endpoint will be rejected.
   *
   * **Constraints on built-in roles**: The three built-in roles (Owner, Manager, Employee) identified by the `is_builtin = true` flag on `erp_hrm_roles` are system-managed and cannot have their permissions modified through this endpoint. Attempts to remove permissions from a built-in role will result in a rejection error.
   *
   * **Cascade effect on active members**: Because role permission changes are applied immediately (as established in the domain model), removing a permission from a role instantly affects every organization member assigned to that role. There is no grace period or confirmation step; callers should be certain before invoking this operation.
   *
   * **Related operations**: Use `GET /organizations/{organizationId}/roles/{roleId}` to retrieve the current role details and its associated permissions before deciding which permission to remove. Use `POST /organizations/{organizationId}/roles/{roleId}/permissions` to add a new permission code to a role. Use `PUT /organizations/{organizationId}/roles/{roleId}` to update the role's name or perform a full permission replacement.
   *
   * @param connection
   * @param organizationId The UUID of the organization that owns the role. Scopes the operation to the correct organization tenant.
   * @param roleId The UUID of the custom role from which the permission will be removed. Must be a non-builtin role belonging to the specified organization.
   * @param permissionId The UUID of the specific erp_hrm_role_permissions entry to permanently remove.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. **Authentication & Authorization**:
   *    - Verify the calling member is authenticated and belongs to the specified organization (via `erp_hrm_organization_members`).
   *    - Check that the calling member holds the built-in 'Owner' role (`erp_hrm_roles.is_builtin = true AND erp_hrm_roles.name = 'Owner'`) for this organization. If not, return 403 Forbidden.
   *
   * 2. **Organization validation**:
   *    - Query `erp_hrm_organizations` by `organizationId` (UUID). Ensure it exists and `deleted_at IS NULL`. Return 404 if not found or deleted.
   *
   * 3. **Role validation**:
   *    - Query `erp_hrm_roles` by `roleId` where `erp_hrm_organization_id = organizationId`. Return 404 if not found.
   *    - If `erp_hrm_roles.is_builtin = true`, return 422 (or 403) indicating built-in role permissions cannot be modified.
   *
   * 4. **Permission entry validation**:
   *    - Query `erp_hrm_role_permissions` by `permissionId` (primary key UUID) and confirm `role_id = roleId`. Return 404 if not found or if it belongs to a different role.
   *
   * 5. **Deletion**:
   *    - Execute a hard DELETE on the `erp_hrm_role_permissions` row identified by `permissionId`.
   *    - No cascade deletions are needed; this table has no child tables.
   *
   * 6. **Activity log**:
   *    - Insert a record into `erp_hrm_activity_logs` for the organization, recording the permission removal action (role name, permission code removed, actor who performed it, timestamp).
   *
   * 7. **Response**:
   *    - Return HTTP 204 No Content on success (no response body).
   *
   * 8. **Edge cases**:
   *    - If the permission to be deleted is the last permission on the role, allow it (a role can have zero permissions).
   *    - Concurrent deletion of the same permissionId should be idempotent or return 404 on the second attempt.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":permissionId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("roleId")
    roleId: string & tags.Format<"uuid">,
    @TypedParam("permissionId")
    permissionId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteErpHrmMemberOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId(
        {
          member,
          organizationId,
          roleId,
          permissionId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
