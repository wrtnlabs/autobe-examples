import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformCommunityModerator } from "../../../../../api/structures/ICommunityPlatformCommunityModerator";
import { IPageICommunityPlatformCommunityModerator } from "../../../../../api/structures/IPageICommunityPlatformCommunityModerator";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorId } from "../../../../../providers/deleteCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorId";
import { getCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorId } from "../../../../../providers/getCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorId";
import { patchCommunityPlatformMemberCommunitiesCommunityIdModerators } from "../../../../../providers/patchCommunityPlatformMemberCommunitiesCommunityIdModerators";
import { postCommunityPlatformMemberCommunitiesCommunitySlugModerators } from "../../../../../providers/postCommunityPlatformMemberCommunitiesCommunitySlugModerators";
import { putCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorId } from "../../../../../providers/putCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorId";

@Controller("/communityPlatform/member/communities")
export class CommunityplatformMemberCommunitiesModeratorsController {
  /**
   * Retrieve a filtered and paginated list of moderator assignments for a specific community.
   *
   * This operation provides the roster view for community governance by returning the community-scoped moderation role assignments associated with the target community identified by `communityId`. In the domain model, community moderation is represented as a community-specific role assignment rather than a platform-wide privilege, and the loaded requirements state that the platform recognizes two moderation standings inside a community: owner and moderator. The response is therefore intended to let clients inspect the current moderation team for one community in a structured, searchable format suitable for administration panels and moderation management screens.
   *
   * Security for this endpoint is community-sensitive. The requirements describe moderator authority as limited to the community in which it was granted and define an owner-over-moderator hierarchy for governance decisions. Because this endpoint exposes moderation assignments for governance purposes, it should be treated as an authenticated member operation, with access validated against the target community context. Implementations should ensure that callers only retrieve this management-oriented moderator roster when permitted by community governance rules and membership or moderation visibility policy.
   *
   * At the persistence level, this operation is based on the table that stores community-scoped moderation role assignments for members within a specific community, with additional owner-role specialization stored in the related owner subtype table. The parent community record provides the scope boundary, and related member and profile information may be joined to present readable assignee identity in each summary item. This aligns with the business requirement that moderator assignments remain limited to the same community and that the owner role outranks every moderator role within that community.
   *
   * This endpoint is commonly used together with the write operations for moderator management. Clients typically retrieve the current moderator roster before attempting to add moderators or before the owner removes a moderator, so that the acting user can verify the current team composition and role standing. When the moderation team changes, clients should call this endpoint again to refresh the roster and reflect the updated authority structure.
   *
   * The operation should reject requests for communities that do not exist and should return results only for assignments belonging to the specified community. Invalid pagination or unsupported sort criteria must be rejected according to common list browsing rules. The endpoint does not change assignments; it only retrieves them in a way that supports governance workflows and reduces ambiguity around who currently holds owner or moderator responsibility in the selected community.
   *
   * @param connection
   * @param communityId Target community's ID
   * @param body Search, filter, and pagination options for community moderators
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement this operation as a scoped list query
     *   over the community moderator assignment records for a single community.
   *
   * 1. Validate the `communityId` path parameter as a UUID and load the target record from `community_platform_communities`. If no community exists for the supplied identifier, return a not-found error.
   * 2. Authorize the caller as an authenticated member and evaluate whether the caller may inspect the moderation roster for the target community according to community governance access rules. Reject guests and any authenticated actor that fails the community-scoped authorization check.
   * 3. Query `community_platform_community_moderators` filtered by the target community foreign key only. Never return assignments from any other community. Left join `community_platform_community_moderator_owners` to determine whether each assignment is the owner role or a regular moderator role. Join member and profile relations as needed to populate summary fields that identify the assigned user in a human-readable way.
   * 4. Apply request-body search behavior for list browsing, including pagination, optional text search against supported identity fields, optional filtering by role standing such as owner versus moderator, and deterministic sorting. Constrain sorting to an allowlist of indexed or explicitly supported fields. Use a stable secondary sort such as assignment identifier when primary sort values tie.
   * 5. Build `IPageICommunityPlatformCommunityModerator.ISummary` with pagination metadata and an array of summary items. Each summary item should represent one assignment and include enough data for moderation-team screens, such as assignment identifier, community identifier, assigned member identity summary, role classification, and audit timestamps only if those fields actually exist in the schema.
   * 6. Preserve the owner-over-moderator distinction in the returned data so clients can render the authority hierarchy correctly. Do not infer removability or mutability beyond what is required for list display.
   * 7. Reject malformed request payloads, unsupported filters, or unsupported sort options with validation errors. Return an empty page rather than an error when the community exists but no moderator assignments match the search criteria.
   *
   * The operation is read-only and must not create, update, or remove moderator assignments. It serves as the roster lookup step that typically precedes dedicated add or remove moderator operations.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch(":communityId/moderators")
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformCommunityModerator.IRequest,
  ): Promise<IPageICommunityPlatformCommunityModerator.ISummary> {
    try {
      return await patchCommunityPlatformMemberCommunitiesCommunityIdModerators(
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
   * Retrieve the detailed moderation assignment record for a specific community moderator within a specific community.
   *
   * This operation returns the canonical community-scoped governance record stored in `community_platform_community_moderators`, which identifies which member holds moderation standing in a community, who granted that standing, what role classification the assignment currently carries, and whether the assignment is active or revoked. Because the community platform treats the community owner as the highest authority and recognizes both owner and moderator roles within the same moderation model, the response may also reflect whether the target assignment is linked to the owner subtype recorded through `community_platform_community_moderator_owners`.
   *
   * The route is intentionally nested under the community path because moderator assignments are valid only within the community to which they belong. Even if a moderator assignment ID exists, this operation must only return it when the assignment belongs to the `community_platform_communities` record identified by `communityId`. This preserves the community-specific authority boundary described in the requirements, where owner and moderator permissions never extend beyond the relevant community. The operation is therefore suitable for community governance screens, moderation team detail views, and audit-oriented inspection of a single assignment.
   *
   * Access to this operation should be restricted to authenticated members according to community governance policy. Guests are limited to public browsing of communities and content, while moderation-role records expose internal governance state such as grant origin, role classification, lifecycle status, revocation timing, and revocation reason. Implementations should also consider whether the caller must be the community owner, an active moderator in the same community, or the assigned member whose governance record is being viewed.
   *
   * This operation works together with community leadership and moderator-management workflows. A client will typically obtain the relevant community context first from community retrieval or community list APIs, then use moderator list functionality to identify the target assignment, and finally call this detail endpoint to inspect the exact role record. Creation and removal of moderators are handled by separate governance operations and are not performed here.
   *
   * If the community does not exist, if the moderator assignment does not exist, or if the moderator assignment belongs to a different community, the request must be rejected. The implementation should also reject access when the caller is not authenticated or lacks governance visibility for the target community.
   *
   * @param connection
   * @param communityId Target community's primary identifier
   * @param moderatorId Target moderator assignment's primary identifier within the community
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Load the target community from
     *   `community_platform_communities` by `id = :communityId` and reject when
     *   not found.
   *
   * Load the target moderation assignment from `community_platform_community_moderators` by `id = :moderatorId` and `community_platform_community_id = :communityId`. This second condition is mandatory so that a valid moderator assignment from another community cannot be exposed through the wrong parent route.
   *
   * Join or separately load the related owner subtype from `community_platform_community_moderator_owners` using `community_platform_community_moderator_id` to determine whether the assignment represents the owner-linked standing. Also resolve referenced members from `community_platform_members` and public presentation data from `community_platform_profiles` as needed for response composition, especially for the assigned member, granting member, and optional revoking member.
   *
   * Before returning data, enforce authentication and community-governance authorization. At minimum, reject unauthenticated callers. If the service applies stricter visibility, verify that the caller is the community owner, an active moderator in the same community, or the member who owns the assignment being inspected. When evaluating authority, honor the owner-over-moderator hierarchy defined in the requirements, but do not mutate any records in this read operation.
   *
   * Map the result into `ICommunityPlatformCommunityModerator` using the exact persisted fields from the moderator assignment record, including role, status, grantedAt, revokedAt, revocationReason, createdAt, and updatedAt, plus related member/profile information exposed by the DTO schema. If the assignment is revoked or logically removed, return its current stored state only when business visibility rules allow it; otherwise reject according to service policy. Return a not-found style failure when either parent or child resource resolution fails, and a forbidden style failure when authorization fails.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":communityId/moderators/:moderatorId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedParam("moderatorId")
    moderatorId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformCommunityModerator> {
    try {
      return await getCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorId(
        {
          member,
          communityId,
          moderatorId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Ensure that a specific member holds a community-scoped moderator assignment for the target community.
   *
   * This operation supports the moderation team expansion workflow described in the requirements. The community platform treats community moderation as a role assignment that is limited to a single community, and it recognizes an owner-over-moderator hierarchy within that space. When this endpoint succeeds, the identified member becomes eligible to perform moderator actions in the specified community, while the assignment remains confined to that community and does not confer authority elsewhere on the platform.
   *
   * Access to this operation is restricted to authenticated members who already have moderation authority in the same community. According to the requirements, both the community owner and existing moderators may add moderators for that community. The owner remains the highest-authority role, but moderators are also allowed to expand the moderation team. Requests from users who are neither the owner nor a moderator of the target community must be rejected. The operation must also reject attempts to create a moderator assignment for a different community context than the one identified in the route.
   *
   * At the data level, this operation works with the community-scoped moderation assignment represented by the community_platform_community_moderators table and, when applicable, the owner subtype distinction represented by community_platform_community_moderator_owners. The surrounding business context also depends on the existence of the target community in community_platform_communities and the target member identity in community_platform_members. Because profile ownership is one-to-one with a user identity and public presentation is tied to that identity, clients will typically use community and member/profile retrieval operations before calling this endpoint so that a moderator candidate can be selected from valid community participants.
   *
   * The operation is designed to be idempotent in the REST sense expected from PUT. If the same member is already a moderator for the same community, the implementation should return the current assignment rather than creating duplicate role records. If the target member does not exist, if the community does not exist, or if the acting member lacks authority in that community, the request must fail with an authorization or validation error. This endpoint only establishes moderator standing; it does not transfer ownership, does not alter owner precedence, and does not remove existing moderators. Those behaviors belong to separate governance operations.
   *
   * @param connection
   * @param communityId Identifier of the community whose moderation team is being managed
   * @param moderatorId Identifier of the member to hold moderator standing in that community
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement this operation as an idempotent
     *   upsert-like assignment of a community-scoped moderator role.
   *
   * 1. Authenticate the caller as a member. Reject guest access.
   * 2. Load the target community by communityId from community_platform_communities. Return not found when the community does not exist.
   * 3. Load the target member by moderatorId from community_platform_members. Return not found when the member does not exist.
   * 4. Determine whether the caller has authority in the same community:
   *    - Allow when the caller is the owner of the target community.
   *    - Allow when the caller already has a moderator assignment in community_platform_community_moderators for the same community.
   *    - Reject otherwise.
   * 5. Validate community scope strictly. The assignment to be created or returned must belong to the community identified by communityId only.
   * 6. Check whether a moderator assignment already exists for the pair (communityId, moderatorId).
   *    - If it exists, return the existing assignment without creating a duplicate row.
   *    - If it does not exist, create a new record in community_platform_community_moderators within a transaction.
   * 7. Ensure that this operation never creates or alters the owner subtype in community_platform_community_moderator_owners. Owner role is established by community creation and remains a distinct higher-authority standing.
   * 8. Return the resulting moderator assignment as ICommunityPlatformCommunityModerator.
   *
   * Error handling:
   * - 404 when the community or target member does not exist.
   * - 403 when the caller is neither the community owner nor a moderator of that community.
   * - 409 or equivalent business validation failure when database uniqueness rules prevent duplicate assignment creation during concurrent requests.
   * - Reject any attempt to interpret this operation as cross-community reassignment or ownership transfer.
   *
   * Implementation notes:
   * - Use a transaction for the existence check plus insert path to avoid duplicate moderator assignments under concurrent calls.
   * - Keep the operation idempotent for repeated PUT calls on the same communityId/moderatorId pair.
   * - If response shaping includes related member or community data, load those relations after the write using the canonical assignment record.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":communityId/moderators/:moderatorId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedParam("moderatorId")
    moderatorId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformCommunityModerator> {
    try {
      return await putCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorId(
        {
          member,
          communityId,
          moderatorId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently remove a moderator role assignment from the specified community governance context.
   *
   * This operation is used by a community owner to remove moderation standing from a member in that same community. In the community governance model, `community_platform_community_moderators` is the canonical record that stores which member has been granted moderation standing in a community, who granted that standing, what role classification the assignment carries, and whether the assignment is active or revoked. The endpoint therefore targets a specific moderator assignment through the combination of the community identifier and the moderator member identifier, and applies the owner-over-moderator hierarchy required by the moderation rules.
   *
   * Access to this operation is restricted to the owner of the target community. The loaded requirements state that the community owner is the highest authority within community moderation, that only the owner may remove moderators, and that moderators must not be allowed to remove either the owner or other moderators. Because `community_platform_communities` stores the owner membership reference and `community_platform_community_moderator_owners` marks the owner assignment as a strict one-to-one subtype of a moderator assignment, the implementation must verify both the acting member's ownership of the specified community and the target assignment's non-owner status before removal is allowed.
   *
   * The endpoint operates only within the specified community boundary. The `community_platform_community_moderators` table is explicitly community-scoped through `community_platform_community_id`, and the business rules require rejection if a removal request targets a moderator role in a different community or a user who is not a moderator of that community. Successful execution stops the removed user from performing moderator actions in that community, which matches the requirement that a user who no longer holds the moderator role must no longer be allowed to perform moderator actions there.
   *
   * This operation is part of the broader community leadership workflow. A member first creates a community and becomes its owner, then the owner or existing moderators may add moderators, and later the owner may remove moderators when governance needs change. Clients will typically obtain the target moderator from a community moderator listing or community management screen before calling this endpoint. Error handling should clearly distinguish missing community records, missing moderator assignments, attempts to target the owner assignment, and authorization failures where the acting member is not the owner of the specified community.
   *
   * @param connection
   * @param communityId Target community's unique ID.
   * @param moderatorId Target moderator member's unique ID within the specified community.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Authenticate the caller as a member and resolve
     *   the acting member ID from the session context. Reject unauthenticated
     *   callers.
   *
   * Load the target community from `community_platform_communities` by `id = {communityId}` and ensure it is available for governance actions. If the community does not exist, reject the request.
   *
   * Authorize the operation by verifying that the acting member is the owner of the specified community. Use `community_platform_communities.community_platform_member_id` as the canonical owner membership reference, and additionally preserve consistency with the moderator hierarchy by ensuring the acting owner corresponds to the active owner-linked assignment when needed. If the acting member is not the owner of the specified community, reject the request.
   *
   * Load the target moderation assignment from `community_platform_community_moderators` where `community_platform_community_id = {communityId}` and `community_platform_member_id = {moderatorId}`. The lookup must be constrained by the community ID so a moderator assignment from another community cannot be removed through this route. If no such assignment exists, reject the request.
   *
   * Before removal, determine whether the located assignment is the owner assignment by checking for a related record in `community_platform_community_moderator_owners` using `community_platform_community_moderator_id = community_platform_community_moderators.id`. If an owner subtype exists, reject the request because the owner cannot be removed through moderator-removal workflow.
   *
   * Apply the removal as a governance revocation rather than a hard row deletion so auditability and lifecycle history are preserved. In a transaction, update the target `community_platform_community_moderators` row to reflect revocation: set `status` to the revoked-state value used by the service, set `community_platform_revoked_by_member_id` to the acting owner's member ID, set `revoked_at` to the current timestamp, optionally populate `revocation_reason` with a system-generated message such as owner-initiated moderator removal if the service standardizes audit reasons, and update `updated_at`. If the service also marks removed assignments as deleted for read filtering, set `deleted_at` consistently with that convention; otherwise leave physical deletion unset.
   *
   * Ensure the operation is idempotent only to the extent defined by the service policy. If an assignment is already revoked or inactive, either reject it as not removable or treat it as already removed according to the canonical status rules used across moderation features, but do not allow this route to affect unrelated assignments.
   *
   * Return success with no response body on completion. Downstream authorization checks for moderator-only actions must rely on the updated assignment status so the removed user immediately loses moderator privileges in that community.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":communityId/moderators/:moderatorId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedParam("moderatorId")
    moderatorId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorId(
        {
          member,
          communityId,
          moderatorId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Create a new community moderator assignment within the specified community.
   *
   * This operation adds a member to the moderation team of a single community and returns the created moderation assignment record. The target community is resolved from the community slug, which is the platform-wide unique community identifier used in readable URL and lookup operations. The created record is stored in the canonical community moderation assignment table, which represents community-scoped moderation role assignments for members within a specific community and tracks who was granted moderation standing, what role classification was granted, the lifecycle status of that assignment, and when the grant occurred.
   *
   * Only an authenticated member who already has governance authority in the same community may execute this operation. According to the business requirements, the community owner is the highest authority within community moderation, and both the owner and existing moderators may add other moderators for that community. The platform must therefore verify that the caller is either the community owner or an active moderator in the identified community before creating the new assignment. A member who is neither the owner nor a moderator for that community must be rejected, and guests are not eligible to perform this governance action.
   *
   * The underlying data model separates community identity, member identity, and moderation assignment lifecycle concerns. The community record stores the canonical shared-space identity, owner member reference, descriptive presentation fields, and lifecycle status. The moderation assignment record stores the community reference, assigned member reference, granting member reference, current role classification, assignment status, grant timestamp, and optional future revocation metadata. Because the moderation table has a uniqueness constraint on the pair of community and assigned member, the system must reject attempts to add the same member more than once to the same community moderation team.
   *
   * Validation must confirm that the referenced community exists and is eligible for governance actions, that the requested member exists, and that the member belongs to the same business context as the community being managed. The platform must reject requests that identify an invalid user, requests that attempt to manage a different community than the one addressed by the path, and requests that conflict with an existing moderator assignment for the same community-member pair. If creation succeeds, the new moderator becomes eligible to perform moderator actions within that community.
   *
   * This operation is typically used after community creation and ongoing community governance workflows. A member first creates a community and becomes its owner, then may expand the moderation team through this endpoint. After creation, related moderation APIs for report review, content removal, and ban management can rely on the returned assignment as evidence of community-scoped authority.
   *
   * @param connection
   * @param communitySlug Slug of the target community (global scope)
   * @param body Member selection for the new moderator assignment
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Resolve the target community by
     *   community_platform_communities.slug using the communitySlug path
     *   parameter and ensure the community record exists. Reject when no
     *   matching community is found or when the community is not in a state
     *   that allows governance actions.
   *
   * Resolve the authenticated caller from the member session context. Require the caller to be an authenticated member. Authorize the request by verifying either of the following within the target community: (1) the caller is the owner member referenced by community_platform_communities.community_platform_member_id, or (2) the caller has an active, non-deleted community_platform_community_moderators record for the same community. When the caller lacks this authority, reject the request.
   *
   * Resolve the target member from the request body using the unique community_platform_members.code value. Reject when the member does not exist. Before insertion, query community_platform_community_moderators for an existing record with the same community_platform_community_id and community_platform_member_id. Reject duplicates regardless of whether the prior assignment is still active unless the business layer explicitly supports reactivation through a separate workflow.
   *
   * Create the new community_platform_community_moderators record in a transaction. Populate id with a new UUID, set community_platform_community_id from the resolved community, set community_platform_member_id from the resolved member, set community_platform_granted_by_member_id from the authenticated caller, set role to the standard moderator classification, set status to the active assignment state, set granted_at to the current timestamp, set community_platform_revoked_by_member_id, revoked_at, and revocation_reason to null, set created_at and updated_at to the current timestamp, and set deleted_at to null. Do not create a community_platform_community_moderator_owners subtype record from this endpoint.
   *
   * Return the created moderation assignment as ICommunityPlatformCommunityModerator. Include enough related data for downstream presentation to identify the moderated community, assigned member, granting member, role, status, grant timestamp, and lifecycle timestamps according to the DTO definition. Handle errors for unknown community, unknown member, unauthorized actor, and duplicate assignment with deterministic business-layer exceptions.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":communitySlug/moderators")
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communitySlug")
    communitySlug: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformCommunityModerator.ICreate,
  ): Promise<ICommunityPlatformCommunityModerator> {
    try {
      return await postCommunityPlatformMemberCommunitiesCommunitySlugModerators(
        {
          member,
          communitySlug,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
