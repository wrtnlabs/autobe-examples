import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformModerationAction } from "../../../../../api/structures/ICommunityPlatformModerationAction";
import { IPageICommunityPlatformModerationAction } from "../../../../../api/structures/IPageICommunityPlatformModerationAction";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { getCommunityPlatformMemberCommunitiesCommunityIdModerationActionsModerationActionId } from "../../../../../providers/getCommunityPlatformMemberCommunitiesCommunityIdModerationActionsModerationActionId";
import { patchCommunityPlatformMemberCommunitiesCommunityIdModerationActions } from "../../../../../providers/patchCommunityPlatformMemberCommunitiesCommunityIdModerationActions";

@Controller(
  "/communityPlatform/member/communities/:communityId/moderationActions",
)
export class CommunityplatformMemberCommunitiesModerationactionsController {
  /**
   * Retrieve a filtered and paginated list of moderation action records for a specific community.
   *
   * This operation exposes the audit trail stored in the community_platform_moderation_actions table for one community identified by communityId. Each record represents a moderation or enforcement step taken within that community, including the acting community moderation assignment, the scoped community, the moderation action category, an optional moderator-entered explanation or audit note, and lifecycle timestamps. The operation is intended to support community-governance review screens where authorized moderators or the owner need to inspect what actions were taken, when they were taken, and what type of target was affected.
   *
   * Access to this operation is restricted to the local authority structure of the specified community. The requirements define community ownership as the highest-authority local role and community moderators as holders of content oversight authority, user restriction authority, and report review authority within that same community. The current requirements also explicitly state that there are no platform-wide administrative moderation powers, so this operation must not be treated as a global moderation log for admins across all communities.
   *
   * The underlying data is community-scoped and audit-oriented. The parent moderation action record does not store polymorphic nullable target foreign keys directly. Instead, target-specific associations are normalized into dedicated one-to-one subtype tables: community_platform_moderation_action_posts for post targets, community_platform_moderation_action_comments for comment targets, community_platform_moderation_action_reports for report targets, and community_platform_moderation_action_bans for ban targets. As a result, list results should summarize the common moderation action fields while also surfacing enough target metadata for authorized clients to distinguish whether an action concerned a post, comment, report, or ban.
   *
   * This operation should support practical browsing workflows for moderation history, including filtering by action_type, acting moderator assignment, target category, and created_at ranges, along with pagination and deterministic sorting. These behaviors align with the platform's list browsing expectations and with the moderation domain's need for community-specific isolation. Records from other communities must never appear in the response, and unavailable or retired records should be handled according to the current lifecycle state in the stored data.
   *
   * This operation is commonly used together with community moderation features such as report review, community ban management, moderator assignment management, and content enforcement actions. Clients will typically obtain the community identifier from community browsing or detail APIs before calling this endpoint. The returned list is best suited for timeline, review, and audit interfaces rather than direct content rendering, because the source table is an audit log of governance activity rather than the canonical content table for posts, comments, or reports.
   *
   * @param connection
   * @param communityId Target community's ID
   * @param body Search filters and pagination options for community moderation actions
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Validate that the caller is an authenticated member and resolve the specified community by community_platform_communities.id using communityId. Reject the request when the community does not exist or is unavailable for moderation-context access.
   *
   * Authorize the caller only when that member holds active local governance authority in the specified community. Implementation should verify either an owner-linked or active moderator assignment in community_platform_community_moderators for the same community. Do not grant access based on platform-wide admin identity because the requirements do not define global moderation authority.
   *
   * Query community_platform_moderation_actions as the base dataset filtered by community_platform_community_id = communityId. Exclude logically removed rows when deleted_at is not null unless the request DTO explicitly supports inclusion of retired audit rows. Apply optional request-body filters such as action type, target type derived from existing subtype links, acting moderator assignment, created_at date range, and free-text note search when those fields are present in ICommunityPlatformModerationAction.IRequest.
   *
   * For each candidate action row, join or batch-load related records needed for summaries: the acting assignment from community_platform_community_moderators, the scoped community from community_platform_communities when necessary for integrity checks, and the target subtype rows from community_platform_moderation_action_posts, community_platform_moderation_action_comments, community_platform_moderation_action_reports, and community_platform_moderation_action_bans. Build summary items that identify the action category, acting moderator context, target category, target identifier, optional note, and timestamps. Preserve community isolation throughout all joins so no target from a different community is exposed.
   *
   * Apply stable pagination and sorting. Default sort should be newest-first by created_at and secondarily by id for deterministic page boundaries. Return the result as IPageICommunityPlatformModerationAction.ISummary with pagination metadata and summary data array. If the request asks for filters that produce no matches, return an empty page rather than an error.
   *
   * Handle authorization failures with access denial, nonexistent community with not-found behavior, and malformed filter values with validation errors. If subtype integrity is unexpectedly inconsistent, treat the action as an audit record with missing target detail rather than leaking unrelated data, and log the anomaly for operator investigation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformModerationAction.IRequest,
  ): Promise<IPageICommunityPlatformModerationAction.ISummary> {
    try {
      return await patchCommunityPlatformMemberCommunitiesCommunityIdModerationActions(
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
   * Retrieve a single moderation action record that belongs to a specific community.
   *
   * This operation returns the detailed audit entry for one record from the moderation action history maintained inside the target community. The underlying moderation action entity is the common audit log for enforcement and review steps performed by a user holding a community-local moderation assignment, including community owners and moderators. It exposes the action category, the optional explanatory note entered by the acting moderator, and the lifecycle timestamps that support audit visibility and recovery-oriented review of moderation history.
   *
   * Access to this operation is community-scoped rather than platform-scoped. The requirements state that elevated powers are bounded to the relevant community and that no platform-wide administrative moderation authority is defined in the current scope. As a result, this endpoint must be treated as an internal governance read operation for the target community, not as a global moderation inspection API. The communityId path parameter establishes the boundary context, and the moderationActionId path parameter identifies the exact audit record to retrieve within that boundary.
   *
   * This operation is grounded in the relationship between community_platform_communities and community_platform_moderation_actions. The community table represents the canonical shared-space identity and the moderation boundary for community activity, while the moderation action table stores the auditable record of who acted, in which community the action occurred, what action type was performed, and any optional moderator-entered rationale. Because moderation data for one community must remain separate from moderation data for other communities, the implementation must verify that the requested moderation action belongs to the specified community before returning it.
   *
   * Consumers typically use this endpoint after obtaining community context from community-related APIs and after navigating a community moderation history or moderation workflow screen. It complements list-style moderation history endpoints by allowing a governance actor to inspect one specific action in detail, including its note and timestamps, once the action identifier is known. If the specified community does not exist, if the moderation action does not exist, or if the action is not associated with the provided community, the request must be rejected.
   *
   * Expected error handling must also enforce authorization and boundary rules. Guests must not access this operation, ordinary members without local moderation authority must not inspect community moderation audit records, and platform-wide admin privileges must not be assumed. The operation should return only the record that matches both the requested community and the requested moderation action, ensuring that cross-community leakage of moderation history does not occur.
   *
   * @param connection
   * @param communityId Target community's ID
   * @param moderationActionId Target moderation action's ID within the community
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement a read-only service method that loads a single moderation action audit record by moderation action ID and scoped community ID.
   *
   * 1. Validate that communityId and moderationActionId are valid UUID values.
   * 2. Query community_platform_communities by id = communityId and reject when the community does not exist or is not available for moderation-context access according to service policy.
   * 3. Authorize the caller as an authenticated member with community-local governance authority in the target community. The authorization layer must confirm that the caller is the owner of the target community or holds an active community moderator assignment for that same community. Do not grant access based on platform-wide admin assumptions.
   * 4. Query community_platform_moderation_actions with a predicate on both id = moderationActionId and community_platform_community_id = communityId. This community scoping check is mandatory even if the moderation action ID is globally unique, because moderation data must remain isolated by community boundary.
   * 5. Exclude retired records from normal reads when service policy treats deleted_at as non-readable for standard clients. If deleted moderation actions remain readable for audit purposes, document and consistently enforce that policy in downstream implementation. Do not return unrelated or cross-community records.
   * 6. Map the result to ICommunityPlatformModerationAction, including the primary fields from the audit log: id, acting community moderator reference, scoped community reference, action type, optional note, created timestamp, updated timestamp, and any readable deletion-state timestamp if that DTO includes it.
   * 7. Return not-found when no record matches both the community and moderation action identifiers. Return forbidden when the caller lacks the required community-scoped authority. Return validation errors for malformed identifiers.
   *
   * Implementation should avoid multi-record reads beyond what is necessary for community existence and authorization checks. A single record fetch with precise predicates and indexed fields is sufficient for the core lookup. No write transaction is required because the operation is purely read-only.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":moderationActionId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedParam("moderationActionId")
    moderationActionId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformModerationAction> {
    try {
      return await getCommunityPlatformMemberCommunitiesCommunityIdModerationActionsModerationActionId(
        {
          member,
          communityId,
          moderationActionId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
