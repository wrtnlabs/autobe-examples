import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformCommentFile } from "../../../../../../api/structures/ICommunityPlatformCommentFile";
import { IPageICommunityPlatformCommentFile } from "../../../../../../api/structures/IPageICommunityPlatformCommentFile";
import { MemberAuth } from "../../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../../decorators/payload/MemberPayload";
import { deleteCommunityPlatformMemberPostsPostIdCommentsCommentIdFilesFileId } from "../../../../../../providers/deleteCommunityPlatformMemberPostsPostIdCommentsCommentIdFilesFileId";
import { getCommunityPlatformMemberPostsPostIdCommentsCommentIdFilesFileId } from "../../../../../../providers/getCommunityPlatformMemberPostsPostIdCommentsCommentIdFilesFileId";
import { patchCommunityPlatformMemberPostsPostIdCommentsCommentIdFiles } from "../../../../../../providers/patchCommunityPlatformMemberPostsPostIdCommentsCommentIdFiles";
import { postCommunityPlatformMemberPostsPostIdCommentsCommentIdFiles } from "../../../../../../providers/postCommunityPlatformMemberPostsPostIdCommentsCommentIdFiles";
import { putCommunityPlatformMemberPostsPostIdCommentsCommentIdFilesFileId } from "../../../../../../providers/putCommunityPlatformMemberPostsPostIdCommentsCommentIdFilesFileId";

