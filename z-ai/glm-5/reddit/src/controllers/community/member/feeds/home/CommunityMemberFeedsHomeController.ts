import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { ICommunityPost } from "../../../../../api/structures/ICommunityPost";
import { IPageICommunityPost } from "../../../../../api/structures/IPageICommunityPost";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { patchCommunityMemberFeedsHome } from "../../../../../providers/patchCommunityMemberFeedsHome";

@Controller("/community/member/feeds/home")
export class CommunityMemberFeedsHomeController {
  /**
   * Retrieve a personalized home feed containing posts from communities the authenticated member has subscribed to.
   *
   * This endpoint provides the primary content discovery experience for authenticated members, aggregating posts from all subscribed communities into a unified feed. Each post in the response includes vote scores, comment counts, author information, community details, and content previews appropriate to the post type.
   *
   * The feed supports multiple sorting algorithms to cater to different browsing preferences:
   * - **Hot**: Ranks posts by a combination of vote score, recency, and engagement, surfacing trending content
   * - **New**: Purely chronological order, showing the most recently created posts first
   * - **Top**: Posts ranked by vote score within a configurable time window (today, this week, this month, this year, or all time)
   * - **Controversial**: Posts with high total votes but vote scores near zero, indicating divisive content
   *
   * Posts are returned with denormalized vote metrics (vote_score, upvote_count, downvote_count) and comment counts for efficient display without additional queries. The response includes post type-specific previews: text posts show the first 200 characters, image posts include thumbnail URLs, and link posts display extracted domain names.
   *
   * Authentication is required. Anonymous users cannot access the home feed and should use the popular feed instead. The subscriber count and subscription status are reflected in real-time as users subscribe or unsubscribe to communities.
   *
   * Pagination uses cursor-based navigation to ensure consistent results even when new posts are created during browsing sessions. Each response includes metadata for navigating to subsequent pages.
   *
   * @param connection
   * @param body Sorting, time filter, and pagination parameters for the home feed
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps for the home feed operation:
   *
   * 1. **Authentication Validation**: Verify the request includes a valid JWT token. Extract the member ID from the token for subscription lookup.
   *
   * 2. **Subscription Lookup**: Query the community_subscriptions table to retrieve all community IDs the member has subscribed to:
   *    - SELECT community_community_id FROM community_subscriptions WHERE community_member_id = {memberId}
   *    - If the member has no subscriptions, return an empty result set with appropriate pagination metadata.
   *
   * 3. **Base Query Construction**: Build a query against community_posts with the following filters:
   *    - community_id IN (subscribed community IDs)
   *    - is_deleted = false
   *    - Exclude posts from communities where the member is banned (check community_bans table)
   *
   * 4. **Sort Algorithm Application**:
   *    - **Hot**: ORDER BY hot_score DESC, created_at DESC
   *    - **New**: ORDER BY created_at DESC
   *    - **Top**: Apply time filter to created_at, then ORDER BY vote_score DESC, created_at DESC
   *    - **Controversial**: ORDER BY controversy_score DESC, created_at DESC
   *
   * 5. **Time Filter Calculation** (for Top sorting):
   *    - today: created_at >= NOW() - INTERVAL '24 hours'
   *    - week: created_at >= NOW() - INTERVAL '7 days'
   *    - month: created_at >= NOW() - INTERVAL '30 days'
   *    - year: created_at >= NOW() - INTERVAL '365 days'
   *    - all: No time restriction
   *
   * 6. **Pagination**: Apply cursor-based pagination:
   *    - Decode the cursor to extract the last seen post's sort position and timestamp
   *    - Use WHERE clause conditions based on sort field and cursor value
   *    - Default limit: 25 posts per page (configurable between 10-100)
   *
   * 7. **Data Enrichment**: For each post in the result:
   *    - Join with community_communities to get community name
   *    - Join with community_members to get author username and avatar
   *    - Calculate content preview based on post_type
   *    - Check if the current member has voted on this post (query community_post_votes)
   *
   * 8. **Response Assembly**: Return posts with pagination metadata including:
   *    - Next cursor for subsequent pages
   *    - Whether more results exist
   *    - Current sort and filter settings
   *
   * 9. **Performance Considerations**:
   *    - Use existing indexes: idx_posts_community_created, idx_posts_community_score, idx_posts_hot_score
   *    - Consider caching frequently accessed home feeds for active users
   *    - Denormalized counts reduce the need for count queries
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
      return await patchCommunityMemberFeedsHome({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
