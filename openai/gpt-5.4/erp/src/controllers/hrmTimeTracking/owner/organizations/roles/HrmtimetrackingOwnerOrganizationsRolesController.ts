import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingRole } from "../../../../../api/structures/IHrmTimeTrackingRole";
import { IPageIHrmTimeTrackingRole } from "../../../../../api/structures/IPageIHrmTimeTrackingRole";
import { OwnerAuth } from "../../../../../decorators/OwnerAuth";
import { OwnerPayload } from "../../../../../decorators/payload/OwnerPayload";
import { deleteHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleId } from "../../../../../providers/deleteHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleId";
import { getHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleId } from "../../../../../providers/getHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleId";
import { patchHrmTimeTrackingOwnerOrganizationsOrganizationIdRoles } from "../../../../../providers/patchHrmTimeTrackingOwnerOrganizationsOrganizationIdRoles";
import { postHrmTimeTrackingOwnerOrganizationsOrganizationIdRoles } from "../../../../../providers/postHrmTimeTrackingOwnerOrganizationsOrganizationIdRoles";
import { putHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleId } from "../../../../../providers/putHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleId";

@Controller("/hrmTimeTracking/owner/organizations/:organizationId/roles")
export class HrmtimetrackingOwnerOrganizationsRolesController {
  /**
   * Create a new custom role within the specified organization's role catalog.
   *
   * This operation adds an organization-scoped role definition to the role catalog of the organization identified by `organizationId`. The requirements state that the HRM time tracking system maintains a separate role catalog for each organization and applies only the roles defined for the currently selected organization. As a result, the created role belongs only to the target organization and must never be reused across other organizations. The operation is intended for custom roles that extend organization-specific access control, while the built-in Owner, Manager, and Employee role types remain permanent platform-defined roles within each organization.
   *
   * From a security perspective, this operation must be executed only by a caller who has authority to manage roles in the current organization context. The loaded requirements explicitly state that organization owners can create custom roles, edit custom roles, and control how permissions are assigned across employees in that organization. Permission evaluation is organization-specific, so access must be denied when the caller is outside the target organization context or lacks role-management authority in that organization, even if the same user has broader permissions in another organization.
   *
   * At the data layer, this operation creates a new role record associated with the target organization and persists the requested permission set as organization-scoped assignments linked to that role. The resulting role becomes part of the organization's independent role catalog and may later be assigned to employee records within the same organization. The operation must reject any attempt to create a role in a way that would cross organization boundaries, because the requirements require role definitions and role usage to remain independent between organizations.
   *
   * Validation must ensure that the target organization exists, that the caller is allowed to manage roles for that organization, and that the new role represents a custom role rather than an attempt to recreate one of the built-in permanent role types. Any permission selections included in the request must be stored only for the new role in the target organization. If later employee role reassignment APIs use this role, those APIs must select from the current organization's role catalog only, so this creation operation is a prerequisite for organization-specific access modeling.
   *
   * This operation is commonly used together with the organization role listing operation that lets authorized users review the current catalog before adding a new custom role, and with subsequent update operations that refine a custom role as organization needs evolve. Error responses should cover missing organization records, forbidden access in the current organization context, duplicate role definitions according to organization-specific uniqueness rules, and invalid attempts to create permanent built-in role types through the custom role creation flow.
   *
   * @param connection
   * @param organizationId Target organization's ID
   * @param body Creation data for a custom organization role
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Implement this operation as a transactional
     *   organization-scoped role creation flow.
   *
   * 1. Resolve the authenticated actor and verify that the actor is operating in the same organization as the `organizationId` path parameter. Reject the request when the active organization context does not match the path target.
   * 2. Authorize the actor for role-management capability in the current organization. At minimum, owners are authorized because the requirements explicitly grant owners the ability to create and edit custom roles and control permission assignment. If the service later supports delegated role-management permissions for managers, enforce that permission within the same organization context only.
   * 3. Load the target organization by `organizationId`. Return not-found when the organization does not exist or is not accessible in the caller's current organization context.
   * 4. Validate the request body for custom-role creation rules. Reject any attempt to create a built-in role type such as Owner, Manager, or Employee through this endpoint. Validate role name, description, and requested permission identifiers against the platform's supported permission catalog and organization-specific business rules.
   * 5. Check organization-scoped uniqueness constraints for role identity fields before insert. The uniqueness check must be limited to the target organization so identical names in different organizations do not conflict unless schema constraints state otherwise.
   * 6. Start a database transaction. Insert the role record linked to the target organization. Then insert related permission assignment records for the created role. If any permission entry is invalid or any insert fails, roll back the whole transaction.
   * 7. Return the created role with its organization association and assigned permissions in the response DTO.
   * 8. Emit any internal audit or activity logging side effects through internal services if the platform records administrative actions, but do not expose separate audit-creation behavior in this API contract.
   *
   * Edge cases: reject cross-organization context misuse, reject duplicate custom roles according to organization-local uniqueness rules, reject unsupported permission values, and reject attempts to create a role that would violate built-in role immutability expectations. The service must never allow this endpoint to create or affect roles belonging to another organization.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingRole.ICreate,
  ): Promise<IHrmTimeTrackingRole> {
    try {
      return await postHrmTimeTrackingOwnerOrganizationsOrganizationIdRoles({
        owner,
        organizationId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of role definitions for the specified organization.
   *
   * This operation provides the organization-scoped role catalog used by the HRM time tracking service when evaluating employee access within a selected organization. The returned collection represents roles that belong only to the organization identified by `organizationId`, reflecting the requirement that each organization maintains an independent role catalog and that role definitions do not cross tenant boundaries. Consumers typically use this endpoint to populate role management screens, assignment selectors, and organization-specific permission review workflows.
   *
   * Security for this endpoint is organization-context sensitive. The request must be evaluated against the caller's authority in the current organization, and role records from any other organization must never be included in the result set. The loaded requirements explicitly state that organization owners are shown the roles defined for the currently selected organization, and that access decisions must be made separately per organization context. As a result, the implementation must validate both membership and effective permission within the target organization before listing any roles.
   *
   * The operation is centered on the `hrm_time_tracking_roles` entity, which stores organization-scoped role definitions used to classify employee authority within a single tenant organization. The response should surface enough summary information for users to distinguish built-in roles from custom roles and to understand which role records are currently available for assignment. Where permission summaries are included, they should be derived consistently from the normalized permission assignments associated with each role so that updated custom role definitions are reflected immediately in role management views.
   *
   * Business behavior must respect the requirement that built-in Owner, Manager, and Employee roles remain present in every organization and cannot be removed from the role catalog. Therefore, list results should include those built-in roles alongside any custom roles belonging to the same organization. When filters or search criteria are applied, the service must still preserve the tenant boundary and should return only records that match the request while remaining inside the specified organization scope.
   *
   * This endpoint is commonly used before role assignment and role maintenance operations. For example, a client may first load this organization-specific catalog to present valid role choices, and then call a separate employee role reassignment or custom role update operation. That dependency matters because the requirements state that a new role used in reassignment must come from the current organization's role catalog and that custom role updates must propagate immediately to users viewing role management in that organization.
   *
   * Expected failures include requesting roles for an organization outside the caller's active scope, lacking permission to browse the organization role catalog, or submitting invalid paging or sort options in the request body. In each case, the service should reject the request without revealing role information from any unrelated organization.
   *
   * @param connection
   * @param organizationId Target organization's ID
   * @param body Role search, filter, sort, and pagination criteria
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Implement this operation as an
     *   organization-scoped search over the role catalog.
   *
   * 1. Authenticate the caller and resolve their current organization access context.
   * 2. Validate that `organizationId` is a well-formed UUID and that the caller is authorized to read role definitions for that organization. At minimum, support organization owners based on the loaded requirements. Reject the request if the caller does not belong to the organization or lacks the required authority in that organization.
   * 3. Parse `IHrmTimeTrackingRole.IRequest` for pagination, filtering, searching, and sorting inputs. Support common list-browsing behavior such as page size, page cursor or offset, free-text search on role name, optional built-in/custom classification filtering, and deterministic sorting suitable for management screens.
   * 4. Query `hrm_time_tracking_roles` constrained strictly by the target organization foreign key. Never evaluate or include role records from another organization. If permission summary data is part of the summary DTO, aggregate it from the normalized permission mapping source associated with the role definition.
   * 5. Ensure built-in roles remain representable in the result set for the organization. The query must not apply any logic that could incorrectly merge or substitute roles across organizations.
   * 6. Map each record to `IHrmTimeTrackingRole.ISummary`, including organization-scoped role identity and enough summary data for management and assignment UIs. Construct `IPageIHrmTimeTrackingRole.ISummary` with pagination metadata and the role summary array.
   * 7. Return the paginated result.
   *
   * Validation and error handling:
   * - Reject access when the caller attempts to inspect another organization's role catalog.
   * - Reject malformed paging or sorting inputs defined by the request DTO contract.
   * - Use stable ordering to prevent duplicate or skipped items between pages.
   * - Keep this operation read-only; do not mutate role definitions, permission assignments, or employee role assignments.
   *
   * Integration notes:
   * - This endpoint should be used by clients before role assignment or custom role update workflows so the UI can present the current organization-scoped role catalog.
   * - If the system supports real-time refresh, the data returned here should reflect recent custom role edits and permission changes without stale cross-organization leakage.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingRole.IRequest,
  ): Promise<IPageIHrmTimeTrackingRole.ISummary> {
    try {
      return await patchHrmTimeTrackingOwnerOrganizationsOrganizationIdRoles({
        owner,
        organizationId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the detailed definition of a single organization role within the specified organization.
   *
   * This operation returns one role from the organization-specific role catalog described in the requirements as the formal classification of authority for an employee within one organization. A role belongs to one organization only, carries meaning only inside that tenant boundary, and defines the role name, role type, and permission set used to classify responsibility and access scope. The endpoint therefore serves as the canonical detail view for inspecting how a particular role is configured inside the selected organization.
   *
   * Security for this operation is organization-context sensitive. The requirements state that the owner has full access to all organization features, including role management, and that role-based access must be evaluated separately for each organization context. As a result, the caller must have permission in the currently selected organization to view role definitions. A role from another organization must never grant access here, and if the supplied role identifier does not belong to the supplied organization, the request must be rejected rather than resolved across tenant boundaries.
   *
   * The underlying resource corresponds to the organization-scoped role entity stored in the role catalog for a tenant organization. This API should expose the detailed role record used to classify employee authority inside that organization and should include its permission configuration as represented by the role domain concept. The endpoint is commonly used before role update flows or employee role reassignment flows so that a client can inspect the exact role currently assigned in the selected organization before making a change.
   *
   * Validation must ensure that the organization exists, that the role exists, and that the role is associated with the specified organization. Error handling must deny access when the caller lacks permission in the current organization and must reject cross-organization references because the system keeps role definitions and role usage independent between organizations. This operation does not mutate data and is limited to returning the current persisted state of the requested organization role.
   *
   * @param connection
   * @param organizationId Target organization's ID
   * @param roleId Target role's ID within the specified organization
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Implement a service method that loads a single
     *   role detail record constrained by both organizationId and roleId.
   *
   * First, authenticate the caller and resolve the current organization access context. Authorize the request for organization-scoped role viewing: owners are always allowed, while managers are allowed only if their current organization role grants the necessary permission. Employees without the required permission must receive a forbidden error.
   *
   * Validate that the target organization exists. Query the role table for a record matching both the provided organizationId and roleId. Do not perform a role lookup by roleId alone because the requirements require strict organization isolation for role catalogs and access evaluation. If no matching role exists for that organization, return a not-found error.
   *
   * Load any normalized permission assignment records associated with the role so the returned DTO can describe the complete permission set of the organization-specific role. Map built-in and custom role characteristics consistently, noting that built-in roles are permanent organization role types while custom roles may be created, updated, and removed when not assigned.
   *
   * Return the detailed role DTO. Do not include cross-organization data. Do not mutate any state, create audit changes, or perform reassignment logic in this endpoint. Ensure errors distinguish among unauthenticated access, unauthorized access, missing organization, and missing role within the specified organization.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":roleId")
  public async at(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("roleId")
    roleId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingRole> {
    try {
      return await getHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleId(
        {
          owner,
          organizationId,
          roleId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a specific role definition within an organization.
   *
   * This operation updates an organization-scoped role record that classifies employee authority inside one tenant workspace. The underlying role entity is stored in `hrm_time_tracking_roles`, which holds the canonical role identity through fields such as the organization reference, the role display name, and the `built_in` flag that distinguishes platform-provided roles from organization-defined custom roles. The role's granted permission set is normalized in `hrm_time_tracking_role_permissions`, where each row represents one allowed permission code for the role. Together, these tables represent the role catalog that is maintained separately for each organization.
   *
   * Access to this operation is restricted to the organization owner. The requirements state that the owner has full organizational authority, can manage organization roles, can create and edit custom roles, and controls how permissions are assigned across employees in that organization. The operation must evaluate authorization in the current organization context only. A role from another organization must never be used to grant update authority here, and a caller who lacks role-management authority in the selected organization must be denied even if the same user has stronger permissions elsewhere.
   *
   * The operation is organization-bound and must enforce tenant isolation strictly. The `organizationId` path parameter identifies the tenant workspace that owns the role catalog, and the `roleId` path parameter identifies the specific role to update. Before applying any change, the system must confirm that the target role belongs to the organization specified in the route. If the role is associated with a different organization, the request must be rejected rather than silently rebinding or copying data across tenants. This aligns with the requirement that role catalogs remain independent between organizations and that one organization's role definitions have no effect in another organization.
   *
   * Business rules for built-in roles must also be respected. The requirements explicitly preserve the built-in roles Owner, Manager, and Employee in every organization and prohibit their removal from the role catalog. Because these roles are platform-defined permanent roles, update handling must protect their essential identity and availability. Implementations should therefore reject any attempt to transform a custom role into a built-in role, to misuse updates in a way that would effectively break the required built-in catalog, or to apply disallowed changes to protected built-in definitions. Custom roles, by contrast, may be updated to reflect changing responsibility boundaries within the organization.
   *
   * This operation is typically used together with the organization role listing and role detail APIs. Clients generally retrieve the current organization role catalog first, select a specific role from that catalog, and then submit a full replacement update for the chosen role definition and permission set. After a successful update, subsequent employee role-assignment and access-evaluation flows will use the revised role definition within that same organization only.
   *
   * Validation errors should be returned when the organization does not exist in the caller's accessible context, when the role does not exist, when the role does not belong to the specified organization, when the requested role name conflicts with another role in the same organization, or when protected built-in role rules are violated. The operation should also fail if duplicate permission codes are submitted or if any permission code is not recognized by the service's permission catalog.
   *
   * @param connection
   * @param organizationId Target organization's ID
   * @param roleId Target role's ID within the organization
   * @param body Replacement data for the target role
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Implement this operation as a transactional full
     *   update of one `hrm_time_tracking_roles` record and its normalized
     *   permission rows in `hrm_time_tracking_role_permissions`.
   *
   * 1. Authorize the caller as an organization owner in the current organization context. Deny access if the caller is not allowed to manage roles for the selected organization.
   * 2. Load the organization by `organizationId` from `hrm_time_tracking_organizations` and ensure it is accessible in the current tenant context. Reject if not found or not accessible.
   * 3. Load the target role by `roleId` from `hrm_time_tracking_roles`, ensuring `deleted_at` is null. Verify its `hrm_time_tracking_organization_id` exactly matches `organizationId`. Reject cross-organization references.
   * 4. Apply built-in protection rules. If the target role has `built_in = true`, reject any disallowed mutation according to the platform's built-in role policy. At minimum, do not allow updates that would compromise the permanent availability of Owner, Manager, or Employee in the organization role catalog.
   * 5. Validate the request payload. Confirm the proposed role name is unique within the same organization, excluding the current role, consistent with the unique constraint on `[hrm_time_tracking_organization_id, name]`. Validate the submitted permission list for duplicates before persistence.
   * 6. Update mutable columns on `hrm_time_tracking_roles`, typically the role `name` and `updated_at`. Do not allow the client to rebind the role to another organization through the body.
   * 7. Replace the normalized permission set atomically. Read existing `hrm_time_tracking_role_permissions` rows for the role, remove rows no longer present in the request, insert new permission rows for newly granted codes, and keep unchanged rows as-is. Set `updated_at` consistently for touched rows and avoid violating the unique constraint on `[hrm_time_tracking_role_id, permission]`.
   * 8. Return the updated role resource with its current permission set in a shape matching `IHrmTimeTrackingRole`.
   *
   * Error handling:
   * - Return not found when the organization or role does not exist in the permitted scope.
   * - Return forbidden when the caller lacks organization-scoped role-management authority.
   * - Return conflict when the new role name duplicates another role name in the same organization.
   * - Return bad request or unprocessable entity when the body contains duplicate permissions or invalid permission codes.
   * - Return conflict or forbidden when built-in role protection rules block the requested update.
   *
   * Implementation notes:
   * - Keep the entire update in one transaction so role metadata and permission rows remain synchronized.
   * - Always scope queries by organization to preserve tenant isolation.
   * - Do not delete or recreate the role record merely to update permissions; preserve the existing role identity and timestamps appropriately.
   * - Exclude soft-deleted permission rows and role rows from normal update targeting unless the service explicitly restores them elsewhere.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":roleId")
  public async update(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("roleId")
    roleId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingRole.IUpdate,
  ): Promise<IHrmTimeTrackingRole> {
    try {
      return await putHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleId(
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
   * Permanently remove an organization-scoped custom role from the role catalog for the specified organization.
   *
   * This operation is used in role administration when an organization owner decides that a custom role is no longer needed. The underlying role record is stored in the `hrm_time_tracking_roles` table, which defines organization-scoped role identities through `hrm_time_tracking_organization_id`, stores the display `name` of the role within that organization, and uses the `built_in` flag to distinguish permanent platform-defined roles from organization-defined custom roles. The operation is valid only for roles that belong to the organization identified by `organizationId` and that are not one of the built-in roles preserved by the platform.
   *
   * Access to this operation is restricted to the owner actor. The requirements explicitly state that only organization owners may create, edit, or delete custom roles, and that the built-in Owner, Manager, and Employee roles remain permanent role concepts in every organization. As a result, the server must reject requests from managers, employees, or any caller outside the current organization context. The server must also reject attempts to remove a role that does not belong to the specified organization, ensuring that role administration remains strictly tenant-scoped.
   *
   * Before removing the role, the server must validate that the target role is currently unassigned. The business rules require immediate rejection when one or more employee records still reference the custom role. In that case, the role must remain visible in role management and remain available in assignment choices until employee assignments are changed. When the role is unassigned and eligible for deletion, the operation removes it from the organization's available role set so that authorized users no longer see it as an assignment option.
   *
   * This operation directly supports organization role maintenance and is commonly used together with role-list retrieval and employee role reassignment flows. A client will typically load the current organization role catalog before invoking this endpoint and may need to update employee assignments away from the target custom role first. After successful completion, subsequent role-management reads for the same organization should no longer include the removed custom role, while roles in other organizations remain unaffected.
   *
   * If the role is built in, belongs to another organization, is already removed, or still has assigned employees, the operation must fail without changing role availability. These error outcomes preserve the integrity of organization authorization structures and prevent accidental removal of permanent or still-in-use role definitions.
   *
   * @param connection
   * @param organizationId Target organization's unique identifier
   * @param roleId Target role's unique identifier within the organization
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Authorize the caller as an organization owner
     *   within the organization identified by `organizationId`. Reject the
     *   request if the caller is not an owner for that organization.
   *
   * Load the target record from `hrm_time_tracking_roles` by `roleId` and verify that its `hrm_time_tracking_organization_id` matches `organizationId`. Exclude records that have already been removed from active role management, including records with `deleted_at` already set if logical deletion is used by the service implementation.
   *
   * Validate that the target role is not a built-in role by checking `built_in = true`. If the role is built in, reject the request because built-in owner, manager, and employee roles are permanent and outside the custom role deletion flow.
   *
   * Check whether any active organization workforce records are still assigned to the role before deletion. If at least one employee assignment exists, reject the request immediately with a business error explaining that the custom role cannot be removed while employees remain assigned. Do not change the role record or its assignment availability in this case.
   *
   * When the role is custom, belongs to the specified organization, and has no remaining employee assignments, remove it from the organization's role catalog within a transaction. If the service uses logical deletion consistent with the schema, set `deleted_at` and persist any audit timestamps needed by the platform; otherwise perform the equivalent removal strategy used by the codebase. Return the deleted role representation to the caller.
   *
   * Ensure the deletion affects only the current organization. Do not alter built-in roles, role definitions in other organizations, or employee records except for making the deleted custom role unavailable for future assignment. Handle not-found, forbidden, and conflict-style business validation failures deterministically.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":roleId")
  public async erase(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("roleId")
    roleId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleId(
        {
          owner,
          organizationId,
          roleId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
