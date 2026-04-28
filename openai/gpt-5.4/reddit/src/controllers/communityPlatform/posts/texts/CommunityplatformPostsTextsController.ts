import { TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformPostText } from "../../../../api/structures/ICommunityPlatformPostText";
import { getCommunityPlatformPostsPostIdTextsTextId } from "../../../../providers/getCommunityPlatformPostsPostIdTextsTextId";

@Controller("/communityPlatform/posts/:postId/texts/:textId")
export class CommunityplatformPostsTextsController {
  /**
   * Retrieve the full text-content record associated with a specific community post.
   *
   * This operation returns the normalized written-body subtype stored in the community_platform_post_texts table for a post that uses the text content variant. The parent community_platform_posts record stores shared post information such as the title shown in feeds and detail views, the author member reference, the container community reference, the post_type classification, and the lifecycle status, while the text subtype stores the full written body content itself. The endpoint is therefore intended for scenarios where a caller already knows the target post and needs the complete text payload that belongs to that post.
   *
   * The route is intentionally nested under /posts/{postId} because the text-content record is not an independent top-level business object. According to the schema, each community_platform_post_texts record belongs to exactly one parent post through community_platform_post_id and that relationship is unique, which means a text record must be resolved in the context of its parent post. Implementations must confirm that the supplied textId exists, that it belongs to the supplied postId, and that the parent post is actually a text post before returning the result.
   *
   * From a business perspective, this endpoint supports the single-post detail experience described in the requirements, where users viewing one post must be able to see the full content appropriate to the post type. For text posts, that full content is the body field stored in community_platform_post_texts rather than a shortened feed excerpt. Feed-oriented previews such as the first 200 characters belong to feed list operations, while this endpoint is for retrieving the complete stored written content.
   *
   * This operation may be used together with the main post detail endpoint. The parent post detail operation is responsible for the broader presentation of the post title, author, community, vote score, comment count, and posted time, including derived values such as vote score from post votes and comment count from associated comments. This subtype endpoint complements that flow by providing the normalized full text body for text-based posts when the client or service layer resolves variant-specific content separately.
   *
   * Access to post viewing is available to users who can view the related post, including public viewers for publicly available post contexts. However, the endpoint must reject requests when the parent post does not exist, when the text record does not exist, when the text record does not belong to the supplied post, when the parent post is unavailable, or when lifecycle rules such as deletion or moderation status make the content non-returnable. Empty or missing resources are not treated as successful responses for this detail endpoint.
   *
   * @param connection
   * @param postId Target post identifier
   * @param textId Target text-content identifier belonging to the specified post
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Resolve the parent record from
     *   community_platform_posts by id = postId and the subtype record from
     *   community_platform_post_texts by id = textId within the same read flow.
   *
   * Validate that the community_platform_post_texts.community_platform_post_id value matches the requested postId. If the subtype record exists but belongs to another post, reject the request as not found to avoid cross-post subtype exposure.
   *
   * Validate that the parent post exists and is eligible for viewing. Use the parent post's post_type field to confirm the post is a text variant before returning the subtype content. If post_type is not the text variant, reject the request because a non-text post must not expose a text subtype representation.
   *
   * Apply lifecycle checks on both records. Do not return records that should be treated as unavailable because the parent post is deleted, moderated out of view, or otherwise not viewable under the service's post availability rules. Also reject if the subtype record itself is deleted.
   *
   * Return the text subtype DTO populated from the community_platform_post_texts row, including its identity, the parent post linkage, the full body, and lifecycle timestamps as defined by the response schema.
   *
   * The handler should execute as a read-only operation without transactionally mutating any tables. If the service needs to support consumer screens that also show the full post context, this endpoint can be composed after or alongside the main post detail operation, but it should remain responsible only for the normalized text-content subtype retrieval.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get()
  public async at(
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("textId")
    textId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformPostText> {
    try {
      return await getCommunityPlatformPostsPostIdTextsTextId({
        postId,
        textId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
