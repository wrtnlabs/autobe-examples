import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { ICommunityPost } from "../../../../api/structures/ICommunityPost";
import { IPageICommunityPost } from "../../../../api/structures/IPageICommunityPost";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { patchCommunityMemberFeed } from "../../../../providers/patchCommunityMemberFeed";

@Controller("/community/member/feed")
export class CommunityMemberFeedController {
  /**
   * Retrieve a paginated, personalized home feed of posts from communities the authenticated member is subscribed to.
   *
   * This endpoint surfaces posts exclusively from communities to which the requesting member currently holds an active subscription (i.e., community_subscriptions records where deleted_at IS NULL). It provides a personalized, subscription-driven view of content distinct from the platform-wide Popular Feed or any single Community Feed. If a member is not subscribed to any community, the response will contain an empty data array.
   *
   * The feed supports four sorting modes: Hot (a relevance-and-recency blend factoring vote score and time), New (chronological, newest first), Top (sorted by net vote score, optionally filtered to a time window: today, this week, this month, this year, or all time), and Controversial (highest absolute engagement with mixed vote directions). When the Top sort is selected without a time-range filter, a default time range is applied. All sorting options are applied only within the scope of posts from the member's subscribed communities.
   *
   * Each post item in the response is a summary representation rather than a full post detail. The summary always includes: the post title, the author's username, the community name, the net vote score (upvotes minus downvotes computed from community_post_votes), the total comment count (aggregated from community_comments including nested replies), and the elapsed time since the post was created. Additionally, a type-specific preview element is included based on the post's type discriminator from community_posts.type: text posts expose the first 200 characters of the body from community_post_texts; image posts expose the thumbnail URL from community_post_images; link posts expose the extracted domain name from community_post_links.
   *
   * This endpoint is accessible only to authenticated members. Guests attempting to access the home feed will receive an authorization error. Members who have no active subscriptions will receive a valid empty paginated response.
   *
   * Related operations: subscribing to a community (POST /communities/{communityId}/subscriptions) immediately causes new posts from that community to appear in this feed. Unsubscribing (DELETE /communities/{communityId}/subscriptions) immediately removes that community's posts from this feed.
   *
   * @param connection
   * @param body Search, sort, time-range filter, and pagination parameters for the home feed.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Authentication: Verify the requesting actor is an authenticated member. Extract the member's ID from the JWT/session token. Return 401 if unauthenticated.
   *
   * 2. Fetch active subscriptions: Query community_subscriptions WHERE community_member_id = <currentMemberId> AND deleted_at IS NULL to get the set of community_community_ids the member is subscribed to. If this set is empty, return an empty paginated response immediately.
   *
   * 3. Query posts: From community_posts WHERE community_community_id IN (<subscribedCommunityIds>) AND deleted_at IS NULL.
   *
   * 4. Compute vote scores: LEFT JOIN community_post_votes aggregated as (COUNT(CASE WHEN vote_type='upvote' THEN 1 END) - COUNT(CASE WHEN vote_type='downvote' THEN 1 END)) per post.
   *
   * 5. Compute comment counts: LEFT JOIN community_comments WHERE deleted_at IS NULL, COUNT(*) grouped by post_id.
   *
   * 6. Apply sort:
   *    - New: ORDER BY community_posts.created_at DESC
   *    - Top: ORDER BY vote_score DESC, with optional time filter on community_posts.created_at >= <rangeStart>. Default time range if not specified: all time or configurable default.
   *    - Hot: ORDER BY a hot score function (e.g., vote_score / (age_in_hours + 2)^1.5) DESC
   *    - Controversial: ORDER BY (upvotes + downvotes) DESC WHERE both upvotes > 0 AND downvotes > 0 (high total votes with mixed directions)
   *
   * 7. Pagination: Apply LIMIT/OFFSET or cursor-based pagination from the request body.
   *
   * 8. Join type-specific payload:
   *    - For type='text': JOIN community_post_texts, return first 200 chars of body as preview snippet.
   *    - For type='image': JOIN community_post_images, return thumbnail_url.
   *    - For type='link': JOIN community_post_links, return domain.
   *
   * 9. JOIN community_members (for author username) and community_communities (for community name).
   *
   * 10. Assemble and return IPageICommunityPost.ISummary with pagination metadata and data array.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: ICommunityPost.IRequest,
  ): Promise<IPageICommunityPost.ISummary> {
    try {
      return await patchCommunityMemberFeed({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
