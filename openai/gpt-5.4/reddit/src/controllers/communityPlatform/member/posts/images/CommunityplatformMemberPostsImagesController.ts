import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformPostImage } from "../../../../../api/structures/ICommunityPlatformPostImage";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteCommunityPlatformMemberPostsPostIdImagesImageId } from "../../../../../providers/deleteCommunityPlatformMemberPostsPostIdImagesImageId";
import { postCommunityPlatformMemberPostsPostIdImages } from "../../../../../providers/postCommunityPlatformMemberPostsPostIdImages";
import { putCommunityPlatformMemberPostsPostIdImagesImageId } from "../../../../../providers/putCommunityPlatformMemberPostsPostIdImagesImageId";

@Controller("/communityPlatform/member/posts/:postId/images")
export class CommunityplatformMemberPostsImagesController {
  /**
   * Create the stored image attachment for a specific post.
   *
   * This operation creates the image-content record associated with a parent post in `community_platform_posts`. The post table stores the shared identity, authorship, community placement, content-type classification, and lifecycle state of each post, while image-specific content is intentionally normalized into `community_platform_post_images` so the main post record does not carry variant-specific nullable columns. As a result, this endpoint is the consumer-facing entry point for establishing the current uploaded image that represents the full content of an image post.
   *
   * The underlying image record stores the permanent storage location in `storage_uri`, the original uploaded filename in `original_name`, the detected `mime_type`, the stored `byte_size`, and optional `width` and `height` dimensions when they can be determined by media processing. These fields directly support the requirement that uploaded post images remain associated with the related image post and can later be displayed in feed thumbnails and single-post views. The one-to-one unique constraint on `community_platform_post_id` means each post can have at most one current image attachment record.
   *
   * Only authenticated members should be allowed to call this operation, because the requirements define post creation and post content attachment as member actions. The target post must exist, must be of the `image`-style post classification represented by `post_type`, and must be in a lifecycle state that still allows content creation or replacement. If the acting member is not permitted to modify the target post, if the post is unavailable, or if the provided content does not match the image-post type, the request must be rejected.
   *
   * This operation is closely related to post creation and post update flows. A client may first create the parent post record and then call this endpoint to associate the stored image metadata, or use it during an author-managed edit flow when the image content is being established for the current version of an image post. After successful completion, subsequent post feed and single-post retrieval operations should present the stored post image in user-facing views according to the media availability requirements.
   *
   * Expected errors include a missing parent post, a post whose `post_type` does not allow image content, an attempt to create a second current image attachment where replacement is not allowed by service rules, invalid or incomplete stored media metadata, and authorization failures for non-members or non-owning users.
   *
   * @param connection
   * @param postId Target post identifier
   * @param body Stored image metadata for the target post
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement a service that creates the current image-content record for a post in `community_platform_post_images`.
   *
   * 1. Resolve the authenticated actor and require a member identity.
   * 2. Load the parent row from `community_platform_posts` by `id = :postId` and `deleted_at IS NULL`. If it does not exist, return a not-found error.
   * 3. Validate that the acting member is allowed to manage the target post according to post ownership and lifecycle rules. At minimum, confirm the member is the post author unless a broader moderation rule is explicitly introduced elsewhere.
   * 4. Validate the parent post content classification using `post_type`. Reject the request if the post is not an image-type post, because business rules require the content form to match the selected post type exactly.
   * 5. Validate the request payload fields for image metadata completeness. Require a non-empty storage URI, original filename, MIME type, and byte size. Preserve optional width and height when available.
   * 6. Check `community_platform_post_images` for an existing row with `community_platform_post_id = :postId` because the schema enforces `@@unique([community_platform_post_id])`.
   *    - If the business implementation for this endpoint is strict creation, reject when a row already exists with a conflict error.
   *    - If the surrounding service policy treats this endpoint as creating the current attachment during edit flows, perform an upsert-style replacement within a transaction while updating `updated_at`.
   * 7. Insert the new `community_platform_post_images` row with a generated UUID, the parent post id, request metadata fields, and current timestamps. If replacement behavior is used, ensure the previous current record is no longer returned as active according to the table lifecycle policy.
   * 8. Return the created image record as `ICommunityPlatformPostImage`.
   *
   * Use a transaction whenever the implementation may replace an existing record or otherwise modify more than one persistence step. Do not store raw binary in the API layer; the request should reference already stored media through `storage_uri`, matching the database model. Ensure the returned object reflects the persisted metadata that downstream post-detail and feed APIs need to display the image in user-facing views.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformPostImage.ICreate,
  ): Promise<ICommunityPlatformPostImage> {
    try {
      return await postCommunityPlatformMemberPostsPostIdImages({
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
   * Replace the currently stored image attachment for a specific post image resource.
   *
   * This operation is used when a member edits an existing image-based post and uploads a new image so that the newly uploaded file becomes the current media shown for that post. In the domain model, the main post record in `community_platform_posts` stores the shared post identity, authorship, community placement, title, content-type classification, and lifecycle state, while the image-specific file information is normalized into `community_platform_post_images`. That subsidiary table exists specifically so the main post record does not carry variant-specific nullable content columns, and each post image record represents the current uploaded image attached to exactly one post.
   *
   * Access to this operation must be restricted to an authenticated member who owns the parent post. The platform requirements allow a member to edit their own post, and the media update must follow the same ownership boundary. The target post must still exist, the targeted image record must belong to that post, and the post must be an image post according to the `post_type` classification. If the identifiers do not match the persisted relationship, if the post is unavailable, or if the caller is not permitted to edit the post, the update must be rejected.
   *
   * The replacement must update the stored post media used in user-facing views. The requirements for stored media availability specify that uploaded post images remain associated with the related image post and are displayed when users view an image post in feed and single post contexts. After a successful update, subsequent feed previews and post detail views should use the new stored image asset represented by the updated `community_platform_post_images` record, including its storage location and file metadata.
   *
   * This endpoint works together with post detail and feed retrieval operations rather than replacing them. Clients typically use a post retrieval operation to obtain the target post and its current image context before invoking this update. After completion, clients should re-read the post or image resource if they need refreshed presentation data for feed thumbnails or detailed post views. No CDN-specific or storage-capacity behavior is defined here because those concerns are explicitly out of scope in the approved requirements.
   *
   * @param connection
   * @param postId Target post's ID
   * @param imageId Target image attachment's ID
   * @param body Replacement image data for the post image attachment
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement this operation as an authenticated member-only update of the one-to-one image attachment under a post.
   *
   * 1. Resolve the caller as a member session and reject unauthenticated or guest access.
   * 2. Load the target `community_platform_posts` row by `postId` where `deleted_at` is null. If not found, reject as unavailable.
   * 3. Verify the caller owns the post by comparing `community_platform_member_id` to the authenticated member ID. Reject when the caller is not the author allowed to edit the post.
   * 4. Verify the post is an image-based post by checking `post_type`. If the post is not the image variant, reject because attached content must match the selected post type.
   * 5. Load the target `community_platform_post_images` row by `imageId` where `deleted_at` is null. If not found, reject.
   * 6. Verify the loaded image row belongs to the parent post by comparing `community_platform_post_id` with `postId`. Reject mismatched nested-resource access.
   * 7. Validate the request payload for replacement image data. Accept only image-compatible content and metadata required by the concrete DTO schema. Do not accept text-post or link-post content in this operation.
   * 8. Replace the current stored image metadata on the existing `community_platform_post_images` row. Update fields such as `storage_uri`, `original_name`, `mime_type`, `byte_size`, `width`, `height`, and `updated_at` according to the validated payload and media-processing result. Preserve `id`, `community_platform_post_id`, and `created_at`.
   * 9. Optionally update `community_platform_posts.updated_at` in the same transaction so post-level recency reflects the edit.
   * 10. Return the updated post image resource as `ICommunityPlatformPostImage`.
   *
   * Use a single transaction for relationship verification and update so ownership, post type, and parent-child consistency are enforced atomically. Error handling must clearly distinguish missing post, missing image, mismatched image-to-post relationship, unsupported post type, invalid media payload, and forbidden ownership access.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":imageId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("imageId")
    imageId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformPostImage.IUpdate,
  ): Promise<ICommunityPlatformPostImage> {
    try {
      return await putCommunityPlatformMemberPostsPostIdImagesImageId({
        member,
        postId,
        imageId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Remove the stored image attachment associated with a specific post image record and return the resulting post state.
   *
   * This operation targets the subsidiary media record stored in `community_platform_post_images`, which exists to keep image-specific file information separate from the top-level `community_platform_posts` record. The parent post remains the platform’s top-level community content item, carrying shared identity, authorship, community placement, content-type classification, and lifecycle state, while the image row stores the uploaded asset location, original filename, MIME type, byte size, and optional pixel dimensions. Deleting this nested resource removes the current image attachment from the targeted post rather than removing the entire post itself.
   *
   * Access to this operation is restricted to actors with authority over the post content. The post author may use it while managing the author’s own post, consistent with the rule that a member may edit a post the member created. In addition, community moderators and the community owner may use it when acting within their own community moderation scope, because moderation requirements allow those roles to remove community content belonging to any user inside that community. The implementation must therefore verify both ownership or moderator authority and community scope before performing the deletion.
   *
   * This operation is closely tied to the media availability rule for image posts. The platform stores uploaded post images so they remain associated with the related image post in feeds and the single-post view, and it must remove access to that media in user-facing views when the related content is deleted. When this endpoint succeeds, clients should treat the previous image asset as no longer available for display through normal post rendering. If the client needs the full current post before deciding whether to remove its image, a post detail retrieval operation should be executed first so the user can confirm the targeted post and attachment.
   *
   * Validation must ensure that the `postId` identifies an existing post and that the `imageId` identifies an existing post-image record belonging to that same post. The server must reject mismatched identifiers, missing records, and attempts to manipulate content outside the caller’s authority. If the parent post has already been deleted or is otherwise unavailable for active editing or moderation, the operation should fail rather than silently succeeding. On success, the response returns the updated post representation so clients can refresh feed or detail state without the removed image attachment.
   *
   * @param connection
   * @param postId Target post's ID
   * @param imageId Target image attachment's ID
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Look up the parent row in `community_platform_posts` by `postId` and the subsidiary row in `community_platform_post_images` by `imageId`. Validate that both records exist, that `community_platform_post_images.community_platform_post_id` equals `community_platform_posts.id`, and that neither record is already deleted for the purpose of this operation. If the identifiers do not correspond to the same logical resource chain, return a not-found or forbidden error according to service conventions.
   *
   * Authorize the caller using post ownership and community moderation scope. Permit the operation when the authenticated member is the post author referenced by `community_platform_posts.community_platform_member_id`. Also permit it when the authenticated member holds owner or moderator authority for the post’s `community_platform_community_id` and that authority is still active at completion time. Reject guests. Reject members who are neither the author nor an authorized moderator or owner in the target community.
   *
   * Execute the deletion within a transaction. Mark the `community_platform_post_images` row as deleted by setting `deleted_at`, or remove it according to the project’s persistence policy for subsidiary media records if the service layer uses hard removal internally; in either case, the operation must ensure the attachment is no longer available in user-facing post views after completion. Update `updated_at` for the image record if the record is retained, and update `community_platform_posts.updated_at` so downstream readers can detect that the post changed. If storage cleanup is supported, enqueue or perform removal of the underlying file referenced by `storage_uri` after the database mutation succeeds.
   *
   * After mutation, load and return the current post DTO as `ICommunityPlatformPost`. The response should represent the post without an active linked image attachment. Do not delete the parent post, do not change the post’s community, and do not invent type conversion logic unless separately defined elsewhere. Handle edge cases including missing post, missing image, image already removed, parent-child mismatch, deleted parent post, and insufficient authority with explicit service errors.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":imageId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("imageId")
    imageId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteCommunityPlatformMemberPostsPostIdImagesImageId({
        member,
        postId,
        imageId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
