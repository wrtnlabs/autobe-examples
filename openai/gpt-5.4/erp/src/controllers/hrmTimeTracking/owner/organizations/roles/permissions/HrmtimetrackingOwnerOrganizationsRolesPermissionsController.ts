import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingRole } from "../../../../../../api/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingRolePermission } from "../../../../../../api/structures/IHrmTimeTrackingRolePermission";
import { OwnerAuth } from "../../../../../../decorators/OwnerAuth";
import { OwnerPayload } from "../../../../../../decorators/payload/OwnerPayload";
import { deleteHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId } from "../../../../../../providers/deleteHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId";
import { getHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId } from "../../../../../../providers/getHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId";
import { patchHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissions } from "../../../../../../providers/patchHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissions";
import { postHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissions } from "../../../../../../providers/postHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissions";
import { putHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId } from "../../../../../../providers/putHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId";

@Controller(
  "/hrmTimeTracking/owner/organizations/:organizationId/roles/:roleId/permissions",
)
export class HrmtimetrackingOwnerOrganizationsRolesPermissionsController {
  /**
   * Add permission assignments to a custom organization role.
   *
   * This operation creates normalized permission assignment records under an existing organization-scoped role. The underlying role entity, stored in `hrm_time_tracking_roles`, is the canonical definition of employee authority within one tenant organization, while each granted permission is persisted separately in `hrm_time_tracking_role_permissions` so the role permission set remains normalized as one row per permission code. The organization identified by `organizationId` is the operational data boundary, and the target role identified by `roleId` must belong to that same organization before any permission assignment is accepted.
   *
   * Access to this operation is restricted to the organization owner. The requirements define custom role creation and custom role editing as owner-controlled administration capabilities, and role permissions must be evaluated within the currently selected organization only. As a result, the caller must have owner authority in the specified organization, and a role from another organization must never be modifiable through this endpoint. A request that targets a role outside the current organization context, or a role that the caller is not authorized to administer in that organization, must be rejected.
   *
   * Validation must follow the custom role permission rules exactly. The request may contain only permission codes from the allowed catalog: `org:manage`, `employee:manage`, `employee:view`, `project:manage`, `project:view`, `time:manage`, `time:approve`, `time:view_all`, and `report:view`. Because `hrm_time_tracking_role_permissions` enforces uniqueness on the pair of role and permission, the service must prevent duplicate permission assignments for the same role. In addition, if the target role is a built-in role, this custom-role permission assignment path must reject the request because built-in roles are protected from modification through custom role editing behavior.
   *
   * This operation is typically used together with role detail and role management listing endpoints. A client would first retrieve the organization's role catalog, then choose a custom role, and finally call this endpoint to add newly selected permissions. After successful completion, the updated role definition should be returned so role management screens can refresh immediately and so any employees assigned to that role can have effective access recalculated in the current organization context.
   *
   * Expected failures include unknown organization or role identifiers, organization-role mismatches, invalid permission codes, attempts to modify built-in roles, duplicate permission submissions that would violate the normalized assignment uniqueness rule, and authorization failures for non-owner callers. The operation does not create a new role record; it only appends valid permission assignments to an existing custom role within one organization.
   *
   * @param connection
   * @param organizationId Target organization's ID
   * @param roleId Target role's ID within the specified organization
   * @param body Permission codes to add to the custom role
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification 1. Authorize the caller as an owner within the
     *   specified organization context. 2. Load the organization by
     *   `organizationId` and ensure it exists and is not logically removed for
     *   operational use. 3. Load the role by `roleId` from
     *   `hrm_time_tracking_roles` and verify
     *   `hrm_time_tracking_organization_id` equals `organizationId`. 4. Reject
     *   the request if the role is marked `built_in = true`, because built-in
     *   roles are not editable through the custom role administration flow. 5.
     *   Parse the request body as `IHrmTimeTrackingRolePermission.ICreate`,
     *   requiring at least one permission code to add. 6. Validate every
     *   requested permission against the allowed catalog: `org:manage`,
     *   `employee:manage`, `employee:view`, `project:manage`, `project:view`,
     *   `time:manage`, `time:approve`, `time:view_all`, `report:view`. 7.
     *   Normalize the incoming permission list by removing duplicates within
     *   the payload before persistence, or reject duplicate entries as invalid
     *   input according to service policy. 8. Query existing
     *   `hrm_time_tracking_role_permissions` rows for the target role and
     *   reject any requested permission that already exists, avoiding violation
     *   of the unique constraint on `[hrm_time_tracking_role_id, permission]`.
     *   9. Within a transaction, insert one
     *   `hrm_time_tracking_role_permissions` row per accepted permission with
     *   generated UUIDs and current timestamps. 10. Update the role's
     *   `updated_at` timestamp in `hrm_time_tracking_roles` so downstream
     *   clients can detect administrative changes. 11. Re-read the role with
     *   its active permission assignments and return it as
     *   `IHrmTimeTrackingRole`. 12. Trigger any downstream permission refresh
     *   or cache invalidation needed so employees assigned to the role see
     *   updated effective access in the current organization without delay.
   *
   * Error handling:
   * - Return not found when the organization or role does not exist.
   * - Return forbidden when the caller is not an owner in the current organization.
   * - Return conflict or validation failure when the role belongs to another organization, when the role is built-in, or when a permission is already assigned.
   * - Return validation failure when any permission code is outside the allowed catalog or when the payload is missing required permission data.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("roleId")
    roleId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingRolePermission.ICreate,
  ): Promise<IHrmTimeTrackingRole> {
    try {
      return await postHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissions(
        {
          owner,
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
   * Update the permission assignments of a specific organization role within the selected organization.
   *
   * This operation manages the normalized permission set attached to an organization-scoped role. In the underlying data model, the role itself is stored in `hrm_time_tracking_roles`, which represents the canonical role identity assigned within one tenant organization, and each granted permission is stored as a separate row in `hrm_time_tracking_role_permissions`. Because the platform treats the organization as an independent business tenant and the ownership boundary for operational access control, the role identified by `roleId` must belong to the organization identified by `organizationId` before any permission changes are applied.
   *
   * Only the organization owner should be allowed to use this operation. The requirements state that the owner has full access to organization features, can create and edit custom roles, and controls how permissions are assigned across employees in that organization. Permission evaluation is organization-scoped, which means this endpoint must not allow a role from one organization to be updated through the context of another organization. A successful update affects access decisions only inside the current organization and must not alter any role definition in other organizations.
   *
   * This endpoint is intended for maintaining custom role definitions rather than general workforce updates. The role table stores the role display name and whether the role is built-in, while the permission rows store one allowed permission code per record. Updating permissions through this endpoint should therefore reconcile the submitted permission list against existing `hrm_time_tracking_role_permissions` rows for the target role, preserving the role's organization relationship and built-in distinction. If the target role is protected from modification by business rules, the request must be rejected instead of partially applying changes.
   *
   * The operation should validate that the target organization exists, that the target role exists inside that organization, and that each submitted permission code is acceptable to the system's available role-management permission set. It should also prevent cross-organization updates and reject duplicate permission entries, aligning with the database uniqueness rule on role-permission pairs. After the update, the system should use the refreshed role definition for future access evaluation in the selected organization, and affected employees assigned to that role should have their effective access refreshed according to the role update propagation requirements.
   *
   * This operation is typically used together with role listing or role detail retrieval endpoints in the same organization workspace. Clients generally retrieve organization roles first, let the owner choose a role to edit, and then submit the revised permission selection through this endpoint. After completion, subsequent role-management views should display the updated permission set without delay, and employees assigned to the updated custom role should experience refreshed access within the current organization context.
   *
   * @param connection
   * @param organizationId Target organization's ID
   * @param roleId Target role's ID within the specified organization
   * @param body Updated permission selection for the target role
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Implement this operation as an
     *   organization-scoped permission-set reconciliation for one role.
   *
   * 1. Authorize the caller as an organization owner in the current organization context. Reject if the caller is not allowed to administer role definitions for the specified organization.
   * 2. Load the target organization by `organizationId` from `hrm_time_tracking_organizations` and reject if it does not exist or is not active for administration.
   * 3. Load the target role by `roleId` from `hrm_time_tracking_roles` and verify `hrm_time_tracking_role_id` belongs to the same `hrm_time_tracking_organization_id` as the path organization. Reject if the role does not exist, is deleted, or belongs to another organization.
   * 4. Validate the submitted permission codes in the request body against the application's supported role-management permission catalog. Reject unknown, malformed, or duplicate permission values before making changes.
   * 5. Enforce business protection rules for built-in roles. If built-in roles are not editable in this service policy, reject updates when `built_in` is true. If built-in role updates are selectively allowed by downstream business policy, only allow the approved subset and reject the rest. In all cases preserve the built-in/custom distinction on the role record.
   * 6. In a single transaction, read existing `hrm_time_tracking_role_permissions` rows for the target role, compute the set difference, insert missing permissions, and remove obsolete permission rows. Because permissions are normalized one row per code, do not overwrite by raw array storage. Respect the unique constraint on `(hrm_time_tracking_role_id, permission)`.
   * 7. Update any necessary role metadata timestamps if the persistence strategy requires touching the parent role record when its effective permission set changes.
   * 8. Return the refreshed role aggregate, including its current permission assignments, from the authoritative post-transaction state.
   *
   * Error handling:
   * - 404 or equivalent domain error when the organization or role is not found in the specified scope.
   * - 403 or equivalent domain error when the caller lacks organization-scoped authority.
   * - 400 or equivalent domain error for invalid or duplicate permission codes.
   * - 409 or equivalent domain error when uniqueness or protected-role rules are violated.
   *
   * Side effects:
   * - Trigger downstream access refresh behavior so employees assigned to the updated role receive refreshed effective permissions in the current organization context.
   * - Ensure updates are visible immediately in role-management views for the same organization.
   * - Never propagate changes to roles in any other organization.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async updatePermissions(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("roleId")
    roleId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingRole.IUpdatePermission,
  ): Promise<IHrmTimeTrackingRole> {
    try {
      return await patchHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissions(
        {
          owner,
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
   * Retrieve a single permission assignment record from an organization-scoped role.
   *
   * This operation returns one normalized permission entry belonging to a role stored in the organization's role catalog. In the underlying data model, `hrm_time_tracking_roles` represents organization-scoped role definitions used to classify employee authority within a single tenant organization, and `hrm_time_tracking_role_permissions` stores the granted permission set in First Normal Form as one record per allowed permission code. The response is therefore intended to expose one concrete permission assignment attached to one role, rather than returning the entire role definition or the full role permission set.
   *
   * Access to this operation is governed by organization-scoped role evaluation. The loaded requirements state that permissions are applied according to the employee's assigned role in the currently selected organization, and that a role from one organization must never grant access in another organization. For that reason, the server must confirm that the specified role belongs to the `organizationId` in the path and that the specified permission assignment belongs to the `roleId` in the path before returning data. Owners can access role administration capabilities in their organization, and any non-owner access must still be evaluated against the current organization's effective permissions.
   *
   * This operation is closely related to role management flows for custom role creation and editing. When an organization owner creates or edits a custom role, the system stores or updates the selected permissions as the effective permission set of that role. This endpoint allows authorized clients to inspect one of those persisted permission assignments after a role has been created, edited, or refreshed in real time. Clients that need the full permission set for a role would typically use a role-detail or role-permission list operation first, then use this endpoint when a single permission assignment resource must be inspected directly.
   *
   * Expected behavior is to return the targeted permission assignment only when the entire parent chain is valid within the same organization context. If the organization does not exist, the role does not belong to that organization, the permission assignment does not belong to that role, or the caller lacks sufficient authority in the current organization, the request must be rejected. This preserves tenant isolation, aligns with the requirement that role catalogs are separate per organization, and prevents a permission record from another organization or another role from being exposed through an incorrect nested path.
   *
   * @param connection
   * @param organizationId Target organization's unique identifier
   * @param roleId Target role's unique identifier within the organization
   * @param permissionId Target permission assignment's unique identifier within the role
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Implement this operation as a read-only detail
     *   lookup for one row in `hrm_time_tracking_role_permissions` scoped
     *   through its parent role and organization.
   *
   * 1. Authenticate the caller and resolve the current organization access context. Authorize the request only if the caller is an organization owner for the specified organization or otherwise has role-management authority in that same organization context. Do not grant access based on permissions held in any other organization.
   *
   * 2. Validate the path chain using the actual primary-key relationships. Query `hrm_time_tracking_roles` by `id = roleId` and `hrm_time_tracking_organization_id = organizationId`. If no role matches, return a not-found error for the nested resource path. Then query `hrm_time_tracking_role_permissions` by `id = permissionId` and `hrm_time_tracking_role_id = roleId`. If no permission assignment matches, return a not-found error.
   *
   * 3. Exclude logically removed rows from successful reads. Because both tables define nullable `deleted_at` columns, treat records with non-null `deleted_at` as unavailable for this endpoint unless the broader service explicitly documents archived-data visibility elsewhere. This operation should return only active role definitions and active permission assignments.
   *
   * 4. Build the response from the permission assignment record and include data needed to represent the granted permission code and its ownership context according to the DTO contract for `IHrmTimeTrackingRolePermission`. The implementation may join the parent role to populate nested or derived fields required by the DTO, but it must not broaden the response into a full role aggregate unless the DTO explicitly defines such fields.
   *
   * 5. Error handling must preserve tenant and hierarchy integrity. Return an authorization failure when the caller lacks access in the specified organization. Return not found when the organization-role or role-permission chain is invalid. Never leak whether a permission assignment exists under a different organization or different role beyond the constraints of the nested route.
   *
   * 6. This operation is non-mutating and does not require a transaction beyond the database's normal read consistency. If the platform supports real-time refresh for role updates, this read should naturally reflect the latest committed role permission state after custom role edits.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":permissionId")
  public async at(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("roleId")
    roleId: string & tags.Format<"uuid">,
    @TypedParam("permissionId")
    permissionId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingRolePermission> {
    try {
      return await getHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId(
        {
          owner,
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

  /**
   * Update a single permission assignment within an organization role.
   *
   * This operation modifies one normalized permission row stored in the role permission catalog for the selected organization role. In the database, the target resource is the `hrm_time_tracking_role_permissions` record identified by `id`, which stores one granted permission code in the `permission` column for one related `hrm_time_tracking_roles` record through `hrm_time_tracking_role_id`. The parent role is an organization-scoped role definition whose `name` identifies the role within one tenant organization and whose `built_in` flag distinguishes platform-provided roles from organization-defined custom roles. Because role scope is inherited through the related role rather than duplicated on the permission row, the request path includes both `organizationId` and `roleId` so the system can validate tenant ownership and reject cross-organization access.
   *
   * This operation is intended for organization owners who manage custom role definitions and permission selection inside the currently selected organization. The requirements state that the owner has full organizational authority, can edit custom roles, and controls how permissions are assigned across employees in that organization. The system must evaluate access separately for each organization context, so a caller's authority in another organization must have no effect on this request. If the referenced role belongs to another organization, if the permission assignment does not belong to the referenced role, or if the caller lacks role-management authority in the current organization, the request must be denied.
   *
   * From a data perspective, this operation updates the `permission` value on an existing `hrm_time_tracking_role_permissions` row and refreshes its `updated_at` timestamp. Because the table is normalized to keep one allowed permission code per row, changing the permission effectively replaces the granted permission code for that single assignment record. The database enforces uniqueness on the pair of `hrm_time_tracking_role_id` and `permission`, so the service must reject attempts that would create a duplicate granted permission for the same role. Rows that have already been marked by `deleted_at` must not be treated as active editable assignments.
   *
   * This endpoint is commonly used together with role detail or role permission listing operations in a role-management workflow. A client would typically retrieve the current role and its permission rows first, let the organization owner choose a different permission from the available permission set, and then call this operation to persist the change for the selected row. After a successful update, role-management views should reflect the changed permission immediately, and employees assigned to the updated custom role should have their effective access refreshed in the current organization context according to the requirements for custom role update propagation.
   *
   * Validation must ensure that the new permission code is one of the platform-supported role management permissions, that the targeted role remains inside the selected organization, and that built-in role distinction is preserved. Expected errors include unknown organization, unknown role, unknown permission assignment, role-permission ownership mismatch across path segments, duplicate permission assignment for the same role, and forbidden access when the caller is not authorized to manage organization roles.
   *
   * @param connection
   * @param organizationId Target organization's ID
   * @param roleId Target role's ID within the organization
   * @param permissionId Target permission assignment's ID within the role
   * @param body Replacement data for the role permission assignment
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification 1. Authenticate the caller and resolve the
     *   current organization context. 2. Authorize only the organization owner
     *   of the selected organization, because requirements state the owner can
     *   edit custom roles and control organization role permissions. Reject
     *   callers who do not have permission in the current organization context.
     *   3. Load the role by `roleId` and verify: - the role exists, -
     *   `hrm_time_tracking_roles.hrm_time_tracking_organization_id` equals
     *   `organizationId`, - the role is active for editing (for example, not
     *   logically removed via `deleted_at` if the implementation filters active
     *   rows). 4. Load the target permission assignment by `permissionId` and
     *   verify: - the row exists, -
     *   `hrm_time_tracking_role_permissions.hrm_time_tracking_role_id` equals
     *   `roleId`, - the row is active and not marked by `deleted_at`. 5.
     *   Validate business rules before update: - permit updates only for
     *   editable custom-role permission configurations; preserve built-in role
     *   distinction required by the requirements, - validate the requested
     *   permission code from the body against the supported permission catalog
     *   used by role administration, - reject empty or malformed permission
     *   codes, - check whether another active
     *   `hrm_time_tracking_role_permissions` row already exists for the same
     *   `roleId` and requested permission; if so, reject to satisfy the unique
     *   constraint on (`hrm_time_tracking_role_id`, `permission`). 6. Execute
     *   the update in a transaction: - update `permission`, - set `updated_at`
     *   to the current timestamp, - keep `created_at` unchanged, - do not alter
     *   parent role metadata. 7. Return the updated permission-assignment
     *   entity. 8. Trigger downstream refresh behavior so role-management views
     *   and effective access derived from the updated custom role can be
     *   recalculated promptly within the same organization context.
   *
   * Error handling:
   * - 404 or equivalent domain error when organization, role, or permission assignment is not found.
   * - 403 or equivalent domain error when the caller is not authorized in the current organization.
   * - 409 or equivalent domain error when the requested permission duplicates another assignment for the same role.
   * - 400 or equivalent domain error when the permission code is invalid for role management.
   * - Reject any cross-path mismatch where the permission assignment does not belong to the specified role or the role does not belong to the specified organization.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":permissionId")
  public async update(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("roleId")
    roleId: string & tags.Format<"uuid">,
    @TypedParam("permissionId")
    permissionId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingRolePermission.IUpdate,
  ): Promise<IHrmTimeTrackingRolePermission> {
    try {
      return await putHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId(
        {
          owner,
          organizationId,
          roleId,
          permissionId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Remove a single granted permission assignment from an organization-scoped role.
   *
   * This operation is used as part of custom role administration inside one organization. In the hrm time tracking domain, roles are organization-scoped role definitions used to classify employee authority within a single tenant organization, and each allowed permission is stored as a separate normalized record in the role permission assignment table. Deleting this nested resource updates the effective permission set of the selected role by removing exactly one granted permission entry from that role.
   *
   * Access to this operation is restricted to the organization owner acting within the currently selected organization context. The requirements state that only organization owners may edit custom roles, and that role permissions must be applied separately for each organization. As a result, the handler must evaluate the caller's authority in the current organization only, and it must reject attempts to use a role defined in another organization or to rely on permissions granted in some other organization.
   *
   * This operation is tightly related to the role catalog and permission selection workflow. A role belongs to one organization through hrm_time_tracking_roles.hrm_time_tracking_organization_id, and each granted permission is represented by hrm_time_tracking_role_permissions.hrm_time_tracking_role_id plus the permission code. The permission-assignment resource identified by permissionId must belong to the specified role, and the role must belong to the specified organization. The operation therefore enforces the organization boundary described by the domain model and prevents cross-organization access to role configuration data.
   *
   * Business validation must also preserve role administration restrictions. Built-in roles remain protected organizational defaults, and custom role editing must preserve the distinction between built-in roles and custom roles. When the targeted role is a built-in role, the system should reject permission-removal attempts that would treat it as a custom editable role. When the targeted permission assignment does not exist, does not belong to the selected role, or the role does not belong to the selected organization, the system should deny the request rather than exposing unrelated tenant data.
   *
   * This operation is commonly used together with role detail or role update flows that present the current effective permission set before an owner removes individual entries. Clients should load the target role and its assigned permissions first so the owner can choose the exact permission assignment to remove. After successful deletion, subsequent access evaluations in that organization must use the updated role definition for future authorization decisions.
   *
   * @param connection
   * @param organizationId Target organization's ID.
   * @param roleId Target role's ID within the organization.
   * @param permissionId Target permission assignment's ID within the role.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Implement this operation as a nested delete on
     *   hrm_time_tracking_role_permissions.
   *
   * 1. Authenticate the caller and resolve the current organization context.
   * 2. Authorize only the owner actor for the target organization. If the caller is not an owner in the current organization, reject the request.
   * 3. Load the target role from hrm_time_tracking_roles by id = roleId and hrm_time_tracking_organization_id = organizationId. If no record matches, return a not-found response.
   * 4. Enforce organization isolation by rejecting any case where the caller is operating outside the selected organization context.
   * 5. Validate that the role is editable under role-administration rules. Because the requirements restrict custom role editing to owners and preserve built-in role protection, reject requests targeting built-in roles when the implementation policy does not allow direct permission mutation for built-in roles.
   * 6. Load the permission assignment from hrm_time_tracking_role_permissions by id = permissionId and hrm_time_tracking_role_id = roleId. If no record matches, return a not-found response. Do not search outside the specified role.
   * 7. Delete the permission-assignment row. Prefer a transactional write. If the service uses logical deletion for this table because deleted_at exists, mark deleted_at and update updated_at instead of physically removing the row; otherwise remove the row consistently with repository conventions.
   * 8. Return success with no response body.
   *
   * Validation and error handling:
   * - Reject when organizationId, roleId, or permissionId are not valid UUIDs.
   * - Reject when the role belongs to another organization.
   * - Reject when the permission assignment belongs to another role.
   * - Reject when a non-owner attempts the operation.
   * - Reject when the target role is built-in and built-in permission mutation is disallowed.
   * - Ensure the delete is idempotent from the API consumer perspective only through standard not-found behavior for missing resources; do not silently affect unrelated rows.
   *
   * Side effects:
   * - After deletion, future authorization decisions for employees assigned to that role in the same organization must use the updated effective permission set.
   * - If activity or audit recording exists elsewhere in the service, emit a role-permission-change log linked to the organization and acting owner without changing the API contract.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":permissionId")
  public async erase(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("roleId")
    roleId: string & tags.Format<"uuid">,
    @TypedParam("permissionId")
    permissionId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId(
        {
          owner,
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
