import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformPost } from "../../../../../api/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostText } from "../../../../../api/structures/ICommunityPlatformPostText";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteCommunityPlatformMemberPostsPostIdTextsTextId } from "../../../../../providers/deleteCommunityPlatformMemberPostsPostIdTextsTextId";
import { postCommunityPlatformMemberPostsPostIdTexts } from "../../../../../providers/postCommunityPlatformMemberPostsPostIdTexts";
import { putCommunityPlatformMemberPostsPostIdTextsTextId } from "../../../../../providers/putCommunityPlatformMemberPostsPostIdTextsTextId";

@Controller("/communityPlatform/member/posts/:postId/texts")
export class CommunityplatformMemberPostsTextsController {
  /**
   * Create the full written body record for a text-based post under an existing post aggregate.
   *
   * This operation creates a record in the post text-content subtype that stores the full written body for a text-based post. In the database design, `community_platform_post_texts` is the one-to-one subtype record storing the full written body for a text-based post, while `community_platform_posts` stores the shared post identity, authorship, community placement, content-type classification, and lifecycle state. This separation exists so the parent post record does not need variant-specific nullable content columns. The endpoint therefore attaches text content to a specific parent post identified by `postId` rather than creating an independent top-level content resource.
   *
   * The operation is intended for authenticated members who are creating or completing their own text post content. The parent post must exist, must belong to the requesting member, and must remain in a state that allows content creation. Because the parent post record contains the `post_type` classification used to select the normalized subtype record, the service must ensure that the target post is a text post before inserting the subtype row. Guests must not be allowed to create this content, and attempts to create text content for a post owned by another member must be rejected.
   *
   * This endpoint supports the product requirement that a single post detail view includes the full content appropriate to the post type, while feed views may show only a preview excerpt for text posts. By storing the complete body in the text subtype, the platform can later present abbreviated excerpts in feed contexts and the full body in single-post detail contexts without overloading the parent post table. This operation should therefore be used before any client expects a text post to appear with full body content in its dedicated detail view.
   *
   * Validation must enforce the one-to-one nature of the subtype. The `community_platform_post_texts` schema defines a unique constraint on `community_platform_post_id`, so a post can have at most one text-content record. If the target post already has text content, the service must reject the request as a duplicate subtype creation attempt. The body must be treated as the full written body content of the text post variant and persisted with proper creation and update timestamps. Errors should be returned when the parent post does not exist, is not owned by the caller, is not classified as a text post, is unavailable for editing, or already has an associated text-content record.
   *
   * This operation is part of the post aggregate workflow and is related to later post-detail retrieval operations. A client would typically use post creation or post draft initialization first to obtain the parent `postId`, then call this endpoint to attach the text body for the text variant. Consumers that need to display the finished post in full should use the post detail retrieval API for the parent post rather than relying on this subtype creation endpoint alone.
   *
   * @param connection
   * @param postId Target post's ID
   * @param body Full written body content for the text post
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement this operation inside the post
     *   aggregate service as creation of the `community_platform_post_texts`
     *   one-to-one subtype.
   *
   * 1. Authenticate the caller as a member. Reject guest callers.
   * 2. Load the parent row from `community_platform_posts` by `id = postId`.
   * 3. If no parent post exists, return a not-found error.
   * 4. Verify the loaded parent post is owned by the authenticated member by comparing `community_platform_member_id` with the caller's member identifier. If not, return a forbidden error.
   * 5. Verify the parent post is eligible to receive text content. At minimum, confirm `post_type` equals the text variant used by the service conventions. Also reject if the post status or deletion state prevents content creation or editing.
   * 6. Check whether a row already exists in `community_platform_post_texts` for `community_platform_post_id = postId`. Because the schema has `@@unique([community_platform_post_id])`, duplicate creation must fail with a conflict error.
   * 7. Validate the request payload as the full written body for the text post variant. Persist `body`, generate the subtype `id`, and set `created_at` and `updated_at` to the current timestamp. `deleted_at` must remain null on creation.
   * 8. Insert the new subtype row within a transaction boundary if parent-post status checks and write operations need atomic consistency.
   * 9. Return the created text-content representation.
   *
   * Database interactions should primarily target `community_platform_posts` for parent validation and `community_platform_post_texts` for subtype existence check and insertion. The implementation should not create a second text-content row for the same post under any circumstance. If the platform later supports draft workflows or moderation constraints, those checks should be applied before insertion as additional parent-post eligibility rules.
   *
   * Error handling must distinguish at least these cases: parent post not found, caller not authorized to manage the target post, target post not configured as a text post, target post unavailable for content creation, and duplicate text-content record already exists. Logging should capture the parent post ID and member ID for traceability without exposing private internal details in the API response.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformPostText.ICreate,
  ): Promise<ICommunityPlatformPostText> {
    try {
      return await postCommunityPlatformMemberPostsPostIdTexts({
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
   * Update the written content attached to a specific text post.
   *
   * This operation updates the text-based content variant associated with an existing post record. In the underlying data model, `community_platform_posts` stores the top-level community post identity, including the post title, author member reference, community placement, content-type classification, and lifecycle state, while `community_platform_post_texts` stores the full written body for the text-post variant as a one-to-one subtype record. Because a Post is the platform’s top-level community content item and always has a required title, this operation is intended to maintain consistency between the parent post and its text content when a member edits a text post.
   *
   * Access to this operation is limited to authenticated members acting on posts they own. Guests are not allowed to participate in post editing, and this endpoint is not intended for community moderation removal workflows. The service must also ensure that the target post remains eligible for editing under its current business lifecycle state and that the specified text-content record belongs to the specified post.
   *
   * This endpoint is specifically for the text-post variant described in the requirements and schema comments. The parent `community_platform_posts.post_type` field classifies whether the post is text, link, or image content, and the `community_platform_post_texts.body` field stores the full written body content of the text post variant. If the target post is not a text post, or if the subtype linkage does not match the parent post, the update must be rejected. This preserves the rule that each post uses exactly one supported content form and that attached content must match the selected post type.
   *
   * Clients typically obtain the target identifiers from earlier feed or post-detail operations. After a successful update, the returned resource can be used to refresh the single-post view and any client state that depends on the post’s title or text content. Error handling should cover missing resources, ownership violations, type mismatches between post and subtype, and attempts to edit posts that are no longer available for normal member editing.
   *
   * @param connection
   * @param postId Target post ID
   * @param textId Target text-content record ID
   * @param body Updated title and text content for the post
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement this operation as an aggregate update
     *   over `community_platform_posts` and `community_platform_post_texts`
     *   within a single transaction.
   *
   * 1. Authenticate the caller as a member.
   * 2. Load the parent post by `postId` from `community_platform_posts` and the text subtype by `textId` from `community_platform_post_texts`.
   * 3. Verify that the text subtype exists, the post exists, and `community_platform_post_texts.community_platform_post_id` equals `community_platform_posts.id` for the provided identifiers.
   * 4. Verify that the caller is the author of the post by comparing the authenticated member identity with `community_platform_posts.community_platform_member_id`.
   * 5. Verify that the post is currently editable according to business status rules. Reject unavailable, removed, or otherwise non-editable posts.
   * 6. Verify that `community_platform_posts.post_type` indicates the text variant. Reject requests targeting link or image posts.
   * 7. Validate the request body so the post title remains present and the text content remains consistent with the text-post content form. Do not allow the request to change the post into another content type through this endpoint.
   * 8. Update the parent post fields that are editable for a text-post edit, including `title` and `updated_at`.
   * 9. Update the subtype record fields that are editable for text content, including `body` and `updated_at`.
   * 10. Return the refreshed detailed post representation.
   *
   * The implementation should not create a new subtype record because `community_platform_post_texts` is a one-to-one normalized content record and this endpoint updates an existing one. The service should fail if the subtype linkage is inconsistent or missing rather than silently repairing data. Concurrency-safe update behavior should rely on transactional integrity so the parent post and subtype timestamps remain synchronized from the client perspective.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":textId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("textId")
    textId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformPost.IUpdate,
  ): Promise<ICommunityPlatformPost> {
    try {
      return await putCommunityPlatformMemberPostsPostIdTextsTextId({
        member,
        postId,
        textId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently remove the text-content record that belongs to a specific post.
   *
   * This operation deletes a single `community_platform_post_texts` record, which the database schema defines as the one-to-one subtype record that stores the full written body for a text-based post. The resource is nested under `/posts/{postId}` because text content does not stand alone as an independent publishing object; it exists only as the normalized content variant of its parent record in `community_platform_posts`. The parent post retains shared business attributes such as author membership, container community, title, content classification through `post_type`, lifecycle `status`, and timestamps, while the text subtype carries the full written body and its own subtype lifecycle timestamps.
   *
   * Access to this operation should be restricted to authenticated actors permitted to remove the parent post content. Under the loaded post ownership rules, a member may delete only the member's own post under normal user behavior, and requests targeting another user's post must be rejected. The service implementation should therefore resolve the parent post first, confirm that the caller is authorized for deletion of that post, and only then remove the linked text subtype record. If the platform later routes moderator-driven content removal through the same service layer, the authorization gate must still enforce that such authority is limited to the relevant community context.
   *
   * The operation must verify the relationship between the two path parameters before performing deletion. The specified `textId` must identify an existing `community_platform_post_texts.id`, and that record must reference the specified `community_platform_post_id` matching `postId`. The implementation should also verify that the parent `community_platform_posts` row represents the text variant through its `post_type`, because only text-based posts are expected to own a `textContent` subtype record. If the parent post or text subtype does not exist, or if the subtype does not belong to the provided parent post, the request must fail rather than affect unrelated content.
   *
   * This operation is closely related to post-detail retrieval and post deletion workflows. A client would typically obtain the parent post and its content variant through a post detail API before issuing this deletion request. When account deletion or moderator content removal occurs through broader workflows, those higher-level operations should ensure that user-owned or moderated content is removed consistently, as required by the loaded business rules stating that deleted accounts cause their posts and comments to be deleted and that moderators may remove posts and comments within their own communities.
   *
   * Expected error handling includes rejecting unauthenticated callers, rejecting callers who do not own the targeted post under normal user rules, rejecting identifiers that do not resolve to an existing post-text pair, and rejecting attempts to manipulate a subtype that is inconsistent with the parent post's content classification. Successful execution should leave no active text-body content available for the targeted subtype record.
   *
   * @param connection
   * @param postId Target post identifier that owns the text content record.
   * @param textId Target text-content record identifier belonging to the specified post.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Resolve the parent record from
     *   `community_platform_posts` by `postId` and the child subtype record
     *   from `community_platform_post_texts` by `textId` within a single
     *   service flow.
   *
   * Validate that both records exist, that `community_platform_post_texts.community_platform_post_id` equals the provided `postId`, and that the parent post's `post_type` denotes the text content variant. Reject the request if the subtype does not belong to the parent or if the parent post is not a text-based post.
   *
   * Authorize the caller against the parent post, not only the child subtype row. Under normal member behavior, permit deletion only when the authenticated member matches `community_platform_posts.community_platform_member_id`. If authorization middleware or higher-level policy also supports moderator or owner deletion within the post's community, enforce that community-scoped moderation permission before continuing.
   *
   * Perform the deletion of the `community_platform_post_texts` record in a transaction-safe way. Because the subtype schema includes `deleted_at`, implementation may realize the removal according to the project's persistence strategy, but the externally visible business outcome must be that the targeted text content is no longer available for active use. Ensure that no unrelated post subtype records are affected.
   *
   * Return success with no response payload when the deletion completes. Surface not-found, authorization, and parent-child mismatch conditions as explicit errors. The service should not accept any request body and should treat the path identifiers as the complete command context.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":textId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("textId")
    textId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteCommunityPlatformMemberPostsPostIdTextsTextId({
        member,
        postId,
        textId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
