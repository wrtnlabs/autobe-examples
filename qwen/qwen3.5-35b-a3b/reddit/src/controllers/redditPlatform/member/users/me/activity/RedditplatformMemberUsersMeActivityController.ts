import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IPageIRedditPlatformPost } from "../../../../../../api/structures/IPageIRedditPlatformPost";
import { IRedditPlatformPost } from "../../../../../../api/structures/IRedditPlatformPost";
import { MemberAuth } from "../../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../../decorators/payload/MemberPayload";
import { patchRedditPlatformMemberUsersMeActivity } from "../../../../../../providers/patchRedditPlatformMemberUsersMeActivity";

@Controller("/redditPlatform/member/users/me/activity")
export class RedditplatformMemberUsersMeActivityController {
  /**
   * Retrieve personalized home feed showing posts from all communities to which the authenticated member is subscribed.
   *
   * The home feed displays posts sorted by engagement or recency. Users can filter the feed by sorting method (hot, new, top, controversial) and time range for top sorting (today, week, month, year, all). The feed includes full post details with author information, community context, vote scores, and comment counts.
   *
   * Only authenticated members can access their personalized home feed. Guests are redirected to the popular feed instead.
   *
   * The API implements cursor-based pagination for efficient retrieval of large datasets. Each response includes pagination metadata to navigate through the feed.
   *
   * ### Sorting Methods
   *
   * - **hot**: Posts sorted by score weighted by time decay (newer posts get a boost)
   * - **new**: Posts sorted by creation date (newest first)
   * - **top**: Posts sorted by total upvotes within specified time range
   * - **controversial**: Posts sorted by the difference between upvotes and downvotes relative to total engagement
   *
   * @param connection
   * @param body Search criteria including sorting options (hot, new, top, controversial), time range filter for top sorting (today, week, month, year, all), pagination cursor, and items per page.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Retrieve posts from communities where the authenticated member is subscribed.
   *
   * 1. Verify authentication - member must be logged in (validate JWT session token)
   * 2. Extract member_id from authenticated session context
   * 3. Query reddit_platform_subscriptions to find all active subscriptions (deleted_at IS NULL) for the authenticated member
   * 4. Join with reddit_platform_posts on community_id to get all posts from subscribed communities
   * 5. Filter out soft-deleted posts (deleted_at IS NULL) and posts from deleted communities
   * 6. Apply sorting based on sort parameter:
   *    - 'hot': score * 1.01 ^ (hours_since_post / 10) - exponential time decay
   *    - 'new': created_at DESC
   *    - 'top': upvotes_count within time range (default all time), then score DESC
   *    - 'controversial': ABS(upvotes_count - downvotes_count) / NULLIF(upvotes_count + downvotes_count, 0), nulls last
   * 7. Apply time range filter if sort='top' or 'controversial':
   *    - 'today': created_at >= NOW() - INTERVAL '24 hours'
   *    - 'week': created_at >= NOW() - INTERVAL '7 days'
   *    - 'month': created_at >= NOW() - INTERVAL '30 days'
   *    - 'year': created_at >= NOW() - INTERVAL '365 days'
   *    - 'all': no time filter
   * 8. Implement cursor-based pagination using request body parameters:
   *    - Accept cursor parameter (created_at + id combination)
   *    - Query posts WHERE (created_at, id) < cursor for previous page
   *    - Query posts WHERE (created_at, id) > cursor for next page
   *    - Default limit: 20 posts per page
   *    - Maximum limit: 100 posts per page
   *    - Validate cursor format if provided
   * 9. Return paginated results with post summaries including:
   *    - post.id, title, post_type
   *    - author.id, author.username, author.karma
   *    - community.id, community.name
   *    - upvotes_count, downvotes_count, score
   *    - comment_count
   *    - created_at (ISO 8601 format)
   *    - vote.is_voted (boolean - true if authenticated user has voted on this post)
   *
   * Request body parameters:
   * - sort: string - 'hot', 'new', 'top', 'controversial' (default: 'hot')
   * - topTimeRange: string - 'today', 'week', 'month', 'year', 'all' (only for 'top' sort, default: 'all')
   * - cursor: string - cursor for pagination (created_at + id encoded)
   * - limit: number - items per page (1-100, default: 20)
   *
   * Database queries:
   * ```sql
   * SELECT
   *   p.*,
   *   m.username as author_username,
   *   m.karma as author_karma,
   *   c.name as community_name
   * FROM reddit_platform_posts p
   * JOIN reddit_platform_members m ON p.author_id = m.id
   * JOIN reddit_platform_communities c ON p.community_id = c.id
   * WHERE p.deleted_at IS NULL
   *   AND c.deleted_at IS NULL
   *   AND p.community_id IN (
   *     SELECT sp.community_id
   *     FROM reddit_platform_subscriptions sp
   *     WHERE sp.user_id = :member_id AND sp.deleted_at IS NULL
   *   )
   *   -- Apply cursor-based pagination if cursor provided
   *   -- AND (p.created_at, p.id) < :cursor
   * ORDER BY
   *   CASE :sort
   *     WHEN 'hot' THEN score * POWER(1.01, EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600)
   *     WHEN 'new' THEN p.created_at
   *     WHEN 'top' THEN p.upvotes_count
   *     WHEN 'controversial' THEN ABS(p.upvotes_count - p.downvotes_count) / NULLIF(p.upvotes_count + p.downvotes_count, 0)
   *   END DESC
   * LIMIT :limit
   * ```
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IRedditPlatformPost.IRequest,
  ): Promise<IPageIRedditPlatformPost.ISummary> {
    try {
      return await patchRedditPlatformMemberUsersMeActivity({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
