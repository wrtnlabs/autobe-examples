import { TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformPostVote } from "../../../../api/structures/ICommunityPlatformPostVote";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { getCommunityPlatformMemberVotesPostVoteId } from "../../../../providers/getCommunityPlatformMemberVotesPostVoteId";

@Controller("/communityPlatform/member/votes/:postVoteId")
export class CommunityplatformMemberVotesController {
  /**
   * Retrieve one post vote record by its unique identifier.
   *
   * This operation returns the detail representation of a single record from community_platform_post_votes, the table that stores one member's current vote stance on a specific post. According to the database schema, this table is the normalized relationship between a registered member account in community_platform_members and a top-level community post in community_platform_posts, and it contains the current vote direction together with creation, update, and removal timestamps. The endpoint is intended for cases where the client already knows the vote record identifier and needs the authoritative current state of that specific vote.
   *
   * From a business perspective, a post vote is not an isolated reaction. The loaded requirements state that each active post vote contributes to the visible score of the related post and, in parallel, affects the post author's single karma score. They also state that the platform must allow only one active vote per member on a given post at a time. For that reason, this detail endpoint is useful when a client needs to confirm which vote record currently represents the member-post pair after creation, replacement, restoration, moderation review, or other downstream workflows that depend on the active vote state.
   *
   * Security and authorization for this endpoint should be enforced for authenticated member access only, because community_platform_post_votes links directly to credential-bearing member identities and their content interactions. The implementation should verify that the caller is permitted to inspect the requested vote record under the service's final authorization policy. If the vote has been removed from active use, the response behavior should remain consistent with the platform's visibility rules for records whose deleted_at timestamp is populated.
   *
   * This operation is closely related to post detail and vote-changing operations. A client will typically use post listing or post detail APIs to display a post and its aggregate score, then use vote creation or update behavior to express an upvote or downvote. This detail endpoint can then be used to retrieve the exact persisted vote record referenced by postVoteId, including its direction and lifecycle timestamps, without recalculating post score totals inside this route. Errors should be returned when the identifier is malformed, when no such vote exists, or when the caller is not authorized to access the record.
   *
   * @param connection
   * @param postVoteId Unique identifier of the target post vote record
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement a read-only service method that loads a single row from community_platform_post_votes by its primary key id.
   *
   * Validate that postVoteId is a UUID-formatted identifier before querying. Query the vote row by id and join the related community_platform_members record through community_platform_member_id and the related community_platform_posts record through community_platform_post_id when authorization, ownership checks, or response composition requires those relations. If no row exists for the supplied id, return a not-found error.
   *
   * Map the result to ICommunityPlatformPostVote. The payload should reflect the persisted vote record, including its unique identifier, foreign-key-backed relationships as represented by the DTO model, current direction, and lifecycle timestamps. Do not recompute or embed post aggregate vote totals in this operation unless the response schema explicitly includes them elsewhere in generated components.
   *
   * If the platform policy treats rows with deleted_at set as removed from active use, apply the service's standard visibility rule consistently. Either exclude such rows from normal retrieval and return not found, or return them only when the caller is explicitly allowed to inspect removed records under downstream policy. Keep the behavior consistent with other vote-detail endpoints.
   *
   * No transaction is required beyond the normal read query because this endpoint does not mutate state. However, the implementation should preserve consistency with the business rules that only one active vote per member per post may exist and that active vote state influences post score and author karma. This route only reads the authoritative stored vote record and must not trigger recalculation side effects.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get()
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postVoteId")
    postVoteId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformPostVote> {
    try {
      return await getCommunityPlatformMemberVotesPostVoteId({
        member,
        postVoteId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
