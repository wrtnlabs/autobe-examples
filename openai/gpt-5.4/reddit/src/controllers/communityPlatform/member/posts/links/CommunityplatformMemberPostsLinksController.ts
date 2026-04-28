import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformPost } from "../../../../../api/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostLink } from "../../../../../api/structures/ICommunityPlatformPostLink";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteCommunityPlatformMemberPostsPostIdLinksLinkId } from "../../../../../providers/deleteCommunityPlatformMemberPostsPostIdLinksLinkId";
import { postCommunityPlatformMemberPostsPostIdLinks } from "../../../../../providers/postCommunityPlatformMemberPostsPostIdLinks";
import { putCommunityPlatformMemberPostsPostIdLinksLinkId } from "../../../../../providers/putCommunityPlatformMemberPostsPostIdLinksLinkId";

@Controller("/communityPlatform/member/posts/:postId/links")
export class CommunityplatformMemberPostsLinksController {
  /**
   * Create the URL-based content record for a specific post.
   *
   * This operation creates the one-to-one link subtype associated with an existing record in community_platform_posts. The parent post table stores the shared identity, authorship, community placement, title, post_type classification, and lifecycle state of each post, while community_platform_post_links stores the canonical destination URL and the human-readable domain display used for feed and summary presentation of link-based posts. The operation is intended for the link-content variant described in the post creation requirements, where a member supplies a URL as the post's content and the platform associates that link content with the selected post.
   *
   * Only authenticated members should be allowed to call this operation, because post creation and attached content submission are member capabilities. The server must verify that the target post exists, that it belongs to the acting member when this endpoint is used as part of author-managed creation flow, and that the post is eligible to receive link content. Because the database schema defines a unique relationship from community_platform_post_links.community_platform_post_id to community_platform_posts.id, the platform must reject attempts to create more than one link subtype for the same post.
   *
   * This endpoint is tightly coupled to the normalized post-content design. The parent community_platform_posts record intentionally excludes variant-specific payload columns so that text, link, and image content can be stored in dedicated subtype tables. For link posts, the created record supplies the canonical target_url and the derived or validated domain_display shown in feeds, aligning with the requirement that feed views present recognizable source-domain information for URL-based posts. Consumers typically use this operation together with the parent post creation flow and then retrieve the completed post through the single-post view or feed operations.
   *
   * Validation must ensure that the submitted URL is acceptable for a link post and that the content form matches the post's selected type. If the target post is unavailable, belongs to another author in an author-only flow, is not classified as a link post, or already has a link subtype record, the request must fail with a clear business error. Successful creation makes the link content available for full post rendering and feed-level preview behavior based on the linked domain.
   *
   * @param connection
   * @param postId Target post's ID
   * @param body Link content information for the post
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement this operation as creation of a
     *   subsidiary record in community_platform_post_links for the parent
     *   community_platform_posts row identified by postId.
   *
   * 1. Authenticate the caller as a member.
   * 2. Load the parent post from community_platform_posts by id = :postId and deleted_at IS NULL. If not found, return a not-found business error.
   * 3. Validate that the parent post is intended to carry link content by checking post_type against the platform's link-post classification. If the post type is not the link variant, reject the request because the requirements allow exactly one supported content form per post.
   * 4. Validate author ownership for author-managed creation flow by ensuring community_platform_posts.community_platform_member_id matches the authenticated member id. If ownership rules are broader in orchestration, still restrict creation to the authorized actor set for post authoring.
   * 5. Check whether a community_platform_post_links row already exists for community_platform_post_id = :postId and is not deleted. Because the schema has @@unique([community_platform_post_id]), return a conflict error instead of attempting a duplicate insert.
   * 6. Validate the request payload URL format according to application URL policy. Derive or verify domain_display from the submitted target URL so feed consumers can show recognizable source-domain information.
   * 7. Insert a new community_platform_post_links row with a generated UUID id, community_platform_post_id = postId, target_url, domain_display, created_at, updated_at, and deleted_at = null.
   * 8. Return the created link subtype resource.
   *
   * Use a single transaction for the existence check and insert if race conditions are a concern. Map unique-constraint violations on community_platform_post_id to a deterministic conflict error. Do not modify the parent post's community assignment because requirements state edited content remains within the original community. Preserve separation of concerns by keeping link-specific data in community_platform_post_links and shared metadata in community_platform_posts.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformPostLink.ICreate,
  ): Promise<ICommunityPlatformPostLink> {
    try {
      return await postCommunityPlatformMemberPostsPostIdLinks({
        member,
        postId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the link-specific content of an existing post and return the refreshed post detail.
   *
   * This operation is used when a member edits a URL-based post whose shared identity is stored in `community_platform_posts` and whose variant-specific content is stored in `community_platform_post_links`. The parent post record contains the post title, content classification, lifecycle status, author member reference, and container community reference. The nested link record contains the canonical destination URL and the human-readable `domain_display` value that is shown in feeds and post summaries so users can recognize the linked source domain. Together, these tables represent a normalized post aggregate in which link-specific values are intentionally kept out of the main post table.
   *
   * Only an authenticated member who owns the target post should be allowed to use this operation. The service must verify that the `postId` path parameter identifies an existing post, that the `linkId` path parameter identifies an existing link subtype record, and that both identifiers refer to the same aggregate through `community_platform_post_links.community_platform_post_id`. The service must also verify that the post is a link post by checking `community_platform_posts.post_type`, because the requirements state that every post uses exactly one supported content form and that the attached content must match the selected post type. If a caller attempts to update link content for a text or image post, the request must be rejected.
   *
   * This operation supports the post editing requirement that attached content may be updated in accordance with the post type. For link posts, that means allowing the member to update the post title and the linked URL content while preserving the post's association to its author and community. The updated resource should remain available in the single post view and in applicable feeds. Feed consumers depend on link presentation data such as recognizable domain display, while paginated post feeds also depend on stable summary fields including title, author username, community name, vote score, comment count, and creation time context.
   *
   * Clients typically use this operation after retrieving the current post detail from the single post view and allowing the author to edit the title or linked destination. After a successful update, the returned post detail can be used to refresh the author-facing edit screen and any subsequent navigation back to the post view. Validation failures should cover missing resources, mismatched `postId` and `linkId`, unauthorized editing attempts, unsupported post type transitions, malformed or unacceptable URLs, and any state in which the post is no longer editable under platform moderation or lifecycle rules.
   *
   * @param connection
   * @param postId Target post's ID
   * @param linkId Target link content record's ID
   * @param body Updated post title and link content
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement this operation as an authenticated
     *   member-only update of a link-post aggregate.
   *
   * 1. Resolve the caller as a member identity.
   * 2. Load `community_platform_posts` by `postId`. If no row exists, return a not-found error.
   * 3. Load `community_platform_post_links` by `linkId`. If no row exists, return a not-found error.
   * 4. Verify `community_platform_post_links.community_platform_post_id === community_platform_posts.id`. If not, reject the request as an invalid nested resource reference.
   * 5. Verify the loaded post is owned by the authenticated member through `community_platform_posts.community_platform_member_id`. If the caller is not the author, reject as forbidden.
   * 6. Verify `community_platform_posts.post_type` identifies the link content variant. Reject if the post uses text or image content, because content updates must match the selected post type.
   * 7. Validate the request body using `ICommunityPlatformPost.IUpdate`. Apply only fields that are defined by that DTO and relevant to editing. Do not expect duplicated path identifiers in the body.
   * 8. If the DTO includes title changes, update `community_platform_posts.title` and `updated_at`.
   * 9. If the DTO includes link-content changes, update `community_platform_post_links.target_url`, recompute or validate the corresponding `domain_display`, and update `community_platform_post_links.updated_at`.
   * 10. Run the shared post-table update and subtype-table update in a single transaction so the aggregate remains consistent.
   * 11. Re-query the updated post aggregate and return a full `ICommunityPlatformPost` response suitable for single-post presentation.
   *
   * Business rules and edge handling:
   * - Preserve authorship and community placement; this operation must not reassign the post to another member or community.
   * - Do not allow changing the content variant through this endpoint. The aggregate must remain a link post.
   * - Reject body values whose content does not match the link post type.
   * - If the post is in a lifecycle or moderation state that prevents editing, reject according to platform rules.
   * - Ensure the returned representation reflects the persisted link URL and derived domain display used in feeds.
   * - Use optimistic update semantics based on current stored rows; if downstream implementation supports concurrency protection, apply it consistently to both tables.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":linkId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("linkId")
    linkId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformPost.IUpdate,
  ): Promise<ICommunityPlatformPost> {
    try {
      return await putCommunityPlatformMemberPostsPostIdLinksLinkId({
        member,
        postId,
        linkId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently remove the link-content subtype record attached to a specific post.
   *
   * This operation deletes a nested link resource under a post, targeting the URL-based subtype stored in the community_platform_post_links table. That table exists specifically to hold link-only data such as the canonical destination URL and the human-readable source domain display, while the parent community_platform_posts record keeps shared post attributes such as author membership, container community, title, content classification, and current lifecycle state. The endpoint therefore operates on the normalized link-content portion of a post rather than on the top-level post record itself.
   *
   * Access to this operation must be restricted to actors who are allowed to delete the underlying post in business terms. Under normal member rules, the author of the post may remove the post's content only when the post belongs to that member. Under moderation rules, a community moderator or the community owner may delete posts only within the moderator's own community. The implementation must therefore verify both identity and community scope before performing removal, and it must reject attempts by unrelated members to delete another user's post content.
   *
   * The path is intentionally nested because the link subtype is not a standalone top-level resource. The supplied postId must identify the parent post, and the supplied linkId must identify the link subtype record that belongs to that post. The service must confirm that the community_platform_post_links.community_platform_post_id value matches the specified community_platform_posts.id. If either record does not exist, or if the subtype record does not belong to the specified post, the request must fail rather than deleting an unrelated resource.
   *
   * This operation is closely related to post detail retrieval and post deletion flows. Clients typically obtain the post and its normalized content structure from post retrieval APIs before invoking deletion. If the product intends link removal to represent complete post deletion for link posts, the implementation should ensure downstream behavior remains consistent with the business rule that deleted posts are removed from active platform use and are not left available as orphaned content. Error handling should cover missing post records, missing link subtype records, parent-child mismatches, and authorization failures.
   *
   * @param connection
   * @param postId Target post identifier.
   * @param linkId Target link subtype identifier under the specified post.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement a service method that permanently
     *   removes a community_platform_post_links record identified by linkId
     *   under the parent community_platform_posts record identified by postId.
   *
   * 1. Load the parent post from community_platform_posts by id = postId. If no post exists, reject the request.
   * 2. Load the link subtype from community_platform_post_links by id = linkId. If no link subtype exists, reject the request.
   * 3. Validate parent-child integrity by checking community_platform_post_links.community_platform_post_id === community_platform_posts.id. If the relationship does not match, reject the request.
   * 4. Authorize the caller using post-level deletion rules:
   *    - allow when the authenticated member is the post author via community_platform_posts.community_platform_member_id;
   *    - allow when the authenticated actor has moderator or owner authority in the same community as community_platform_posts.community_platform_community_id, limited to that community;
   *    - otherwise reject the request.
   * 5. Execute the deletion in a transaction. Remove the community_platform_post_links row. If application rules require link subtype removal to imply complete deletion of the link post, then also update or remove the parent post consistently in the same transaction according to the platform's post deletion rule. Do not leave an invalid state where a post classified as link content still references missing mandatory subtype content unless such a state is intentionally supported elsewhere.
   * 6. Return success with no response body.
   *
   * Implementation should treat this as a hard delete operation at the API contract level. Log the actor and target identifiers for audit purposes if the surrounding service architecture supports operational logging. Handle concurrent deletion safely by failing cleanly when the target row is already absent at execution time.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":linkId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("linkId")
    linkId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteCommunityPlatformMemberPostsPostIdLinksLinkId({
        member,
        postId,
        linkId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
