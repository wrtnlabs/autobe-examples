import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformPostImage } from "../../../../../api/structures/ICommunityPlatformPostImage";
import { AdminAuth } from "../../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../../decorators/payload/AdminPayload";
import { deleteCommunityPlatformAdminPostsPostIdImagesImageId } from "../../../../../providers/deleteCommunityPlatformAdminPostsPostIdImagesImageId";
import { getCommunityPlatformAdminPostsPostIdImagesImageId } from "../../../../../providers/getCommunityPlatformAdminPostsPostIdImagesImageId";
import { patchCommunityPlatformAdminPostsPostIdImages } from "../../../../../providers/patchCommunityPlatformAdminPostsPostIdImages";
import { postCommunityPlatformAdminPostsPostIdImages } from "../../../../../providers/postCommunityPlatformAdminPostsPostIdImages";
import { putCommunityPlatformAdminPostsPostIdImagesImageId } from "../../../../../providers/putCommunityPlatformAdminPostsPostIdImagesImageId";

@Controller("/communityPlatform/admin/posts/:postId/images")
export class CommunityplatformAdminPostsImagesController {
  /**
   * Creates a new image attachment for an existing post.
   *
   * This endpoint is specifically for posts whose content includes an image; it persists a new row in the image attachment storage (community_platform_post_images) that belongs to the target post via community_platform_post_id. The attachment record includes the stored file URL (file_url), MIME content type (content_type), file size and original image dimensions, along with alt_text and sort_order used for feed rendering.
   *
   * Because the underlying post model (community_platform_posts) classifies posts into text, link, and image types, the server must ensure the target post exists and that the attachment is created in a way consistent with the post’s type. If the post does not exist or is not accessible in normal viewing contexts, the request must be rejected.
   *
   * Security and permissions: only authorized actors should be allowed to upload attachments for the target post. Authorization must be checked before persisting the attachment record. In addition, the operation must validate that the provided image data is complete for the attachment schema requirements.
   *
   * Validation rules and business logic: the operation must write the provided image URL to file_url, set content_type, file_size_bytes, image_width_px, image_height_px, alt_text, and sort_order, and set timestamps (created_at/updated_at) as appropriate for the create flow. If an attachment is provided as an image post edit, the system must maintain image attachment requirements for that post type; missing image data must lead to request rejection.
   *
   * Related behavior: once created, the attachment becomes available for post list and single-post views according to the platform’s post type rendering rules for image posts (thumbnail in list displays, full image in single-post views).
   *
   * Errors: return a 4xx error when postId is invalid/non-existent, when the actor is not authorized, or when the request payload lacks required image metadata for insertion. Return a 5xx error only for unexpected persistence failures.
   *
   * @param connection
   * @param postId Target post identifier to which the image attachment will be linked.
   * @param body Image attachment creation payload for the target post, including the image URI and required rendering metadata.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implement POST /posts/{postId}/images to create an attachment row in community_platform_post_images.
   *
   * Algorithm (service layer):
   * 1. Validate postId parameter is a UUID format.
   * 2. Fetch community_platform_posts by id = postId (and ensure it is not deleted/hidden according to the platform’s normal query rules for viewing).
   * 3. Enforce authorization: allow only actors permitted to add attachments for the target post.
   * 4. Validate request payload contains an uploaded image reference (stored as file_url) and all required metadata fields needed by community_platform_post_images: content_type, file_size_bytes, image_width_px, image_height_px, alt_text, sort_order.
   * 5. Determine sort_order behavior:
   *    - If client provides sort_order, use it.
   *    - Otherwise (if DTO allows optional), compute next sort_order for this post by querying max(sort_order) for community_platform_post_id and adding 1.
   * 6. Insert a new community_platform_post_images row with:
   *    - community_platform_post_id = postId
   *    - file_url = provided image URI
   *    - content_type, file_size_bytes, image_width_px, image_height_px = provided values
   *    - alt_text = provided alt text
   *    - sort_order = computed/provided sort_order
   *    - created_at/updated_at = now
   *    - deleted_at = null
   * 7. Return the created attachment DTO.
   *
   * Database operations:
   * - SELECT post by id from community_platform_posts.
   * - INSERT into community_platform_post_images.
   * - If sort_order needs auto-assignment, run SELECT MAX(sort_order) for that community_platform_post_id.
   *
   * Edge cases:
   * - If the post exists but is not consistent with image post expectations, reject.
   * - If sort_order violates the composite uniqueness constraint @@unique([community_platform_post_id, sort_order]), reject with a clear conflict error.
   * - If any required image metadata is missing/invalid, reject with validation error.
   *
   * Transactions:
   * - Use a transaction around the select+insert sequence when auto-assigning sort_order to prevent races that cause unique constraint violations.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformPostImage.ICreate,
  ): Promise<ICommunityPlatformPostImage> {
    try {
      return await postCommunityPlatformAdminPostsPostIdImages({
        admin,
        postId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the image attachments associated with a specific post.
   *
   * This endpoint is scoped to a single post via the {postId} path parameter. The post’s core record is stored in community_platform_posts (title/body/type and attribution), while the attachment set is stored in community_platform_post_images, which contains one row per uploaded image file for a given post (community_platform_post_images.community_platform_post_id).
   *
   * The request is expected to modify the post’s attachment set by:
   * 1) adding new image rows (creating new community_platform_post_images records),
   * 2) updating existing image rows belonging to the same post (for example sort_order and alt_text used for rendering), and
   * 3) removing images from the client-visible attachment set.
   *
   * Because community_platform_post_images includes deleted_at (a nullable timestamp) and the model comment states attachments are “soft-deletable via deleted_at for audit-friendly removal”, removal is implemented by setting community_platform_post_images.deleted_at instead of physically deleting rows. This ensures later administrative/audit contexts can still reference historical attachments while normal rendering and list/detail queries exclude rows where deleted_at is set.
   *
   * Permissions: The operation must validate that the caller is allowed to modify the target post’s attachments, and that the images being updated/removed (by image identifiers provided in the request) belong to the target postId (community_platform_post_images.community_platform_post_id). If any image identifier in the request does not belong to the post, the operation must reject the request.
   *
   * Validation and edge cases:
   * - For any image being added or updated, validate required rendering metadata (file_url, content_type, file_size_bytes, image_width_px, image_height_px, alt_text) against the expected data types.
   * - Validate that sort_order values are consistent for the final ordered set (e.g., no duplicates if your DTO enforces it) and apply deterministic ordering based on sort_order.
   * - Ensure that updates are performed atomically: either the full attachment set change is applied, or the request fails without partial updates.
   *
   * Related behavior in the system:
   * - Post-type display rules require correct image preview behavior for image posts in feeds and full image rendering for single post views. Since image attachments are sourced from community_platform_post_images, returning the updated attachment summaries helps the client reflect the new thumbnails immediately.
   * - When a post is edited, image posts require an uploaded image to be present after the edit; therefore, if the platform enforces that the post_type indicates an image post, the service layer must ensure the resulting attachment set is not empty after this operation.
   *
   * After this update succeeds, subsequent views of the post should reflect the new images/ordering and exclude attachments whose deleted_at has been set.
   *
   * @param connection
   * @param postId Target post identifier whose image attachments will be updated.
   * @param body Attachment update request describing which images to add, update, reorder, and remove for the target post.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implement service-layer logic for updating community_platform_post_images rows for a single community_platform_posts record.
   *
   * Algorithm:
   * 1) Parse {postId} and verify the target post exists in community_platform_posts (by community_platform_posts.id) and is eligible for modification (permission checks + any post-type constraints such as requiring at least one image when post_type is an image post).
   * 2) Begin a database transaction.
   * 3) Load all currently active attachments for the post: community_platform_post_images where community_platform_post_id = postId AND deleted_at is null.
   * 4) Validate request items:
   *    - Any referenced existing image id must be present in the loaded set.
   *    - Any image id that belongs to a different post must cause the request to be rejected.
   * 5) Apply changes:
   *    a) Add: for request items marked as new, insert community_platform_post_images rows with:
   *       - community_platform_post_id = postId
   *       - file_url, content_type, file_size_bytes, image_width_px, image_height_px, alt_text, sort_order
   *       - deleted_at = null
   *       - created_at/updated_at managed by DB or service
   *    b) Update: for request items marked as existing, update only allowed mutable columns (file_url/content_type/size/dimensions/sort_order/alt_text as defined by DTO), and set updated_at.
   *    c) Remove: for images to be removed, set deleted_at = now() for the corresponding community_platform_post_images rows.
   * 6) After mutation, enforce attachment invariants:
   *    - If community_platform_posts.post_type indicates an image post, ensure at least one active attachment remains (deleted_at is null). If not, rollback and return a validation error.
   * 7) Commit transaction.
   * 8) Query and return the post’s active attachments in deterministic order by sort_order, mapping to ICommunityPlatformPostImages.ISummary.
   *
   * Error handling:
   * - If post does not exist: return not-found.
   * - If caller is not authorized: return forbidden/unauthorized as appropriate.
   * - If any image id is invalid for this post: return bad-request.
   * - If any validation fails (missing fields for added images, empty final attachment set for image posts): return bad-request.
   *
   * Database operations:
   * - Use a single transaction covering inserts/updates and deleted_at updates.
   * - Ensure indexes support the reads by community_platform_post_id and sort_order ordering (even if ordering is done in application layer after fetching, the query should filter deleted_at null).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async updateImages(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformPostImage.IRequest,
  ): Promise<ICommunityPlatformPostImage.ISummary> {
    try {
      return await patchCommunityPlatformAdminPostsPostIdImages({
        admin,
        postId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single image attachment for a given post.
   *
   * This operation is intended for post single-view media rendering. It looks up the image attachment row in `community_platform_post_images` by matching the provided `{imageId}` (row primary key `community_platform_post_images.id`) and verifying it belongs to the `{postId}` (row foreign key `community_platform_post_images.community_platform_post_id` referencing `community_platform_posts.id`).
   *
   * Authorization-wise, this operation is a read action. The system should allow it within the public/feed viewing boundaries consistent with the overall actor model: guests can browse public content, while members/admins can view content they are allowed to view according to moderation and deletion rules defined elsewhere.
   *
   * Validation rules:
   * - `{postId}` must be a valid identifier for `community_platform_posts.id`.
   * - `{imageId}` must be a valid identifier for `community_platform_post_images.id`.
   * - The operation must reject (404/Not Found) when the image attachment does not exist or does not belong to the specified post. This prevents leaking attachment rows across posts.
   *
   * Data handling:
   * - Because `community_platform_post_images` includes `deleted_at` as a deletion marker, the implementation should only return active attachments for normal user viewing contexts, and treat rows with `deleted_at` set as not retrievable for this endpoint unless administrative/audit viewing is explicitly supported by other endpoint designs.
   *
   * Related fields and display meaning:
   * - The response includes media rendering data such as `file_url`, `content_type`, `file_size_bytes`, `image_width_px`, `image_height_px`, `alt_text`, and `sort_order`, which are required to render the thumbnail/full attachment in UI components.
   *
   * Related API operations you may combine:
   * - A post detail endpoint (e.g., `GET /posts/{postId}`) to obtain the post metadata and its `post_type`, and then call this endpoint to fetch the specific attachment to display.
   *
   * @param connection
   * @param postId The target post identifier whose image attachments are being queried.
   * @param imageId The target image attachment identifier within the specified post.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification 1) Parse path parameters: postId, imageId.
   * 2) Query `community_platform_post_images` with a condition:
   *    - id == imageId
   *    - community_platform_post_id == postId
   * 3) Apply retrieval filter for end-user viewing:
   *    - Exclude rows where deleted_at is not null.
   *    (Administrative/audit contexts, if supported elsewhere, should be implemented via separate authorization or separate endpoints.)
   * 4) If no row matches, return 404/Not Found.
   * 5) Map the row fields to `ICommunityPlatformPostImage` response DTO:
   *    - id, communityPlatformPostId (from community_platform_post_id), fileUrl, contentType, fileSizeBytes, imageWidthPx, imageHeightPx, altText, sortOrder, createdAt, updatedAt, deletedAt (include only if DTO supports it; otherwise omit via DTO mapping logic).
   * 6) Do not mutate data; no transactions are required.
   *
   * Edge cases:
   * - If postId exists but the attachment does not belong to it, treat as not found.
   * - If imageId exists but belongs to another post, treat as not found (prevents cross-post attachment access).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":imageId")
  public async at(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("imageId")
    imageId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformPostImage> {
    try {
      return await getCommunityPlatformAdminPostsPostIdImagesImageId({
        admin,
        postId,
        imageId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Updates the metadata/content of a single image attachment that belongs to a specific post.
   *
   * This operation targets the `community_platform_post_images` table, which stores one row per uploaded image file for `community_platform_posts`. The row is linked to its parent post via `community_platform_post_id`, and the attachment has fields such as `file_url`, `content_type`, `file_size_bytes`, `image_width_px`, `image_height_px`, `alt_text`, and `sort_order`.
   *
   * Only authorized actors should be able to modify an attachment for a post they can edit. The business rules for editing posts require that users can edit their own posts and that attempts to edit content they do not own must be denied; the attachment update must follow the same ownership/moderation eligibility as the parent post edit.
   *
   * Validation rules:
   *
   * - The `imageId` must refer to an existing `community_platform_post_images` record.
   * - The `community_platform_post_id` of that record must match the provided `{postId}`; otherwise, the update must be denied as an invalid scope.
   * - If the update includes new image file metadata, the service must keep the file-related fields consistent (e.g., `file_url`, `content_type`, and dimensions) and persist `updated_at`.
   *
   * After a successful update, subsequent views of the post that render image-type content in list/detail contexts should use the updated attachment metadata (especially `alt_text` and ordering).
   *
   * Related operations include updating the parent post core content and editing/removing attachments via other endpoints; this endpoint only updates a single attachment row and does not alter the post’s `post_type` classification.
   *
   * @param connection
   * @param postId Target post ID that scopes which attachment is being updated.
   * @param imageId Target attachment image ID to update within the post.
   * @param body Update payload for the post image attachment metadata/content.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implementation steps:
   *
   * 1. Extract `postId` and `imageId` from path.
   * 2. Authorization:
   *    - Load the parent post by `community_platform_posts.id = postId`.
   *    - Determine whether the current actor can edit the parent post (same eligibility as post edit).
   *    - Deny if no permission.
   * 3. Load the attachment:
   *    - Query `community_platform_post_images` where `id = imageId` AND `community_platform_post_id = postId`.
   *    - If not found, return not-found.
   * 4. Apply updates transactionally:
   *    - Only update mutable columns provided by the request body: `file_url`, `content_type`, `file_size_bytes`, `image_width_px`, `image_height_px`, `alt_text`, `sort_order`.
   *    - Always set `updated_at = now()`.
   *    - Do not change `created_at`.
   *    - Do not modify `deleted_at` in this endpoint unless the update DTO explicitly includes a mechanism for removal; if not included, leave it as-is.
   * 5. Persist changes in a single DB transaction.
   * 6. Return the updated attachment as the response body DTO.
   *
   * Edge cases:
   * - Mismatched `{postId}` and attachment’s `community_platform_post_id` must be treated as not found/denied (do not disclose existence).
   * - If attachment is already marked deleted (`deleted_at` not null) and the system treats it as non-active for viewing, deny updates to preserve consistency unless business rules allow recovery via a separate operation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":imageId")
  public async updatePostImage(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("imageId")
    imageId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformPostImage.IUpdate,
  ): Promise<ICommunityPlatformPostImage> {
    try {
      return await putCommunityPlatformAdminPostsPostIdImagesImageId({
        admin,
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
   * Permanently removes a specific image attachment from a post.
   *
   * This endpoint targets the dependent image record stored in `community_platform_post_images`, identified by `id` (the image row) and scoped by `community_platform_post_id` (the post row). It ensures the image is removed from normal post rendering contexts (post detail and any list views that include attachment images) by deleting the corresponding database record.
   *
   * Security and permissions are enforced by actor ownership and moderation rules:
   * - A logged-in member may delete only images that belong to a post they authored (post ownership constraint).
   * - A moderator or community owner may delete images in their community even when they are not the post author.
   * If the requester does not have permission for the post/image combination, the system rejects the request and does not remove the attachment.
   *
   * Validation and consistency rules:
   * - The `imageId` must correspond to an image row whose `community_platform_post_id` equals the `postId` provided in the path.
   * - If the image row does not exist (or does not match the specified post), the system rejects the request.
   * - When the record is removed, the system must ensure that subsequent viewing attempts do not reference the deleted image URL/metadata (e.g., `file_url`, `content_type`, and sizing fields) as if it still exists.
   *
   * Related behavior expectations:
   * - After deletion, any post views should reflect the updated attachment set (the deleted image is absent).
   * - If the post itself has been removed from normal visibility by other operations, image deletion requests should still be scoped through the existing `postId`/`imageId` relationship and follow the same permission checks.
   *
   * This operation is used together with post image retrieval operations (not defined here) to render the remaining attachment set after a successful removal.
   *
   * @param connection
   * @param postId Target post ID that scopes the image attachment to be removed.
   * @param imageId Target image attachment ID to remove from the specified post.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification 1) Parse `postId` and `imageId` from the path.
   *
   * 2) Authorization:
   * - Resolve the target post (`community_platform_posts`) by `id = postId`.
   * - Determine actor identity and role (guest/member/admin) via auth middleware (not part of this operation).
   * - Allow deletion only if:
   *   a) actor is the post author (`community_platform_posts.author_id` matches actor member id), OR
   *   b) actor is a moderator of the post's community (`community_platform_community_moderators`), OR
   *   c) actor is the community owner of that community.
   * - Otherwise, reject with an authorization error.
   *
   * 3) Relationship check:
   * - Query `community_platform_post_images` for a row with `id = imageId` AND `community_platform_post_id = postId`.
   * - If not found, reject with not-found / invalid-target behavior.
   *
   * 4) Deletion:
   * - Permanently remove the row via repository delete.
   * - Do not rely on presentation-layer filtering; the image row must be absent from subsequent queries.
   *
   * 5) Transaction/consistency:
   * - Wrap the delete in a transaction. The operation is single-row, so transaction scope is minimal.
   *
   * 6) Side effects:
   * - No additional writes are required for votes/comments; those are stored in separate tables.
   * - Ensure cache invalidation strategy (if any) invalidates post detail and post image lists that depend on `community_platform_post_images`.
   *
   * 7) Response:
   * - Return success with no JSON body (null responseBody) after the deletion commits.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":imageId")
  public async erasePostImage(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("imageId")
    imageId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteCommunityPlatformAdminPostsPostIdImagesImageId({
        admin,
        postId,
        imageId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
