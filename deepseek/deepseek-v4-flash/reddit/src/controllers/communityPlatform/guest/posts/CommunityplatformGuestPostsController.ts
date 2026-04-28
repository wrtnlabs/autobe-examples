import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformPost } from "../../../../api/structures/ICommunityPlatformPost";
import { IPageICommunityPlatformPost } from "../../../../api/structures/IPageICommunityPlatformPost";
import { GuestAuth } from "../../../../decorators/GuestAuth";
import { GuestPayload } from "../../../../decorators/payload/GuestPayload";
import { getCommunityPlatformGuestPostsPostId } from "../../../../providers/getCommunityPlatformGuestPostsPostId";
import { patchCommunityPlatformGuestPosts } from "../../../../providers/patchCommunityPlatformGuestPosts";

@Controller("/communityPlatform/guest/posts")
export class CommunityplatformGuestPostsController {
  /**
   * Retrieves a paginated, sorted list of post summaries across the platform.
   *
   * This endpoint serves as the unified post feed, supporting three modes:
   * - **Popular Feed** (default): Returns posts from all communities across the platform. Available to all actors including guests.
   * - **Home Feed**: Returns posts only from communities the authenticated member is subscribed to. Requires member authentication; guests receive an authentication-required error.
   * - **Community-scoped feed**: When a community filter is provided, returns posts from that specific community only.
   *
   * All feed modes support the same sorting options:
   * - `hot`: Recent posts with many upvotes appear first — balances recency and vote velocity.
   * - `new`: Most recently created posts appear first — strictly chronological descending.
   * - `top`: Highest net vote score first. Supports time filters: today, this week, this month, this year, all time.
   * - `controversial`: Posts with many total votes but a score near zero appear first — identifies divisive content.
   *
   * Each post in the result carries a summary preview: title, author username, community name, vote score, comment count, relative timestamp, and type-specific content preview (text excerpt for text posts, domain name for link posts, image URL for image posts). The full post content is not included — use the single post retrieval endpoint for detailed content.
   *
   * Results are paginated using cursor-based pagination for consistent results during active posting periods.
   *
   * @param connection
   * @param body Search, filter, sort, and pagination criteria for browsing posts. Includes feed type selection, community scope, text search, author filter, sort mode with optional time range, and cursor-based pagination parameters.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor guest
     * @x-autobe-specification Query the community_platform_posts table with the
     *   following filtering and sorting logic:
   *
   * **Feed Type Determination**:
   * - If `feed` parameter is "home" and the member is authenticated: retrieve community IDs from community_platform_community_subscriptions for the authenticated member, then filter posts to those communities.
   * - If `feed` parameter is "home" and no authenticated member: return 401 Unauthorized.
   * - If `communityId` filter is provided: filter posts to that specific community (verify the community exists and is not deleted).
   * - If no filter (default / popular): return all non-deleted posts across all communities.
   *
   * **Filtering**:
   * - Always exclude soft-deleted posts (deleted_at IS NULL).
   * - If community filter is provided, filter by community_id.
   * - Apply search text filter on post title (case-insensitive LIKE).
   * - Optional author filter by member_id.
   *
   * **Sorting**:
   * - `hot`: Sort by a computed hotness score. A simple approximation: ORDER BY (vote_score / POW(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 + 2, 1.5)) DESC.
   * - `new`: ORDER BY created_at DESC.
   * - `top`: ORDER BY vote_score DESC. If a time filter (today, week, month, year, all) is provided, add WHERE created_at >= corresponding interval.
   * - `controversial`: ORDER BY (ABS(vote_score) + 1) * (comment_count + 1) * (1.0 / (ABS(vote_score) + 1)) DESC — prefer posts with many total votes and score near zero. A simpler approach: ORDER BY (upvote_count + downvote_count) DESC, vote_score ASC using vote_summaries join.
   *
   * **Pagination**:
   * - Use cursor-based pagination with `created_at` or `vote_score` as cursor depending on sort mode.
   * - For `new` sort: cursor on created_at. For `top`: cursor on (vote_score, created_at). For `hot`/`controversial`: use opaque cursor.
   * - Support `limit` (page size, default 20, max 50) and `cursor` (opaque string or timestamp).
   *
   * **Joins**:
   * - Join community_platform_communities for community name.
   * - Join community_platform_members for author username.
   * - Left join conditionally on type-specific tables:
   *   - type = 'text': left join community_platform_post_texts for body (first 200 chars excerpt).
   *   - type = 'link': left join community_platform_post_links for domain_name.
   *   - type = 'image': left join community_platform_post_images for url (thumbnail).
   * - Optionally left join community_platform_votes to get the authenticated member's vote on each post (if logged in).
   *
   * **Edge Cases**:
   * - Empty feed (no posts matching criteria): return empty page with 200 OK.
   * - Community not found or deleted: return 404 Not Found.
   * - Invalid sort option: return 400 Bad Request.
   * - Guest accessing home feed: return 401 Unauthorized.
   * - Deleted posts never appear in results.
   * - Cursor pagination returns 404 when cursor points to a deleted/non-existent post — return empty page instead.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @GuestAuth()
    guest: GuestPayload,
    @TypedBody()
    body: ICommunityPlatformPost.IRequest,
  ): Promise<IPageICommunityPlatformPost.ISummary> {
    try {
      return await patchCommunityPlatformGuestPosts({
        guest,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single post by its unique identifier with full content details.
   *
   * This endpoint returns the complete post entity including its title, type-specific content (text body, link URL with domain, or image reference), author information, community association, vote score, comment count, and timestamps. The response varies based on the post's type discriminator: text posts include the full body content, link posts include the target URL and extracted domain name, and image posts include the image file storage URI.
   *
   * Accessible to all users including unauthenticated guests. The endpoint respects soft deletion — posts where deleted_at is set are not returned, effectively treating them as removed from public view.
   *
   * @param connection
   * @param postId Unique identifier (UUID) of the post to retrieve.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor guest
     * @x-autobe-specification Query community_platform_posts by the given
     *   postId WHERE deleted_at IS NULL. Join with community_platform_members
     *   (author) to retrieve the author's username and profile info. Join with
     *   community_platform_communities to retrieve the community name. Based on
     *   the post's type field, include the corresponding 1:1 child record: for
     *   'text' type join community_platform_post_texts (body), for 'link' type
     *   join community_platform_post_links (url, domain_name), for 'image' type
     *   join community_platform_post_images (url). Return a 404 Not Found error
     *   if no post matches the given postId or if the post has been
     *   soft-deleted (deleted_at is not null). The response should include all
     *   post columns, the type-specific content, the author's username, and the
     *   community name.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":postId")
  public async at(
    @GuestAuth()
    guest: GuestPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformPost> {
    try {
      return await getCommunityPlatformGuestPostsPostId({
        guest,
        postId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
