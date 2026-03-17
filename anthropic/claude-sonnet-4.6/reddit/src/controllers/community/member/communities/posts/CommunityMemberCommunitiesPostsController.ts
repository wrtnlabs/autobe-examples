import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPost } from "../../../../../api/structures/ICommunityPost";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { postCommunityMemberCommunitiesCommunityIdPosts } from "../../../../../providers/postCommunityMemberCommunitiesCommunityIdPosts";

@Controller("/community/member/communities/:communityId/posts")
export class CommunityMemberCommunitiesPostsController {
  /**
   * Create a new post within a specific community.
   *
   * This operation allows an authenticated member to submit a new post into the community identified by `communityId`. Each post is permanently associated with the target community and attributed to the authenticated author. A post consists of a required title and a type-specific payload determined by the `type` discriminator field — one of `text`, `link`, or `image`. The type-specific content is stored in the corresponding child table: `community_post_texts` for text posts, `community_post_links` for link posts, and `community_post_images` for image posts, all maintaining a strict 1:1 relationship with the parent `community_posts` record.
   *
   * Only authenticated members who hold an active subscription to the target community are permitted to create posts. If the requesting member does not have an active subscription (i.e., no record in `community_subscriptions` with a null `deleted_at` matching this member and community), the request will be denied. This subscription gate enforces the platform's principle that posting privileges require community membership.
   *
   * In addition to the subscription requirement, members who are currently banned from the target community are not permitted to create posts, even if they hold an active subscription. A ban restricts the banned member from posting or commenting in the community while still allowing them to view its content. If an active ban record exists in `community_bans` for this member and community, the request will be denied with a 403 response.
   *
   * The post's creation timestamp (`created_at`) is recorded at submission time and is used for feed sorting (New order) and for computing relative display times such as "3 hours ago". The `updated_at` field is set to the same value at creation and updated upon any subsequent edit. The `deleted_at` field is null upon creation, indicating the post is active and visible.
   *
   * Upon successful creation, the new post becomes immediately visible in the community feed and in the author's profile post list. The post's net vote score and comment count are not stored in the `community_posts` table but computed at query time from `community_post_votes` and `community_comments` respectively.
   *
   * To discover communities prior to posting, use `PATCH /communities` to list and search communities, and `GET /communities/{communityId}` to view community details. To subscribe to a community before posting, use `POST /communities/{communityId}/subscriptions`.
   *
   * @param connection
   * @param communityId The UUID of the target community in which the post will be created.
   * @param body Creation payload for a new post, including the required title, post type discriminator, and type-specific content (text body, link URL, or image URL).
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Authenticate the requesting actor — must be a member (not a guest). Return 401 if unauthenticated.
   *
   * 2. Validate that the community identified by `communityId` exists in `community_communities` and has a null `deleted_at`. Return 404 if not found or deleted.
   *
   * 3. Verify the authenticated member has an active subscription: query `community_subscriptions` WHERE `community_member_id` = member.id AND `community_community_id` = communityId AND `deleted_at` IS NULL. Return 403 if no active subscription exists.
   *
   * 4. Validate the request body:
   *    - `title` must be non-empty string.
   *    - `type` must be one of 'text', 'link', 'image'.
   *    - For type='text': `body` (string) must be present and non-empty.
   *    - For type='link': `url` must be a valid URI; extract and store the `domain` from the URL.
   *    - For type='image': `image_url` and `thumbnail_url` must both be valid URIs.
   *
   * 5. Within a single database transaction:
   *    a. Insert a new record into `community_posts` with a generated UUID, `community_member_id` = member.id, `community_community_id` = communityId, the provided `title`, the `type` discriminator, `created_at` = now(), `updated_at` = now(), `deleted_at` = null.
   *    b. Based on `type`, insert the corresponding payload record:
   *       - type='text': insert into `community_post_texts` with the new post's id and `body`.
   *       - type='link': insert into `community_post_links` with the new post's id, `url`, and extracted `domain`.
   *       - type='image': insert into `community_post_images` with the new post's id, `image_url`, and `thumbnail_url`.
   *
   * 6. Return the fully composed post response: the `community_posts` record joined with its type-specific payload child record, the author's public info (from `community_members`), and the community's basic info (from `community_communities`). Include computed fields: vote_score = 0 (no votes yet), comment_count = 0.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPost.ICreate,
  ): Promise<ICommunityPost> {
    try {
      return await postCommunityMemberCommunitiesCommunityIdPosts({
        member,
        communityId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
