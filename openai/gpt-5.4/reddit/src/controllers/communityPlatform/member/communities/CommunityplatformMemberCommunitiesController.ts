import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformCommunity } from "../../../../api/structures/ICommunityPlatformCommunity";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteCommunityPlatformMemberCommunitiesCommunitySlug } from "../../../../providers/deleteCommunityPlatformMemberCommunitiesCommunitySlug";
import { postCommunityPlatformMemberCommunities } from "../../../../providers/postCommunityPlatformMemberCommunities";
import { putCommunityPlatformMemberCommunitiesCommunitySlug } from "../../../../providers/putCommunityPlatformMemberCommunitiesCommunitySlug";

@Controller("/communityPlatform/member/communities")
export class CommunityplatformMemberCommunitiesController {
  /**
   * Create a new community record for an authenticated member.
   *
   * This operation creates a new shared-space record in the community platform using the canonical community entity stored in community_platform_communities. The created resource includes the platform-wide unique community identifier used for readable URLs and lookup operations through the slug column, the human-readable community name shown in listings and headers through the title column, and the summary text that describes the topic, purpose, and participation context through the description column. The resulting community becomes an independently managed business entity that can later act as the parent context for subscriptions, posts, moderator assignments, bans, reports, and historical snapshots.
   *
   * Access to this operation is restricted to authenticated members. The functional requirements state that a member can create a community and that, when a member creates a community, that member becomes the owner of that community. For that reason, the owner member reference in community_platform_communities.community_platform_member_id must be resolved from the authenticated session rather than accepted from client input. Guests must not be allowed to call this operation successfully, and callers must already have valid member identity before attempting creation.
   *
   * The operation is tightly related to the platform's governance model. Although the primary record is inserted into community_platform_communities, successful execution should also establish the creator as the highest-authority role within that specific community by creating the related moderation assignment in community_platform_community_moderators and the owner subtype record in community_platform_community_moderator_owners. This keeps the API behavior consistent with the business rule that community ownership is community-specific and originates from creation of the community itself.
   *
   * Validation must ensure that the requested slug is unique because the database schema defines slug as the platform-wide unique community identifier used in lookup operations. Validation must also ensure that title and description are present and suitable for discovery and presentation because search and browsing workflows show community names to guests and members and allow them to evaluate communities before joining. Aggregate data such as subscriber counts must not be accepted from clients because the schema explicitly states that such values are derived from related subscription records rather than stored on the community row.
   *
   * After successful creation, the new community should become available for later discovery, browsing, selection, subscription, and community feed access. Related operations that users commonly perform after this one include searching communities by name, viewing a selected community, subscribing to it, and creating posts inside the community once subscribed. Error handling should reject unauthenticated callers, duplicate slug attempts, and any invalid payload that does not satisfy required creation rules.
   *
   * @param connection
   * @param body Information required to create a community
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement this operation as a transactional community creation workflow for authenticated members.
   *
   * 1. Authenticate the caller as a member and obtain the member primary key from session context. Reject guests and any non-member principal before touching persistence.
   * 2. Validate the request body against the community creation DTO. The client may supply the community slug, title, and description. Do not accept owner identifiers, subscriber counts, timestamps, or system lifecycle metadata from the client.
   * 3. Verify that no existing active or otherwise conflicting community_platform_communities row already uses the requested slug, because the schema enforces a unique constraint on slug. Return a conflict error when the slug is already taken.
   * 4. Insert a new community_platform_communities row with a new UUID, community_platform_member_id set to the authenticated member id, slug/title/description from the request, status initialized to the platform's active creation state, created_at and updated_at set to the current timestamp, and deleted_at set to null.
   * 5. Create a corresponding community_platform_community_moderators row in the same transaction for the creator, using the new community id, the same member id as both assignee and granted_by member, an owner-aligned role classification, active status, granted_at equal to the creation timestamp, revoked fields null, and deleted_at null.
   * 6. Create a community_platform_community_moderator_owners row linked one-to-one to the newly created moderator assignment so the ownership subtype is materialized explicitly.
   * 7. Commit the transaction only if all three writes succeed. On failure, roll back fully so a community cannot exist without its initial governance ownership linkage.
   * 8. Return the created community resource as the response body. The returned DTO should reflect the canonical community entity, not derived subscriber aggregates.
   *
   * Implementation should keep aggregate subscriber count computation out of this write path because the community schema documents that such aggregates are derived from community_platform_subscriptions. The service should also be prepared to surface validation and constraint errors for duplicate slug, invalid member context, or malformed input. Logging should capture the actor member id and new community id for auditability of ownership establishment.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: ICommunityPlatformCommunity.ICreate,
  ): Promise<ICommunityPlatformCommunity> {
    try {
      return await postCommunityPlatformMemberCommunities({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing community identified by its platform-wide unique slug.
   *
   * This operation modifies the canonical shared-space record stored in `community_platform_communities`, which the schema describes as the source of the community's identity, owner membership reference, descriptive presentation fields, and lifecycle state used for discovery and participation decisions. The editable business-facing content of a community is centered on the human-readable title and the summary description that help guests and members evaluate whether they want to browse, subscribe to, and participate in that space. Because the community is also presented in discovery and search experiences, changes made through this operation affect how the community appears in listings and evaluation contexts.
   *
   * Access to this operation is restricted to a member who has community-governance authority over the target community. The requirements state that when a member creates a community, that member becomes the owner, and that the owner is the highest-authority role within that specific community. For that reason, this endpoint is intended for community ownership management rather than general member participation. Guests must not be allowed to update a community, and ordinary members without the necessary community-scoped authority must be rejected.
   *
   * The target record is resolved by the `slug` column of `community_platform_communities`, which the schema defines as a platform-wide unique community identifier used in readable URLs and lookup operations. The operation updates the same community record that also stores the `title`, `description`, `status`, `updated_at`, and optional `deleted_at` fields. Subscriber counts shown in browse and search experiences are not updated directly through this endpoint because the schema explicitly states that aggregate values such as subscriber counts are not stored in the community table and must instead be derived from related `community_platform_subscriptions` records.
   *
   * Clients will commonly use community browse, search, or detail retrieval operations before invoking this update endpoint so that a user can first locate the target community by its current slug and review its existing metadata. After a successful update, subsequent community listing, search, and selection flows should reflect the changed title or description where those fields are surfaced for discovery. If the target community does not exist, has been removed from active use, or the caller lacks authority over that community, the request must fail without modifying the record.
   *
   * @param connection
   * @param communitySlug Target community slug in global scope
   * @param body Community update information
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement a service-layer update for the `community_platform_communities` primary table using the unique `slug` column as the lookup key.
   *
   * 1. Authenticate the caller as a member.
   * 2. Resolve the target community by `community_platform_communities.slug = :communitySlug` and reject when no matching record exists.
   * 3. Reject the request if the matched community is not in an updatable business state, including cases where `deleted_at` is not null or the current lifecycle status forbids update according to domain rules.
   * 4. Authorize the caller against community governance ownership. At minimum, allow the member who owns the community through `community_platform_communities.community_platform_member_id`. If the implementation supports equivalent owner standing through community moderator governance, validate that standing from `community_platform_community_moderators` and `community_platform_community_moderator_owners` without granting ordinary moderator access unless business rules explicitly allow it.
   * 5. Validate the update payload against the actual editable community fields defined for the API contract. Persist only fields that belong to the community record itself, such as title, description, slug, or status when those fields are included in `ICommunityPlatformCommunity.IUpdate`. Do not accept or persist derived subscriber counts, subscription state, moderator assignments, or unrelated snapshot data through this endpoint.
   * 6. When slug changes are permitted by the contract, verify uniqueness against `community_platform_communities.slug` before saving.
   * 7. Update `updated_at` to the current timestamp and persist the modified row in a transaction.
   * 8. Return the refreshed canonical community resource.
   *
   * Implementation should avoid destructive side effects on related `community_platform_subscriptions`, `community_platform_community_moderators`, and `community_platform_community_snapshots` records. Error handling should distinguish not found, forbidden, uniqueness conflict, invalid business state, and validation failure scenarios.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":communitySlug")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communitySlug")
    communitySlug: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformCommunity.IUpdate,
  ): Promise<ICommunityPlatformCommunity> {
    try {
      return await putCommunityPlatformMemberCommunitiesCommunitySlug({
        member,
        communitySlug,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently remove a community identified by its slug.
   *
   * This operation deletes a single community resource from the community platform. The target community is resolved by the community slug supplied in the path, and the action is intended for the member who owns and manages that community. In the domain model, a Community is the core shared-space record for the platform, containing posts, subscriptions, community moderators, bans, and moderation-related activity. Removing the community therefore represents deletion of the community context in which those related records exist.
   *
   * Access to this operation must be restricted to an authenticated member who is the owner of the target community. The ownership and governance model distinguishes the community owner from delegated moderators, and moderator permissions described elsewhere apply to deleting posts and comments within the moderator's own community, not to deleting the community entity itself. If the requesting actor is not authenticated, if the community does not exist, or if the requester is not the owner of the target community, the request must be rejected.
   *
   * The underlying implementation should align with the platform's community ownership and lifecycle rules. Because the community is the parent shared-space record for subscriptions, posts, comments, moderator assignments, bans, reports, and related snapshots or subtype records, this operation must ensure the removal is applied consistently so that no orphaned community-scoped data remains accessible through feeds, direct community viewing, or governance workflows. This behavior should be documented and implemented as a permanent removal of the community and its dependent visibility.
   *
   * This endpoint is related to community discovery, community detail retrieval, subscription management, posting, moderation, and report-review flows. After successful deletion, clients must treat the target slug as unavailable for future community browsing or management actions. Any subsequent requests targeting the removed community should fail as an unavailable resource.
   *
   * @param connection
   * @param communitySlug Unique slug of the target community (global scope).
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement a service-layer deleteCommunityBySlug workflow.
   *
   * 1. Authenticate the requester as a member. Reject unauthenticated callers.
   * 2. Resolve the target record from the community aggregate using the slug provided in communitySlug. If no matching community exists, return a not-found error.
   * 3. Load the community owner relationship and verify that the authenticated member is the owner of the target community. Reject the request when the caller is not the owner.
   * 4. Execute the deletion in a transaction. Remove the community record and all dependent community-scoped records that cannot remain valid without the parent community, including subscriptions, moderator assignments and owner subtype linkage, community bans, moderation actions, reports, posts, comments, votes, snapshots, and content subtype records as required by the actual schema relationships.
   * 5. Ensure downstream visibility is removed immediately so the deleted community no longer appears in community discovery, subscribed-community views, posting targets, moderation tools, or direct detail access.
   * 6. Return success with no response body.
   *
   * Error handling:
   * - Reject when the caller is not authenticated as a member.
   * - Reject when the target community does not exist.
   * - Reject when the authenticated member is not the owner of the community.
   * - Fail the entire transaction if any dependent deletion step cannot be completed.
   *
   * Implementation notes:
   * - Use the slug as the external identifier for lookup.
   * - Do not require a request body.
   * - Apply referential cleanup according to actual foreign-key dependencies in the schema.
   * - Ensure idempotency semantics are based on resource existence: once removed, later delete attempts should return not found rather than partial success.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":communitySlug")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communitySlug")
    communitySlug: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteCommunityPlatformMemberCommunitiesCommunitySlug({
        member,
        communitySlug,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
