import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformPostImage } from "../../../../../api/structures/ICommunityPlatformPostImage";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteCommunityPlatformMemberPostsPostIdImagesFileId } from "../../../../../providers/deleteCommunityPlatformMemberPostsPostIdImagesFileId";
import { postCommunityPlatformMemberPostsPostIdImages } from "../../../../../providers/postCommunityPlatformMemberPostsPostIdImages";

@Controller("/communityPlatform/member/posts/:postId/images")
export class CommunityplatformMemberPostsImagesController {
  /**
   * Attach an uploaded image file to an existing image-type post, adding it to the post's gallery.
   *
   * This operation allows post authors to add images to their posts after the initial post creation or to build multi-image galleries. The image must be uploaded first through the file upload endpoint, which returns a URL that is then used in this request.
   *
   * **Prerequisites and Validation**:
   *
   * The target post must be of content type 'image'. Posts with 'text' or 'link' content types cannot have images attached. The authenticated member must be the author of the post. Each image file can only be attached to a single post, preventing duplicate usage.
   *
   * **File Requirements**:
   *
   * Images must be in JPEG, PNG, GIF, or WebP format with a maximum file size of 20MB. The system validates the actual MIME type against the declared type to prevent format spoofing. Image dimensions should be between 1-8192 pixels for both width and height.
   *
   * **Storage Quota**:
   *
   * Each member has a maximum storage quota of 500MB for all image posts combined. If attaching this image would exceed the quota, the request is rejected with an appropriate error message. Members can view their current storage usage in their profile settings.
   *
   * **Gallery Order**:
   *
   * Images are displayed in ascending order based on the order field. If no order is specified, the image is appended to the end of the gallery. The order can be specified to insert images at specific positions in the gallery sequence.
   *
   * **CDN Delivery**:
   *
   * All post images are served through the Content Delivery Network (CDN) with a maximum latency of 200 milliseconds. Images are cached at edge locations for at least 24 hours and are publicly accessible for content viewing.
   *
   * @param connection
   * @param postId Unique identifier of the post to attach the image to. The post must exist, be of content type 'image', and be authored by the authenticated member.
   * @param body Image attachment information including the uploaded file URL and optional gallery order position
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation Steps:
   *
   * 1. **Authentication & Authorization**:
   *    - Validate member authentication via JWT session
   *    - Query post by postId from path parameter
   *    - Return 404 if post not found
   *    - Return 403 if authenticated user is not the post author
   *    - Validate post.content_type equals 'image' (return 400 if mismatch)
   *
   * 2. **File Validation**:
   *    - Parse fileUrl from request body to extract file identifier
   *    - Query community_platform_files table to find the file record
   *    - Return 404 if file not found
   *    - Validate file.file_type equals 'post_image'
   *    - Validate file is owned by the authenticated member (file.member_id matches)
   *    - Validate file is not already attached to this post (check community_platform_post_images)
   *    - Validate file MIME type is one of: image/jpeg, image/png, image/gif, image/webp
   *    - Validate file.file_size <= 20MB (20,971,520 bytes)
   *
   * 3. **Storage Quota Check**:
   *    - Calculate user's total image post storage: SUM(file_size) of all post_image files owned by member
   *    - Return 403 with storage limit exceeded message if quota (500MB) would be exceeded
   *
   * 4. **Order Assignment**:
   *    - If order provided in request, validate no conflict with existing images
   *    - If order not provided, auto-assign: SELECT MAX(order) + 1 FROM community_platform_post_images WHERE community_platform_post_id = postId
   *    - If no existing images, start with order = 0
   *
   * 5. **Database Transaction**:
   *    - Create record in community_platform_post_images with:
   *      - community_platform_post_id = postId
   *      - community_platform_file_id = file.id
   *      - order = determined order value
   *      - created_at = current timestamp
   *    - Update community_platform_files set post_id = postId if not already set
   *
   * 6. **Response Construction**:
   *    - Return created image record with file metadata
   *    - Include image URL, dimensions, order, and timestamp
   *
   * 7. **Error Handling**:
   *    - 400: Invalid file type, not an image post, validation failures
   *    - 401: Not authenticated
   *    - 403: Not post author, storage quota exceeded
   *    - 404: Post or file not found
   *    - 409: Image already attached to this post
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async attachImage(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformPostImage.ICreate,
  ): Promise<ICommunityPlatformPostImage.ISummary> {
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
   * Removes a specific image from an image-type post's gallery.
   *
   * This operation allows post authors to delete individual images from their posts. Only the author of the post can remove images, ensuring content ownership is respected. When an image is removed, it is immediately disassociated from the post and the underlying file is marked for deletion.
   *
   * The deleted image will no longer appear in the post's gallery, and the storage space will be freed within 24 hours according to the platform's file retention policy. If the image is the last one in the gallery, the post will display with an empty gallery but remain accessible.
   *
   * Authorization requires the authenticated member to be the author of the post. Attempts to delete images from posts owned by other members will be rejected with a 403 Forbidden response. Guests cannot perform this operation.
   *
   * @param connection
   * @param postId Unique identifier of the post containing the image to remove. The authenticated user must be the author of this post.
   * @param fileId Unique identifier of the image file to remove from the post's gallery. Must correspond to an image currently associated with the specified post.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Remove an image from a post's gallery by deleting the junction record in community_platform_post_images table.
   *
   * Implementation steps:
   * 1. Validate postId and fileId path parameters as valid UUIDs
   * 2. Query community_platform_posts to verify the post exists and is not deleted (deleted_at IS NULL)
   * 3. Query community_platform_post_images to verify the image association exists for this specific post
   * 4. Verify authorization: authenticated member ID must match community_platform_posts.author_id
   * 5. Begin transaction:
   *    a. Delete the community_platform_post_images record
   *    b. Soft-delete the associated community_platform_files record (set deleted_at to current timestamp)
   *    c. Optionally: Reorder remaining images to maintain sequential order values
   * 6. Commit transaction
   * 7. File cleanup job will permanently remove the file within 24 hours per retention policy
   *
   * Error conditions:
   * - 404 Not Found: Post does not exist or has been deleted
   * - 404 Not Found: Image association does not exist for this post
   * - 403 Forbidden: Authenticated user is not the post author
   * - 401 Unauthorized: User is not authenticated (guest access)
   *
   * Edge cases:
   * - If this is the last image in an image-type post, the post remains valid but with empty gallery
   * - File deletion is asynchronous - the image URL may remain accessible briefly after API response
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":fileId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("fileId")
    fileId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteCommunityPlatformMemberPostsPostIdImagesFileId({
        member,
        postId,
        fileId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
