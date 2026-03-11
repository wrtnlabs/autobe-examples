import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IPageIRedditPlatformPost } from "../../../../../../api/structures/IPageIRedditPlatformPost";
import { IRedditPlatformPost } from "../../../../../../api/structures/IRedditPlatformPost";
import { GuestAuth } from "../../../../../../decorators/GuestAuth";
import { GuestPayload } from "../../../../../../decorators/payload/GuestPayload";
import { patchRedditPlatformGuestPostsFeedPopular } from "../../../../../../providers/patchRedditPlatformGuestPostsFeedPopular";

@Controller("/redditPlatform/guest/posts/feed/popular")
export class RedditplatformGuestPostsFeedPopularController {
  /**
   * Retrieve a paginated list of popular posts from all communities across the platform.
   *
   * This operation provides access to the popular feed, which aggregates posts from every community on the platform regardless of subscription status. The feed is designed to surface trending and high-quality content to all users, including those who are not logged in.
   *
   * Supports multiple sorting algorithms to help users discover content in different ways:
   * - Hot: Ranks posts by a combination of recency and vote activity, favoring recent posts with significant engagement
   * - New: Displays posts in reverse chronological order by creation timestamp
   * - Top: Sorts by total vote score (upvotes minus downvotes), with optional time period filtering
   * - Controversial: Identifies posts with significant engagement from opposing viewpoints (high vote count but net score near zero)
   *
   * Each post in the response includes essential preview information optimized for list displays:
   * - Post title
   * - Author username
   * - Community name
   * - Current vote score
   * - Total comment count
   * - Time elapsed since posting (relative format, e.g., "3 hours ago")
   * - Content preview appropriate to post type (first 200 characters for text posts, thumbnail URL for image posts, domain name for link posts)
   *
   * The endpoint implements cursor-based or offset-based pagination to handle large result sets efficiently, with configurable page size and total count information.
   *
   * This feed differs from the home feed in that it displays posts from all communities rather than filtering by the user's subscriptions. It also differs from community-specific feeds by aggregating content across the entire platform.
   *
   * Related operations:
   * - `GET /posts/feed/home` - View posts only from communities you have subscribed to (members only)
   * - `GET /posts/feed/community/{communityId}` - View posts from a specific community
   * - `GET /posts/{id}` - Retrieve detailed information about a single post
   * - `POST /posts` - Create a new post in a community
   *
   * @param connection
   * @param body Search criteria, sorting options, and pagination parameters for the popular feed
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor guest
   * @x-autobe-specification Query reddit_platform_posts table joined with reddit_platform_members and reddit_platform_communities.
   *
   * Apply filters based on request parameters:
   * - exclude posts where deleted_at is not null (soft-deleted)
   * - include posts from all communities
   *
   * Sorting implementation:
   * - hot: Calculate weighted score using vote_score and created_at/time decay algorithm, order DESC
   * - new: Order by created_at DESC
   * - top: Order by vote_score DESC, apply time filter if timeRange is specified (today/this_week/this_month/this_year/all_time)
   * - controversial: Calculate |vote_score| / sqrt(total_votes) to find posts with polarizing engagement, order DESC
   *
   * Pagination:
   * - Use offset-based pagination with page and limit parameters
   * - Default page=1, limit=20 (configurable up to 100)
   * - Include total count in response for pagination UI
   *
   * Join requirements:
   * - INNER JOIN reddit_platform_members on reddit_platform_posts.reddit_platform_member_id = reddit_platform_members.id
   * - INNER JOIN reddit_platform_communities on reddit_platform_posts.reddit_platform_community_id = reddit_platform_communities.id
   * - LEFT JOIN reddit_platform_post_engagement_stats on reddit_platform_posts.id = reddit_platform_post_engagement_stats.post_id
   * - LEFT JOIN reddit_platform_post_votes on reddit_platform_posts.id = reddit_platform_post_votes.post_id for vote aggregation if not using engagement_stats
   *
   * Response construction:
   * - Transform to IRedditPlatformPost.ISummary with all required fields
   * - Calculate relative time since created_at from current server time
   * - For text posts, truncate content to 200 characters
   * - For image posts, return image_url as preview
   * - For link posts, extract and return domain name from url field
   *
   * Return IPageIRedditPlatformPost.ISummary with pagination metadata (page, limit, total, hasNextPage).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @GuestAuth()
    guest: GuestPayload,
    @TypedBody()
    body: IRedditPlatformPost.IRequest,
  ): Promise<IPageIRedditPlatformPost.ISummary> {
    try {
      return await patchRedditPlatformGuestPostsFeedPopular({
        guest,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