@Controller("/communityPlatform/member/posts/:postId/comments/:commentId/files")
export class CommunityplatformMemberPostsCommentsFilesController {
  /**
   * Create a new file attachment for a specific comment within a post discussion.
   *
   * This operation registers one uploaded asset as a child record of the target comment identified by `commentId` under the post identified by `postId`. The underlying `community_platform_comment_files` table is defined as stored file metadata for attachments added to discussion comments, and each record represents one uploaded asset attached to a single `community_platform_comments` row. The operation therefore creates normalized attachment metadata, including the original filename supplied at upload time, the detected or accepted media type, the stable external object-storage key or path used to retrieve the uploaded binary, and the file size in bytes used for validation and policy enforcement. It does not duplicate comment body text, post content, or author profile data.
   *
   * Access to this operation is limited to authenticated members with permission to modify the target comment context. Guests are not allowed to participate in commenting workflows, so they must be rejected. The service must also enforce community participation boundaries derived from the parent post and comment context. At minimum, the implementation must confirm that the target comment belongs to the specified post and that the caller is allowed to attach a file to that comment, such as the comment author during normal participation or a community owner or moderator when acting inside the moderation authority of the related community.
   *
   * This operation is closely related to post discussion behavior. Comments are displayed as part of the single post view, including author, content, score, posting time, and nested reply structure. Because attachments belong to comments rather than directly to posts, clients typically obtain or display this attachment information together with the parent comment in the post detail experience. Before calling this operation, the client should already know the target post and comment identifiers from the post discussion context.
   *
   * Validation must be strict because comment attachments are subordinate records. The service must reject requests when the post does not exist, the comment does not exist, the comment is not attached to the specified post, the comment is no longer available for normal participation, or the supplied file metadata violates platform file policies. The service must also prevent creation against comments that have been removed from active discussion visibility, including cases where comments were deleted through moderation workflows or removed after account deletion. On success, the API returns the created attachment metadata resource so the client can immediately reflect the new file within the comment thread UI.
   *
   * @param connection
   * @param postId Target post's ID that contains the comment discussion
   * @param commentId Target comment's ID within the specified post
   * @param body Metadata for the file to attach to the target comment
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement a service-layer create workflow for
     *   `community_platform_comment_files` under the scoped parent route
     *   `/posts/{postId}/comments/{commentId}/files`.
   *
   * 1. Authenticate the caller as a member-scoped actor and reject unauthenticated guest requests.
   * 2. Load the target post from `community_platform_posts` by `id = postId`. If not found, return a not-found error.
   * 3. Load the target comment from `community_platform_comments` by `id = commentId`. If not found, return a not-found error.
   * 4. Verify relational consistency: `community_platform_comments.community_platform_post_id` must equal `postId`. If not, return a not-found or scope-mismatch error so attachments cannot be created on a comment through the wrong post path.
   * 5. Validate comment lifecycle eligibility using actual schema fields. Reject creation if the comment has `deleted_at` set or if its `status` indicates a removed or otherwise non-participation state according to service business rules.
   * 6. Determine authorization from the parent resource context. Allow the comment author during ordinary participation by matching the caller to `community_platform_comments.community_platform_member_id`. Also allow community moderation actors only when they hold valid authority for the community reached through `community_platform_posts.community_platform_community_id`. Reject all other callers.
   * 7. Validate the request body fields required for `ICommunityPlatformCommentFile.ICreate`, including original filename, MIME type, storage locator, and size. Enforce file policy checks such as supported type, non-empty storage locator, positive file size, and any configured maximum size or content restrictions.
   * 8. Enforce uniqueness on `storage_key` before insert because the schema declares `@@unique([storage_key])`. Return a conflict error when the supplied key is already in use.
   * 9. Insert a new `community_platform_comment_files` record with a generated UUID, `community_platform_comment_id = commentId`, normalized metadata fields from the request body, `created_at`, `updated_at`, and `deleted_at = null`.
   * 10. Return the created attachment resource shaped as `ICommunityPlatformCommentFile`.
   *
   * Use a transaction for the final validation-and-insert sequence if concurrent requests could otherwise create inconsistent results, especially around uniqueness and authorization checks. Do not accept multipart upload payloads in this API. The request is JSON only; actual binary upload should already have been handled by a separate storage flow or represented by a storage URI/key in the request body. Preserve auditability by keeping attachment metadata separate from the comment body, consistent with the schema normalization between `community_platform_comments` and `community_platform_comment_files`.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("commentId")
    commentId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformCommentFile.ICreate,
  ): Promise<ICommunityPlatformCommentFile> {
    try {
      return await postCommunityPlatformMemberPostsPostIdCommentsCommentIdFiles(
        {
          member,
          postId,
          commentId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of file attachments that belong to a specific comment within a specific post discussion.
   *
   * This operation is used to browse attachment metadata stored in the community_platform_comment_files table for one parent record in community_platform_comments. The attachment records contain normalized file metadata such as the original filename supplied at upload time, the detected or accepted media type used for validation and delivery behavior, the stable external storage key or path used for retrieval, and the file size in bytes. Because comments are threaded discussion entries attached to a post, the endpoint requires both the post identifier and the comment identifier so the request is constrained to the correct discussion context.
   *
   * The endpoint follows the discussion hierarchy defined by the platform requirements: a post is the root content item, comments belong to a post, and replies remain attached to their proper branch. This operation does not alter thread state. It only returns the attachment records linked to the specified comment after confirming that the comment belongs to the specified post. If the post or comment is unavailable, or if the comment does not belong to the provided post, the request must be rejected rather than returning unrelated file data.
   *
   * From a security and visibility perspective, this operation is intended for actors who are allowed to view the underlying post discussion, including guests and members in public viewing contexts. The operation should therefore inherit the same access boundary as comment viewing rather than introducing a separate attachment-specific permission model. The response should omit attachment rows that have been marked deleted through the deleted_at lifecycle field, because community_platform_comment_files supports deletion handling for moderation, retention, and comment lifecycle management.
   *
   * This operation is commonly used together with the post detail and comment thread retrieval flow. A client typically loads the target post discussion first, identifies a comment in the thread, and then calls this endpoint to obtain the list of attachment metadata associated with that comment. When a comment has no attachments, the endpoint should return an empty paginated data set instead of treating the absence of files as an error.
   *
   * @param connection
   * @param postId Target post ID that owns the discussion thread containing the comment
   * @param commentId Target comment ID within the specified post whose attached files are being listed
   * @param body Pagination, filtering, and sorting criteria for comment file attachments
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement this operation as a comment-scoped
     *   attachment listing query.
   *
   * 1. Validate that a post exists for postId and is viewable in the current context.
   * 2. Validate that a comment exists for commentId, that its community_platform_post_id matches postId, and that the comment is available for viewing under normal discussion rules.
   * 3. Query community_platform_comment_files where community_platform_comment_id = commentId and deleted_at IS NULL.
   * 4. Apply request-body driven browsing behavior using the generated ICommunityPlatformCommentFile.IRequest DTO, including pagination and supported sorting. Sorting should at minimum support createdAt-derived ordering from created_at and may support originalName, mimeType, and size when those fields are exposed by the DTO contract.
   * 5. Return results as a paginated collection mapped to IPageICommunityPlatformCommentFile.ISummary.
   *
   * Implementation should not trust commentId alone; always join or pre-validate against community_platform_comments so attachments cannot be listed for a comment outside the specified post. Prefer a query plan that first verifies the comment row with id = commentId and community_platform_post_id = postId, then queries attachment rows by community_platform_comment_id. If the comment or post is not found, return the standard not-found error. If the comment exists but is not associated with the supplied post, also treat the request as not found to avoid leaking cross-post relationships.
   *
   * Map summary items from real table columns only: id, original_name, mime_type, storage_key, size, created_at, and updated_at. Do not expose deleted_at in normal list responses unless the DTO schema explicitly includes it for internal use. No transaction is required beyond consistent reads, but the service should produce deterministic pagination and stable sorting. When no attachment rows exist, return an empty page structure with valid pagination metadata.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("commentId")
    commentId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformCommentFile.IRequest,
  ): Promise<IPageICommunityPlatformCommentFile.ISummary> {
    try {
      return await patchCommunityPlatformMemberPostsPostIdCommentsCommentIdFiles(
        {
          member,
          postId,
          commentId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single file attachment record associated with a specific comment in a specific post discussion.
   *
   * This operation returns the normalized attachment metadata stored in the comment file record for a discussion entry. In the underlying data model, `community_platform_comment_files` stores uploaded asset metadata separately from `community_platform_comments`, including the original filename supplied at upload time, the detected or accepted media type, the stable external object-storage key or path used to retrieve the uploaded binary, and the file size in bytes used for validation and transfer metadata. The attachment is not an independent discussion object; it exists only as a child of a comment, and the comment itself exists only within a post conversation.
   *
   * Access to this operation should follow the same visibility boundary as post discussion viewing. Guests, members, and admins may use this endpoint when the parent post and parent comment are available for viewing, because public browsing includes posts, comments, and profile-linked public activity context. The service must therefore evaluate attachment visibility through the parent records rather than by the file row alone. If the target post is unavailable, the target comment has been removed from normal participation views, or the file record has been deleted from active retrieval, the operation must not expose the attachment as an active file resource.
   *
   * The endpoint is tightly coupled to the content hierarchy described by the platform requirements. A post is the root content item of a community discussion, comments belong to posts and may appear in nested reply structures, and comment files are attachment records normalized into their own table for auditability and storage management. Because of that hierarchy, the implementation must validate that `{commentId}` belongs to `{postId}` and that `{fileId}` belongs to `{commentId}` before returning data. This prevents a caller from using a valid file identifier with an unrelated comment or post path.
   *
   * This operation is commonly used together with comment-thread retrieval endpoints. A client would typically load a post discussion first to obtain the comments shown in the thread, then use the file metadata returned with comment data or this detail endpoint to inspect a particular attachment more closely. The endpoint is intended for metadata retrieval and consumer display scenarios, such as showing the attachment name, content type, size, creation time, and a resolved access URI derived from the stored object location.
   *
   * When the parent post has no comments, comment-list operations return an empty list rather than an error; however, this detail operation targets one concrete attachment and therefore should fail when the specified hierarchy does not exist. Likewise, when comments are removed because the author account was deleted, those comments stop appearing in discussion threads and profile listings, so attachments under those removed comments must no longer be returned as active comment file resources through this endpoint.
   *
   * @param connection
   * @param postId Target post identifier that scopes the comment discussion
   * @param commentId Target comment identifier within the specified post
   * @param fileId Target file attachment identifier within the specified comment
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement a read-only service method that fetches
     *   one comment attachment by the nested identifiers `postId`, `commentId`,
     *   and `fileId`.
   *
   * First, validate the path parameter formats as UUID values. Query `community_platform_posts` by `id = postId` and confirm the post is viewable according to business visibility rules. Then query `community_platform_comments` by `id = commentId` and `community_platform_post_id = postId` so the comment is guaranteed to belong to the specified post. Exclude comments that are not available for normal viewing, including rows whose lifecycle state indicates removal or moderation-based hiding, and rows whose `deleted_at` is not null, unless broader internal visibility rules explicitly permit administrators to inspect them.
   *
   * Next, query `community_platform_comment_files` by `id = fileId` and `community_platform_comment_id = commentId`. Treat the attachment as active only when `deleted_at` is null. If no matching row exists at any stage of the hierarchy validation, return a not-found error without revealing whether the missing element was the post, comment, or file. This avoids leaking cross-resource existence information.
   *
   * Map the database record to `ICommunityPlatformCommentFile`. Include file metadata derived directly from the schema-backed columns, such as identifier, original filename, MIME type, storage locator representation, file size, and timestamps. If the response contract exposes a downloadable or previewable URI, derive it from `storage_key` through the storage integration layer rather than exposing internal storage implementation details directly. Do not return raw binary content from this operation.
   *
   * The implementation does not require a transaction because it is a single read path, but it should use consistent filtering on parent and child lifecycle state. Add authorization guards that allow guest, member, and admin access when the parent content is publicly viewable. Log access failures and malformed identifier inputs through standard API monitoring. Handle edge cases including mismatched nested identifiers, deleted attachment records, deleted comments, deleted posts, and comments removed after account deletion so the endpoint never returns orphaned or inactive file resources.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":fileId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("commentId")
    commentId: string & tags.Format<"uuid">,
    @TypedParam("fileId")
    fileId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformCommentFile> {
    try {
      return await getCommunityPlatformMemberPostsPostIdCommentsCommentIdFilesFileId(
        {
          member,
          postId,
          commentId,
          fileId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a specific file attachment that belongs to a comment within a post discussion.
   *
   * This operation manages a single record from the community_platform_comment_files table, which stores uploaded asset metadata for attachments added to discussion comments. The attachment is addressed through its full discussion hierarchy so that the API can confirm the target file belongs to the specified community_platform_comments record and that the comment itself belongs to the specified community_platform_posts record. This preserves the threaded discussion context defined for comments and prevents cross-comment or cross-post attachment updates.
   *
   * The operation is intended for authenticated users who have authority to manage the target comment attachment. In standard participation flows, that authority normally belongs to the member who authored the comment. In moderation flows, the implementation may also allow community moderators or owners acting within their own community to manage content-related records when enforcing community rules. Guests must not be allowed to update comment attachments because comment participation itself is restricted to members.
   *
   * The underlying attachment record contains file metadata such as the original filename, detected or accepted media type, stable external storage key, file size, and audit timestamps. Because the table description states that files are managed through their parent comment, clients should treat this endpoint as subordinate to comment management rather than as an independent top-level file service. The implementation must preserve referential integrity with the parent comment and post while applying any allowed metadata changes.
   *
   * This operation is commonly used together with post-detail and comment-thread retrieval flows. A client typically loads the target post discussion first, identifies the relevant comment and its attached files, and then submits an update for the selected attachment. After a successful update, subsequent post detail or comment thread retrieval should reflect the changed attachment metadata wherever that comment is rendered.
   *
   * If the specified post, comment, or file does not exist, or if the three identifiers do not describe the same hierarchy, the request must fail rather than updating an unrelated record. The operation should also reject updates when the parent comment is unavailable for normal participation views, when the caller lacks authority, or when the new file metadata violates validation or storage policy rules. Successful completion returns the updated attachment resource in JSON form.
   *
   * @param connection
   * @param postId Target post's ID
   * @param commentId Target comment's ID within the post
   * @param fileId Target attached file's ID within the comment
   * @param body Updated metadata for the comment attachment
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement this operation as a hierarchical update
     *   on community_platform_comment_files.
   *
   * 1. Authenticate the caller as a member or an authorized moderator/owner acting within the related community.
   * 2. Load the target comment file by fileId and join its parent community_platform_comments row and parent community_platform_posts row.
   * 3. Verify hierarchy consistency: the loaded file must reference community_platform_comment_id = commentId, and the loaded comment must reference community_platform_post_id = postId. If any element is missing or mismatched, return a not-found style failure for the nested resource.
   * 4. Enforce authorization. Allow the comment author to update the attachment during normal ownership flows. If moderation permissions are supported for this endpoint, verify the caller has moderator or owner authority in the community that contains the post before allowing the update.
   * 5. Validate the request body against attachment management policies. Only permit updates to fields represented in ICommunityPlatformCommentFile.IUpdate. Re-validate original filename, MIME type, storage locator, and size constraints according to storage and content policies. If storage_key is mutable, preserve its uniqueness because the schema declares @@unique([storage_key]).
   * 6. Reject updates when the parent comment or parent post is not available for modification, including removed or otherwise unavailable discussion content according to business rules and lifecycle status checks.
   * 7. Persist the updated file metadata and refresh updated_at within a transaction if the implementation also touches external storage bookkeeping.
   * 8. Return the updated attachment as ICommunityPlatformCommentFile.
   *
   * Error handling expectations:
   * - Return authorization failure for guests or authenticated users without ownership or moderation authority.
   * - Return not found when postId, commentId, or fileId is missing, or when the nesting relationship is invalid.
   * - Return validation failure when the submitted metadata violates file policy, media type restrictions, size rules, or uniqueness constraints.
   * - If external object storage coordination is required, ensure database changes and storage updates are handled atomically where possible or compensated safely on failure.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":fileId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("commentId")
    commentId: string & tags.Format<"uuid">,
    @TypedParam("fileId")
    fileId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformCommentFile.IUpdate,
  ): Promise<ICommunityPlatformCommentFile> {
    try {
      return await putCommunityPlatformMemberPostsPostIdCommentsCommentIdFilesFileId(
        {
          member,
          postId,
          commentId,
          fileId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently remove a specific file attachment from a comment within a post discussion thread.
   *
   * This operation deletes one record from the comment attachment domain represented by the community_platform_comment_files table, which stores uploaded asset metadata such as the original filename, media type, storage locator, and file size for a single parent comment. The endpoint is intentionally nested under both the post and comment resources so that clients and implementers must treat the file as subordinate discussion content rather than as a standalone top-level asset. The file must belong to the specified comment, and the comment must belong to the specified post.
   *
   * Access to this operation is restricted to authorized authenticated actors. A member may remove attachments associated with the member's own discussion content, while community moderation authority may remove discussion content within the moderator's own community. This aligns the attachment lifecycle with the broader deletion rules for comments and posts, including moderation-driven removal inside the relevant community scope. Guests are not permitted to invoke this operation because they do not have participation or governance privileges.
   *
   * The underlying data model separates attachment metadata from the main comment record. The community_platform_comments table stores the canonical threaded discussion entry, including its post linkage, author linkage, body text, parent reply relationship, lifecycle status, and timestamps. The community_platform_comment_files table then normalizes one or more attached files under that comment through community_platform_comment_id. Because the parent comment itself belongs to community_platform_posts through community_platform_post_id, the endpoint must validate the full hierarchy before deleting the file. This prevents cross-resource deletion attempts where a valid fileId is supplied under the wrong comment or post.
   *
   * On success, the system removes the targeted attachment record and should also remove or invalidate the corresponding externally stored binary referenced by storage_key according to infrastructure policy. If the targeted post, comment, or file does not exist, or if the hierarchy does not match, the operation must fail without removing anything. The same failure behavior applies when the caller lacks ownership or moderation authority in the relevant community. This operation is often used together with post-detail or comment-thread retrieval endpoints so that clients can refresh the discussion view after attachment removal.
   *
   * @param connection
   * @param postId Target post's ID that scopes the parent discussion context.
   * @param commentId Target comment's ID within the specified post.
   * @param fileId Target attached file's ID within the specified comment.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement this operation as a single-resource
     *   deletion for community_platform_comment_files with strict parent-chain
     *   validation.
   *
   * 1. Authenticate the caller and resolve whether the caller is an owning member of the parent comment or a moderator/owner with authority in the community that contains the parent post.
   * 2. Load the target file from community_platform_comment_files by id = fileId and join or separately load its parent comment from community_platform_comments using community_platform_comment_id.
   * 3. Validate that the loaded comment.id equals commentId and that comment.community_platform_post_id equals postId. If any record is missing or the hierarchy does not match, reject the request as not found.
   * 4. Resolve the parent post from community_platform_posts by id = postId as needed to determine the containing community for authorization checks.
   * 5. Authorization logic:
   *    - Allow when the authenticated member is the author of the parent comment via community_platform_comments.community_platform_member_id.
   *    - Also allow when the authenticated actor has community moderation authority for the parent post's community according to community moderator or owner assignments within that same community.
   *    - Reject all guest callers and authenticated actors without matching ownership or moderation scope.
   * 6. Delete the targeted community_platform_comment_files row. Because the schema includes deleted_at but the endpoint represents permanent removal, do not leave the attachment active after the operation. If the implementation architecture uses a staged storage cleanup process, ensure the database record is no longer retrievable from normal APIs after successful completion.
   * 7. Trigger deletion or invalidation of the external object referenced by storage_key. Handle storage cleanup failure carefully: prefer transactional consistency patterns or compensating cleanup so that the API does not report success while leaving the attachment accessible through active application paths.
   * 8. Return success with no response body.
   *
   * Edge cases and validation:
   * - If postId, commentId, or fileId is syntactically valid but no matching hierarchy exists, return not found.
   * - If the comment or post has already been removed and the file is no longer available through the hierarchy, return not found rather than deleting by detached ID alone.
   * - If the caller is authenticated but tries to remove another member's attachment outside moderation authority, return forbidden.
   * - Ensure idempotent observable behavior for repeated deletion attempts by returning not found once the file no longer exists in the active data set.
   * - Audit logging should record actor identity, file id, parent comment id, parent post id, and whether deletion occurred through ownership or moderation authority.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":fileId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("commentId")
    commentId: string & tags.Format<"uuid">,
    @TypedParam("fileId")
    fileId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteCommunityPlatformMemberPostsPostIdCommentsCommentIdFilesFileId(
        {
          member,
          postId,
          commentId,
          fileId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
