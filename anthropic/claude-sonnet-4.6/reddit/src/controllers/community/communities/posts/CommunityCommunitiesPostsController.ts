import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPost } from "../../../../api/structures/ICommunityPost";
import { IPageICommunityPost } from "../../../../api/structures/IPageICommunityPost";
import { patchCommunityCommunitiesCommunityIdPosts } from "../../../../providers/patchCommunityCommunitiesCommunityIdPosts";

@Controller("/community/communities/:communityId/posts")
export class CommunityCommunitiesPostsController {
  /**
   * Retrieve a paginated, filtered, and sorted list of posts within a specific community.
   *
   * This operation provides the Community Feed — a scoped post listing that shows only the posts submitted to the specified community. It is the primary way to browse content within a community's dedicated page. The feed is publicly accessible to all visitors, including unauthenticated guests, as well as authenticated members.
   *
   * The underlying data is sourced from the `community_posts` table, which records each post's author (`community_member_id`), community scope (`community_community_id`), title, post type discriminator (`type`: one of `text`, `link`, or `image`), and timestamps. Only active posts (where `deleted_at` is null) are returned. Type-specific content payloads are joined from `community_post_texts`, `community_post_links`, or `community_post_images` for preview rendering.
   *
   * Net vote scores used for ranking are computed from the `community_post_votes` table, which records individual upvote and downvote actions per member per post. Comment counts are derived from related comment records at query time and are never stored directly on the post.
   *
   * The feed supports four sorting modes:
   * - **Hot**: Ranks posts by a combination of vote score and recency (similar to a decay-weighted score).
   * - **New**: Orders posts by `created_at` descending — the most recently submitted posts appear first.
   * - **Top**: Orders posts by net vote score descending, optionally filtered to posts created within a selected time range (today, this week, this month, this year, or all time).
   * - **Controversial**: Orders posts by high engagement with a balanced vote split (high total votes but close upvote/downvote ratio).
   *
   * When the Top sort is selected without a time range, the system applies a default time range. All sorting and filtering operate within the community scope, so only posts belonging to the specified community appear in the results.
   *
   * Pagination is applied to all results. The caller specifies the page number and page size in the request body. Responses include a pagination metadata object alongside the data array.
   *
   * To retrieve the full detail of a specific post, use `GET /community/communities/{communityId}/posts/{postId}`. To create a post in this community, use `POST /community/communities/{communityId}/posts` (requires membership and subscription).
   *
   * @param connection
   * @param communityId The UUID of the target community whose posts are to be retrieved. References community_communities.id.
   * @param body Pagination, sorting, and filtering criteria for the community post feed.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification 1. Validate that the communityId path parameter
     *   corresponds to an existing, non-deleted community in the
     *   community_communities table (deleted_at IS NULL). If the community does
     *   not exist or is deleted, return 404. 2. Parse the request body for
     *   pagination (page, limit), sort mode (hot, new, top, controversial), and
     *   optional time range filter (today, this_week, this_month, this_year,
     *   all_time — only applicable when sort=top). 3. Query community_posts
     *   WHERE community_community_id = communityId AND deleted_at IS NULL. 4.
     *   Apply sorting: - hot: compute a decay-weighted score combining vote
     *   count and post age; order by score DESC. - new: ORDER BY created_at
     *   DESC. - top: compute net vote score (upvotes - downvotes) from
     *   community_post_votes; if time range is specified, add WHERE created_at
     *   >= (now - range); ORDER BY net_score DESC. - controversial: compute
     *   total votes and vote balance; high total with balanced split; ORDER BY
     *   controversy_score DESC. 5. For Top sort without time range specified,
     *   default to 'this_week' or 'all_time' per business rules. 6. Join
     *   type-specific payload tables (community_post_texts,
     *   community_post_links, community_post_images) based on the post's `type`
     *   discriminator for preview/summary data. 7. Compute vote counts
     *   (upvote_count, downvote_count, net_score) and comment_count by
     *   aggregating from community_post_votes and community_comments. 8. Apply
     *   pagination: OFFSET/LIMIT based on page and limit values; compute total
     *   count for pagination metadata. 9. Return paginated result with
     *   pagination metadata and array of post summaries.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPost.IRequest,
  ): Promise<IPageICommunityPost.ISummary> {
    try {
      return await patchCommunityCommunitiesCommunityIdPosts({
        communityId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
