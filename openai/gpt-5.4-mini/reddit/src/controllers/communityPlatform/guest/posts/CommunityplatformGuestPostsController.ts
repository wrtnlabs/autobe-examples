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
   * Retrieve a paginated list of community posts for feed and browsing views.
   *
   * This endpoint returns the collection of posts shown in the platform's feeds, including the home feed for authenticated members, the popular feed for public browsing, and the posts visible within a specific community. Each item is presented as a summary record optimized for list display, with the post title, author identity, community name, vote score, comment count, posting time, and subtype-specific preview information.
   *
   * The response is built from the shared post table and its subtype tables. The shared record in community_platform_posts provides the canonical post identity, title, author, community, lifecycle state, and timestamps. The subtype tables community_platform_post_texts, community_platform_post_links, and community_platform_post_images provide the preview content for text, link, and image posts respectively. Author and community display data come from community_platform_members and community_platform_communities, while vote score and comment count are derived from the voting and comment domains.
   *
   * Browsing behavior follows the platform's feed rules and sorting rules. Requests can be scoped to the authenticated member's subscribed communities for a home feed, to all communities for a public popular feed, or to a single community for a community-specific feed. Sorting must honor the supported post ordering modes: hot, new, top, and controversial. Top sorting may also be constrained by a time window such as today, this week, this month, this year, or all time. When the request includes search criteria, the implementation should filter by the post title and the appropriate preview text fields while preserving stable pagination.
   *
   * This operation is read-only and should not change post ownership, community membership, vote state, or content state. If the request asks for a feed that depends on subscription membership, the service must verify the caller's active membership records before applying the subscriber-scoped filter. If the caller is not authenticated, only public browsing scopes may be used.
   *
   * @param connection
   * @param body Feed scope, search, pagination, and sorting criteria for browsing posts.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor guest
   * @x-autobe-specification Implement a feed/list query over community_platform_posts with joins to author, community, and exactly one subtype table per post variant.
   *
   * Accept a request body containing feed scope, optional community identifier or community name filter, keyword search, pagination, sort mode, and top-sort time window. Resolve the caller's identity from the authentication context, then apply access rules: guest callers may only request public or community-scoped browsing, while members may request home-feed browsing limited to communities with an active subscription record in community_platform_community_subscriptions.
   *
   * Build the base query from posts that are not deleted and whose parent community is visible for browsing. Join community_platform_members for author display fields and community_platform_communities for community display fields. Join community_platform_comments only for counting visible comments, and join community_platform_votes only for score aggregation. For subtype previews, load the matching one-to-one subtype table by post kind: text body preview from community_platform_post_texts, link domain/title from community_platform_post_links, and image thumbnail/alt text from community_platform_post_images.
   *
   * Sorting rules: hot should favor recent posts with strong positive engagement; new should order by created_at descending; top should order by computed vote score descending and apply an optional time boundary; controversial should order by high vote volume with score near zero. Preserve a deterministic tie-breaker, ideally created_at plus id, so pagination remains stable. Use limit/offset or cursor pagination consistently with the platform's list contract, and return pagination metadata alongside the data array.
   *
   * Search should match titles and subtype-specific searchable preview fields where available. Community filtering should use the explicit community identifier when provided; if a text name search is required, use the unique community name from community_platform_communities. Validate all enum values and reject unsupported sort or feed options with a clear client error. Do not mutate post status, votes, comments, or subscriptions inside this operation.
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
   * Retrieve the full details for a single community post.
   *
   * This operation returns one post resource identified by `postId`, including the post title, author identity, community context, vote score, comment count, and the content needed for the post’s detailed view. The response is intended to support the single-post page described in the requirements, where users can inspect the complete post rather than a feed summary.
   *
   * The platform’s post model supports multiple content styles, so this endpoint must resolve the post’s concrete content payload according to its stored type. Text posts expose the full text content, link posts expose the destination URL, and image posts expose the uploaded image reference or display payload. The service should also include the public metadata needed to render the post consistently with feed behavior, such as author username, community name, and the time the post was created.
   *
   * Access to this operation follows the platform’s read boundaries for public content. Publicly available posts may be retrieved by guests, while authenticated members and admins may also use the endpoint in normal application flows. The implementation must reject requests for posts that are not available for viewing, including posts that have been removed or are otherwise hidden by platform rules or moderation state.
   *
   * This endpoint is complementary to the post feed operations and the comment operations. Clients typically use a feed endpoint to discover posts and then call this operation with the post identifier to load the complete detail view. Comment retrieval and nested reply rendering should be handled by the comment APIs rather than embedded here, so this operation remains focused on the single post resource.
   *
   * @param connection
   * @param postId The target post identifier.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor guest
   * @x-autobe-specification Load one row from community_platform_posts by postId and verify it exists and is viewable.
   * Resolve the post’s concrete subtype data from the appropriate companion table based on the post’s content kind: community_platform_post_texts for text posts, community_platform_post_links for link posts, and community_platform_post_images for image posts. Include the public post metadata needed by the detail page: title, author identity, community identity, creation time, and any vote/comment aggregates required by the response schema.
   *
   * The service should validate that the post belongs to a reachable community context and that the post is not in a state that makes it unavailable for normal viewing. If the post is missing or not accessible, return a not-found style response rather than exposing internal moderation details. Do not compute feed sorting here; this is a direct entity lookup.
   *
   * Use a read-only query path with joins or follow-up lookups as appropriate. Avoid loading comments or vote histories in full; only include the aggregated data required for the post detail response. Keep the implementation deterministic so the same postId always resolves to the same canonical post representation unless the post has been deleted or hidden by platform rules.
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
