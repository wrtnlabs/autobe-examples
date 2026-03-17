import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { ICommunityPlatformPostVote } from "../../../../api/structures/ICommunityPlatformPostVote";
import { IPageICommunityPlatformPostVote } from "../../../../api/structures/IPageICommunityPlatformPostVote";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { patchCommunityPlatformMemberPostVotes } from "../../../../providers/patchCommunityPlatformMemberPostVotes";

@Controller("/communityPlatform/member/postVotes")
export class CommunityplatformMemberPostvotesController {
  /**
   * Retrieve a filtered and paginated list of post vote records for the authenticated member.
   *
   * This operation searches the post-vote collection represented by the community_platform_post_votes table, which stores one current vote stance by a member on a post. Each record preserves the normalized voting relationship between a member and a target post together with the raw direction value needed to derive visible post score changes and author karma effects. The operation is designed for browsing vote state rather than changing it, so it returns existing vote records and related summary context instead of recalculating or mutating votes.
   *
   * Access to this operation should be limited to authenticated members because post votes are identity-linked interactions. The guest actor is limited to public browsing and does not have signed-in identity features, while vote records are tied directly to community_platform_members through community_platform_member_id. In normal use, the server should scope results to the requesting member unless a stricter administrative use case is introduced elsewhere. This protects member-specific reaction history while still supporting interfaces that need to show which posts the current member has upvoted or downvoted.
   *
   * The returned data is rooted in the community_platform_post_votes schema and may join community_platform_posts to expose post summary context needed by clients. The post vote record includes the vote direction, creation time, update time, and removed-from-active-use marker deleted_at. The underlying business rules require one active vote per member per post, and post vote effects contribute to both the visible post score and the post author's karma. This endpoint does not itself apply those effects; instead, it provides a searchable view over the canonical vote records that other read experiences may use.
   *
   * Clients typically use this operation together with post feed or post detail APIs. For example, a member may first retrieve posts through a post listing endpoint and then use this vote index operation to load the member's current reactions for those posts, enabling the UI to render active upvote or downvote state consistently. Because this is a collection search endpoint, filtering, pagination, and sorting information must be supplied in the request body rather than the URL.
   *
   * If filters reference posts that no longer have an active vote record for the requesting member, the response should simply omit those items from the result set. Removed votes may be included or excluded depending on request criteria implemented in the request DTO. Invalid filter combinations, malformed pagination input, or unauthorized access attempts should be rejected according to shared service validation and authentication rules.
   *
   * @param connection
   * @param body Search filters, pagination, and sorting for post votes
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement a paginated search over community_platform_post_votes as the primary table.
   *
   * Authenticate the caller as a member before executing the query. By default, constrain the search to rows whose community_platform_member_id equals the authenticated member's id. Do not expose unrestricted cross-member vote browsing through this operation unless a separate privileged policy is explicitly introduced.
   *
   * Accept an ICommunityPlatformPostVote.IRequest body containing pagination, sorting, and filter criteria. Supported filters should at minimum include vote direction, active-versus-removed state based on deleted_at, created_at range, updated_at range, and optional target post ids. Apply sorting against deterministic indexed columns such as created_at or updated_at, and include a stable secondary sort by id when necessary.
   *
   * Join community_platform_posts when the response summary requires post-level information for display. Do not duplicate or recalculate aggregate post score values inside this query unless they are already part of the response DTO contract. The operation's purpose is to read canonical vote records, not to mutate scores or karma.
   *
   * Exclude physically missing related posts through normal relational integrity handling. For logically removed votes, treat deleted_at as the removed marker and allow request criteria to decide whether only active votes, only removed votes, or both should be returned. Because the schema enforces @@unique([community_platform_member_id, community_platform_post_id]), at most one canonical vote row exists per member-post pair; use that assumption to simplify deduplication logic.
   *
   * Return a standard paginated result envelope using IPageICommunityPlatformPostVote.ISummary. Populate pagination metadata from the filtered result set and map each row to the summary DTO consistently. Reject invalid request payload structures, unauthorized callers, and unsupported sort keys with validation errors before querying.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: ICommunityPlatformPostVote.IRequest,
  ): Promise<IPageICommunityPlatformPostVote.ISummary> {
    try {
      return await patchCommunityPlatformMemberPostVotes({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
