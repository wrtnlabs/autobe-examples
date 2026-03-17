import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformModerationActionBan } from "../../../../../../api/structures/ICommunityPlatformModerationActionBan";
import { IPageICommunityPlatformModerationActionBan } from "../../../../../../api/structures/IPageICommunityPlatformModerationActionBan";
import { MemberAuth } from "../../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../../decorators/payload/MemberPayload";
import { getCommunityPlatformMemberCommunitiesCommunityIdModerationActionsModerationActionIdBansModerationActionBanId } from "../../../../../../providers/getCommunityPlatformMemberCommunitiesCommunityIdModerationActionsModerationActionIdBansModerationActionBanId";
import { patchCommunityPlatformMemberCommunitiesCommunityIdModerationActionsModerationActionIdBans } from "../../../../../../providers/patchCommunityPlatformMemberCommunitiesCommunityIdModerationActionsModerationActionIdBans";

@Controller(
  "/communityPlatform/member/communities/:communityId/moderationActions/:moderationActionId/bans",
)
export class CommunityplatformMemberCommunitiesModerationactionsBansController {
  /**
   * Retrieve the ban target records linked to a specific moderation action within a community moderation context.
   *
   * This operation exposes moderation-audit linkage for community ban enforcement by listing the community ban records associated with the specified moderation action in the specified community. The underlying moderation action record in `community_platform_moderation_actions` represents an enforcement or moderation step taken by a user holding a community-local moderation assignment, while the subtype table `community_platform_moderation_action_bans` normalizes the relationship between that generic moderation action and the concrete `community_platform_community_bans` record it targeted. The returned data is therefore useful when a moderator needs to inspect which participation restriction was created, reviewed, or otherwise referenced by a moderation action.
   *
   * Access to this operation must be restricted to users who currently hold moderation authority in the target community. The loaded requirements for community bans state that ban management and banned-user visibility are community-scoped moderation capabilities, and that moderation data for one community must remain separate from moderation data for other communities. Accordingly, the system must confirm that the supplied `communityId` identifies the same community referenced by the moderation action, and it must deny access when the caller lacks owner or moderator standing in that community.
   *
   * The response is derived from `community_platform_moderation_action_bans` joined to `community_platform_community_bans`. The ban record contains the community-scoped participation restriction state, including its moderation reason, current lifecycle status such as active, expired, or lifted, the effective start timestamp, and optional expiration or lift timestamps. Because `community_platform_community_bans` belongs both to a community and a banned member, the returned information reflects a ban that applies only within the selected community and does not imply restrictions in any other community.
   *
   * This endpoint is a moderation review and audit operation rather than a command endpoint. It does not create, update, lift, or remove bans. If a client needs to manage ban state, that must be done through dedicated ban-management operations. This operation is intended to be used together with broader moderation action browsing so that a moderator can first locate a relevant moderation action and then inspect the related ban target linkage in detail. If the moderation action does not exist, does not belong to the given community, or has no linked ban target, the system should respond consistently with the service's authorization and not-found handling rules.
   *
   * @param connection
   * @param communityId Target community's ID
   * @param moderationActionId Target moderation action's ID within the community
   * @param body Search criteria, filtering, and pagination options for moderation action ban targets
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Validate that the authenticated actor is a member who currently holds moderation authority in the target community, including owner-equivalent authority if modeled through community moderator ownership records. Reject guests and members without moderation authority.
   *
   * Load the `community_platform_moderation_actions` record by `moderationActionId` and verify that its `community_platform_community_id` matches the `communityId` path parameter. If the community does not exist or the moderation action is outside the provided community scope, return a not-found or forbidden result according to the service's standard boundary-handling policy, without leaking cross-community moderation data.
   *
   * Query `community_platform_moderation_action_bans` as the primary list source filtered by `community_platform_moderation_action_id = moderationActionId`. Join to `community_platform_community_bans` on `community_platform_community_ban_id = community_platform_community_bans.id` and enforce that the joined ban row belongs to the same `communityId`. Exclude logically removed rows where subtype or target records are retired from active retrieval if the service treats non-null `deleted_at` as non-browsable in moderation views.
   *
   * Apply request-body driven pagination, sorting, and optional filters. Supported filters should be limited to fields grounded in the loaded schema, such as ban `status`, `started_at` range, `expired_at` presence or range, `lifted_at` presence or range, and text search over `reason`. Sorting should default to newest linked ban target first, using subtype `created_at` or ban `started_at`, and may allow stable secondary ordering by primary key.
   *
   * Map each row into `ICommunityPlatformModerationActionBan.ISummary`, including identifiers and summary fields from the linked `community_platform_community_bans` record that are appropriate for moderation review. Return the collection in `IPageICommunityPlatformModerationActionBan.ISummary`. If no linked ban target exists for the moderation action, return an empty page rather than synthesizing a placeholder record.
   *
   * Ensure the implementation remains read-only. Do not create audit rows, modify ban state, or infer unrelated moderation targets from other subtype tables. Keep all filtering and visibility strictly inside the specified community boundary to satisfy the loaded data-isolation and community-scope requirements.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedParam("moderationActionId")
    moderationActionId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformModerationActionBan.IRequest,
  ): Promise<IPageICommunityPlatformModerationActionBan.ISummary> {
    try {
      return await patchCommunityPlatformMemberCommunitiesCommunityIdModerationActionsModerationActionIdBans(
        {
          member,
          communityId,
          moderationActionId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single moderation-action ban target record within a community's moderation audit context.
   *
   * This operation returns the normalized subtype record that connects one community moderation action to the specific community ban it targeted. In the database design, `community_platform_moderation_action_bans` exists as a one-to-one specialization of `community_platform_moderation_actions` so that the platform can keep a generic moderation audit log while still preserving a precise reference to the affected `community_platform_community_bans` record. This allows consumers to inspect how a ban-related moderation step was linked without overloading the parent moderation action table with polymorphic nullable foreign keys.
   *
   * Access to this operation is intended for members who currently hold moderation authority in the target community, because ban enforcement and ban visibility are explicitly community-scoped moderation capabilities. The related requirements state that banning a user is allowed only for members with moderation authority in that community, and that banned-user visibility is limited to bans in that same community. Accordingly, the nested route includes the community identifier as the primary business boundary and the implementation must ensure that the requested moderation action and ban-target linkage both belong to that exact community.
   *
   * This operation is closely related to the underlying community ban record stored in `community_platform_community_bans`. That parent ban record contains the banned member reference, moderation reason, current lifecycle status such as active, expired, or lifted, and timestamps including `started_at`, optional `expired_at`, and optional `lifted_at`. By contrast, this endpoint focuses on the audit linkage itself: the specific moderation action record, its association to the target ban, and the historical traceability of when that linkage record was created and updated.
   *
   * Clients typically use this operation after locating a moderation action through community moderation history or after listing bans in a community. It should be used when the client needs the exact linkage entity for a known moderation action and ban-target association, not for browsing all banned users. For community-level banned-user review, the list-oriented moderation endpoints for active bans are the more appropriate precursor operations.
   *
   * If any supplied identifier does not exist, does not belong to the same nested scope, or refers to a resource outside the specified community, the request must fail rather than returning cross-community data. This preserves the isolation guarantees described in the requirements, where moderation data for one community must remain separate from moderation data for other communities.
   *
   * @param connection
   * @param communityId Target community identifier that defines the moderation scope
   * @param moderationActionId Target moderation action identifier within the specified community
   * @param moderationActionBanId Target moderation action ban linkage identifier under the specified moderation action
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement a read-only service method that fetches one `community_platform_moderation_action_bans` record by its primary key and validates the full nested scope.
   *
   * First, verify that the caller is an authenticated member with current moderation authority in the community identified by `communityId`. Reject guests and members who do not hold moderation authority in that community.
   *
   * Next, load the `community_platform_moderation_actions` record identified by `moderationActionId` and confirm that its `community_platform_community_id` equals `communityId`. Then load the `community_platform_moderation_action_bans` record identified by `moderationActionBanId` and confirm that its `community_platform_moderation_action_id` equals `moderationActionId`.
   *
   * From the loaded subtype record, join the referenced `community_platform_community_bans` record and confirm that its `community_platform_community_id` also equals `communityId`. This triple validation is mandatory so the route cannot be used to infer or access moderation data from another community by mixing unrelated identifiers.
   *
   * Return the detailed DTO for the moderation action ban linkage, including its own identity and timestamps and the associated moderation action / community ban references as defined by the DTO schema. The implementation may eager-load the parent moderation action and community ban relations if the response model requires them.
   *
   * Treat missing records, mismatched nesting, deleted or inaccessible parent resources, and unauthorized moderation access as error conditions. Do not create, update, or delete any records during this operation. No transaction beyond a consistent read is required unless the persistence layer needs one for relation-safe loading.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":moderationActionBanId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedParam("moderationActionId")
    moderationActionId: string & tags.Format<"uuid">,
    @TypedParam("moderationActionBanId")
    moderationActionBanId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformModerationActionBan> {
    try {
      return await getCommunityPlatformMemberCommunitiesCommunityIdModerationActionsModerationActionIdBansModerationActionBanId(
        {
          member,
          communityId,
          moderationActionId,
          moderationActionBanId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
