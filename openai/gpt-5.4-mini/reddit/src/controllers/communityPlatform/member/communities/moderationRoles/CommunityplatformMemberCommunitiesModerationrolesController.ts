import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformModerationRole } from "../../../../../api/structures/ICommunityPlatformModerationRole";
import { IPageICommunityPlatformModerationRole } from "../../../../../api/structures/IPageICommunityPlatformModerationRole";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteCommunityPlatformMemberCommunitiesCommunityIdModerationRolesModerationRoleId } from "../../../../../providers/deleteCommunityPlatformMemberCommunitiesCommunityIdModerationRolesModerationRoleId";
import { getCommunityPlatformMemberCommunitiesCommunityIdModerationRolesModerationRoleId } from "../../../../../providers/getCommunityPlatformMemberCommunitiesCommunityIdModerationRolesModerationRoleId";
import { patchCommunityPlatformMemberCommunitiesCommunityIdModerationRoles } from "../../../../../providers/patchCommunityPlatformMemberCommunitiesCommunityIdModerationRoles";
import { postCommunityPlatformMemberCommunitiesCommunityIdModerationRoles } from "../../../../../providers/postCommunityPlatformMemberCommunitiesCommunityIdModerationRoles";
import { putCommunityPlatformMemberCommunitiesCommunityIdModerationRolesModerationRoleId } from "../../../../../providers/putCommunityPlatformMemberCommunitiesCommunityIdModerationRolesModerationRoleId";

@Controller(
  "/communityPlatform/member/communities/:communityId/moderationRoles",
)
export class CommunityplatformMemberCommunitiesModerationrolesController {
  /**
   * Create a moderation role assignment for a member within a specific community.
   *
   * This operation allows the community owner, and only users with sufficient moderation authority, to grant community-level moderation responsibility to another member. The assignment is stored as a community-scoped moderation relationship and represents the explicit authority structure used by the platform to manage community oversight.
   *
   * The community context comes from the path parameter, and the target member plus requested role type are provided in the request body. The underlying record is written to the community_platform_moderation_roles table, which links a community to a member and stores the role type, creation time, update time, and deletion time for historical preservation. The related community record in community_platform_communities determines who owns the community, and the target member must exist in community_platform_members.
   *
   * The system must validate that the requested role is permitted, that the target member is not already assigned the same role in the same community, and that the owner hierarchy is preserved. The owner remains the highest authority in the community, so the operation must reject any assignment that would demote or conflict with ownership rules. If the assignment already exists or if the actor lacks authority, the request must fail with a clear validation or authorization error.
   *
   * This endpoint is typically used together with community moderation management screens, role review screens, and moderator administration actions. After creating the role, clients may use moderation-role listing or community detail operations to refresh the displayed moderation roster.
   *
   * @param connection
   * @param communityId Target community identifier.
   * @param body Target member and moderation role to create.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Resolve the target community by communityId and verify it exists and is active enough to accept moderation assignments. Load the authenticated member from the request context and confirm they have authority to assign moderation roles in this community, typically by checking whether they are the community owner or otherwise hold the required moderation privilege.
   *
   * Validate the request body against the member identifier and role type expected by the moderation-role create contract. Confirm that the target member exists. Enforce the community_platform_moderation_roles uniqueness rule across community_platform_community_id, community_platform_member_id, and role_type so the same member cannot be assigned the same role twice in the same community. Reject attempts to assign invalid role types or to create an assignment that violates the owner hierarchy.
   *
   * Insert a new community_platform_moderation_roles record with a generated UUID primary key, the communityId from the path, the target member id, the requested role type, and current timestamps for created_at and updated_at. The deleted_at column must remain null on creation. If the business rules require role normalization, store only the canonical enum/string value accepted by the domain model.
   *
   * Return the created moderation role record immediately after insert. If the insert fails because of a unique constraint or referential integrity issue, map that to a conflict or validation error as appropriate. No transaction spanning multiple tables is necessary unless the implementation also updates a separate audit trail; if auditing exists, wrap both writes in a single transaction.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformModerationRole.ICreate,
  ): Promise<ICommunityPlatformModerationRole> {
    try {
      return await postCommunityPlatformMemberCommunitiesCommunityIdModerationRoles(
        {
          member,
          communityId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Manage the moderation-role assignments for a specific community.
   *
   * This operation provides the community-facing view of the moderation structure that governs who has owner or moderator authority inside a community. The underlying moderation-role record stores the community identifier, the member identifier, the assigned role type, and the creation/update timestamps, and it also preserves historical removal through the schema’s removal timestamp so moderation changes can be tracked over time.
   *
   * Only users with community moderation authority should be allowed to use this endpoint. The community owner has the highest authority, moderators may participate in moderation assignment when the business rules allow it, and the API must enforce that role hierarchy before any database change is made. The operation must also respect the schema-level uniqueness across community, member, and role type so that duplicate assignments are not created for the same member and role within the same community.
   *
   * The request should be treated as a community-scoped moderation management action rather than a generic resource fetch. The service implementation should reconcile the submitted moderation-role set against existing records for the target community, create new assignments where needed, update existing assignments when role membership changes, and preserve historical removal data according to the moderation-role lifecycle rules. Any invalid attempt to assign a role to a non-existent member, duplicate an existing assignment, or violate the owner/moderator hierarchy must be rejected with a validation error.
   *
   * This endpoint is commonly used together with the community detail and community moderation screens, and it may be followed by a separate retrieval of the community’s moderation-role list to refresh the UI after a successful update. Because the moderation-role table is community-scoped, the path parameter provides the community context and the request body should contain only the desired moderation-role changes for that community.
   *
   * @param connection
   * @param communityId Target community ID.
   * @param body Desired moderation-role assignments for the community.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Load the target community by communityId and verify the caller has community moderation authority. Enforce the owner/moderator hierarchy from the business rules before any write is attempted.
   *
   * Treat the request body as the desired moderation-role state for the community. Compare the submitted assignments with existing community_platform_moderation_roles rows for the same community. Insert new rows for new member-role assignments, update existing rows when the role set changes, and mark removed assignments according to the moderation-role lifecycle supported by the schema. Do not create duplicate rows for the same community_platform_community_id, community_platform_member_id, and role_type combination because the schema enforces uniqueness.
   *
   * Use a transaction for the full reconciliation so that partial updates cannot leave the community with an inconsistent moderation structure. Validate that every referenced member exists, that role_type is one of the allowed moderation role values, and that the caller is not attempting to remove or downgrade the community owner in a way that violates hierarchy rules. If the request attempts an unauthorized assignment or a duplicate role, fail the transaction with a clear validation error.
   *
   * Return the current moderation-role view for the community after persistence succeeds, including the community, member, role type, and timestamps needed by the UI. Keep the implementation focused on moderation-role management only; do not add unrelated community metadata updates or membership changes here.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformModerationRole.IRequest,
  ): Promise<IPageICommunityPlatformModerationRole.ISummary> {
    try {
      return await patchCommunityPlatformMemberCommunitiesCommunityIdModerationRoles(
        {
          member,
          communityId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single moderation role assignment for a community.
   *
   * This operation returns one record from the community moderation role store, which represents the authorization relationship between a community and a member who has been granted owner or moderator authority within that specific community. The record includes the community reference, the member reference, the assigned role type, and the timestamps that describe when the assignment was created, last updated, and removed from active use.
   *
   * The endpoint is intended for moderation administration workflows where a community owner or moderator needs to inspect a specific assignment and confirm who currently holds oversight responsibility. Because moderation roles are community-scoped, the community identifier in the path must match the record being requested, and the moderation role identifier is used to fetch the exact assignment belonging to that community.
   *
   * This endpoint should verify that the requested moderation role exists, belongs to the supplied community, and has not been requested outside the caller's authorization boundary. If the record is missing or does not belong to the given community, the service should respond with a not-found error. If the record exists but has been removed from active use, the returned object should still reflect the stored state so administrative clients can review historical moderation assignments.
   *
   * @param connection
   * @param communityId Target community identifier.
   * @param moderationRoleId Target moderation role assignment identifier.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Load a single community_platform_moderation_roles row by id and community scope.
   *
   * Implementation steps:
   * 1. Validate both path parameters as UUIDs.
   * 2. Query community_platform_moderation_roles by id = moderationRoleId and community_platform_community_id = communityId.
   * 3. Select the full entity fields: id, community_platform_community_id, community_platform_member_id, role_type, created_at, updated_at, deleted_at.
   * 4. Enforce community scope in the query so a role from another community cannot be returned through this route.
   * 5. If no row matches, return a not-found error.
   * 6. Optionally verify caller authorization through community moderation access rules before executing the lookup, since this is an administrative resource.
   * 7. Return the entity as-is without transformation beyond the standard API serialization.
   *
   * Do not join unnecessary tables unless the application layer requires enriched labels; the endpoint is a direct record lookup. Keep the operation read-only and avoid any mutation or business-side effects.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":moderationRoleId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedParam("moderationRoleId")
    moderationRoleId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformModerationRole> {
    try {
      return await getCommunityPlatformMemberCommunitiesCommunityIdModerationRolesModerationRoleId(
        {
          member,
          communityId,
          moderationRoleId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing moderation role assignment within a community.
   *
   * This operation modifies the moderation authority record that links a specific member to a specific community and records the member's authority level there. The underlying moderation role table stores the community reference, the member reference, the assigned role type, and audit timestamps so the platform can manage owner and moderator authority within the community moderation structure.
   *
   * Only authorized community leaders should use this endpoint. The community owner retains the highest authority, and moderators may extend moderation support where allowed by the business rules, but the system must still enforce the hierarchy defined for community moderation. The operation must not allow changing the community or member identity through the request body; those are fixed by the path and the existing record identity.
   *
   * The update must validate that the requested role change is compatible with community moderation rules, especially the distinction between owner and moderator authority. The service should load the existing moderation-role record by id within the specified community, verify it is active enough to be modified, apply the allowed field changes, and persist the updated timestamp. If the record does not exist in the given community scope, the service should return a not-found response. If the role transition violates moderation hierarchy rules, the service should reject the request with a business validation error.
   *
   * This endpoint is typically used together with the moderation-role creation, listing, and removal endpoints that manage the same community moderation structure. Clients should call the detail retrieval endpoint after a successful update when they need to refresh the full moderation roster in the UI.
   *
   * @param connection
   * @param communityId Target community ID.
   * @param moderationRoleId Target moderation role ID.
   * @param body Moderation role fields to update.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Load the existing community moderation role by moderationRole.id and ensure its community_platform_community_id matches the communityId path parameter before applying any change.
   *
   * Accept only mutable role fields in the update payload; do not permit changing the persisted community_platform_community_id, community_platform_member_id, id, created_at, or deleted_at values through this endpoint. The role_type field is the primary business-updatable attribute and must be validated against the platform's permitted moderation authority values.
   *
   * Enforce community moderation hierarchy rules before writing the update:
   * - preserve owner authority as the highest role
   * - prevent any update that would demote or remove the community owner through an unauthorized path
   * - prevent invalid moderator-role transitions that conflict with the community's moderation structure
   * - allow only changes that are compatible with the current actor's authority level
   *
   * Use a single transactional update on the moderation role row, updating updated_at to the current timestamp. If the target record is missing, return 404. If the requested role_type is invalid or violates hierarchy rules, return a domain validation error. If authorization fails, return forbidden. Return the updated moderation role record after persistence so the client has the authoritative post-update state.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":moderationRoleId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedParam("moderationRoleId")
    moderationRoleId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformModerationRole.IUpdate,
  ): Promise<ICommunityPlatformModerationRole> {
    try {
      return await putCommunityPlatformMemberCommunitiesCommunityIdModerationRolesModerationRoleId(
        {
          member,
          communityId,
          moderationRoleId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Remove a moderation role assignment from a specific community.
   *
   * This endpoint deletes a community-scoped moderation assignment from the moderation structure of the specified community. The underlying moderation role record represents the authority relationship between a community and a member, including the assigned role type that defines whether the member has owner-level or moderator-level responsibility.
   *
   * The operation is restricted to users who already have sufficient moderation authority in that community, because role assignment is part of the community oversight hierarchy. The request must target a moderation role that belongs to the community identified by the path parameter, and the system must reject attempts to remove a role from a different community or a role that does not exist.
   *
   * When the role is removed, the community's moderation structure is updated so the member no longer holds that moderation authority in the community. This operation should be used together with community role assignment and moderation management workflows, especially when owners need to revoke moderator access or reorganize community oversight responsibilities.
   *
   * @param connection
   * @param communityId Target community's ID.
   * @param moderationRoleId Target moderation role's ID.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation should verify that the authenticated actor has community moderation authority before attempting deletion. Load the target moderation role by id and community id together, ensuring it is not already removed and that its community_platform_community_id matches the path communityId.
   *
   * Perform a conditional delete against community_platform_moderation_roles using both ids to prevent cross-community deletion. Because the schema includes deleted_at, prefer a historical removal workflow that marks the record as deleted and preserves auditability if that is the service's standard behavior for this table. If the platform's delete contract requires a hard delete, then remove the row only after verifying authorization and ownership constraints; otherwise set deleted_at and update updated_at in a transaction.
   *
   * Enforce role hierarchy rules in the service layer: the owner may remove moderators, moderators may only remove permitted roles according to policy, and the owner role itself must not be removed by unauthorized actors. Return a not-found error when the role id does not belong to the specified community, and return a conflict or forbidden error when the actor lacks authority or the removal violates moderation hierarchy constraints. Include transactional consistency so concurrent moderation changes do not leave the community role state inconsistent.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":moderationRoleId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedParam("moderationRoleId")
    moderationRoleId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteCommunityPlatformMemberCommunitiesCommunityIdModerationRolesModerationRoleId(
        {
          member,
          communityId,
          moderationRoleId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
