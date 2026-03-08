import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IDiscussionBoardArticleAttachment } from "../../../../../api/structures/IDiscussionBoardArticleAttachment";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteDiscussionBoardMemberArticlesArticleIdAttachmentsAttachmentId } from "../../../../../providers/deleteDiscussionBoardMemberArticlesArticleIdAttachmentsAttachmentId";
import { postDiscussionBoardMemberArticlesArticleIdAttachments } from "../../../../../providers/postDiscussionBoardMemberArticlesArticleIdAttachments";

@Controller("/discussionBoard/member/articles/:articleId/attachments")
export class DiscussionboardMemberArticlesAttachmentsController {
  /**
   * Create a new file or image attachment for a discussion board article.
   *
   * This operation allows authenticated members to upload attachments to articles they have authored, and administrators to upload attachments to any article. Attachments provide supplementary materials and visual content that enhance the article's argument or provide evidence for claims made in the content.
   *
   * The system supports two attachment types: 'file' for document attachments (PDF, DOC, DOCX, XLS, XLSX, TXT, CSV with maximum 20MB per file) and 'image' for image attachments (JPEG, PNG, GIF, WEBP with maximum 10MB per image). Each article can have a maximum of 10 attachments with a combined total size limit of 50MB.
   *
   * Security validation includes checking file content signatures (magic bytes) against declared formats to prevent malicious file uploads. The original filename is preserved for user reference while being sanitized for security. The system records the upload timestamp and generates a unique storage path for each attachment.
   *
   * For the request body, provide the attachment type, original filename, file extension, file size in bytes, and a URI reference to the uploaded file content. The URI typically points to a temporary storage location from a prior upload operation.
   *
   * This operation cannot be performed outside of article creation or editing contexts. The attachment is permanently associated with the specified article and will be cascade deleted when the parent article is removed.
   *
   * @param connection
   * @param articleId Unique identifier of the article to which the attachment will be added. The authenticated user must be the author of this article (or an administrator) to add attachments.
   * @param body Attachment creation data including type classification, original filename, extension, file size, and URI reference to the uploaded file content.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification ## Implementation Steps
   *
   * 1. **Authentication Check**: Verify the requesting user is authenticated (member or admin).
   *
   * 2. **Article Validation**:
   *    - Query `discussion_board_articles` table by `articleId`
   *    - Verify article exists and is not soft-deleted (`deleted_at IS NULL`)
   *    - If not found, return 404 NOT_FOUND
   *
   * 3. **Authorization Check**:
   *    - If user is member: verify `article.member_id` matches the authenticated user's member ID
   *    - If user is admin: allow access to any article
   *    - If unauthorized, return 403 FORBIDDEN
   *
   * 4. **Request Validation**:
   *    - Validate `type` is either 'file' or 'image'
   *    - Validate `extension` matches allowed formats:
   *      - File: pdf, doc, docx, xls, xlsx, txt, csv
   *      - Image: jpeg, jpg, png, gif, webp
   *    - Validate `size` against limits:
   *      - File: max 20,971,520 bytes (20MB)
   *      - Image: max 10,485,760 bytes (10MB)
   *    - Validate `name` length and sanitize for security (remove path traversal characters)
   *
   * 5. **Attachment Count Check**:
   *    - Count existing attachments for the article: `SELECT COUNT(*) FROM discussion_board_article_attachments WHERE discussion_board_article_id = ?`
   *    - If count >= 10, return 400 BAD_REQUEST with error message about attachment limit
   *
   * 6. **Total Size Check**:
   *    - Sum sizes of existing attachments plus new attachment size
   *    - If total > 52,428,800 bytes (50MB), return 400 BAD_REQUEST with error about total size limit
   *
   * 7. **File Content Validation** (if URI points to accessible storage):
   *    - Retrieve file content from the provided URI
   *    - Validate content signature (magic bytes) matches declared extension/format
   *    - If mismatch, return 400 BAD_REQUEST with security warning
   *
   * 8. **Storage Path Generation**:
   *    - Generate unique storage path/URI for the file
   *    - Move or copy file from temporary URI to permanent storage location
   *
   * 9. **Database Insert**:
   *    - Insert new record into `discussion_board_article_attachments`:
   *      - `id`: generate UUID
   *      - `discussion_board_article_id`: from path parameter
   *      - `type`: from request
   *      - `name`: sanitized original filename
   *      - `extension`: from request (lowercase)
   *      - `size`: from request
   *      - `path`: generated storage path
   *      - `created_at`: current timestamp
   *
   * 10. **Response**: Return the created attachment entity with 201 CREATED status.
   *
   * ## Error Handling
   *
   * - 401 UNAUTHORIZED: User not authenticated
   * - 403 FORBIDDEN: User does not own the article (and is not admin)
   * - 404 NOT_FOUND: Article does not exist or is deleted
   * - 400 BAD_REQUEST: Validation failures (format, size, count limits, content signature mismatch)
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("articleId")
    articleId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IDiscussionBoardArticleAttachment.ICreate,
  ): Promise<IDiscussionBoardArticleAttachment> {
    try {
      return await postDiscussionBoardMemberArticlesArticleIdAttachments({
        member,
        articleId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently deletes a specific attachment from an article.
   *
   * This operation allows article authors to remove attachments during article editing, or administrators to moderate inappropriate attachments. The attachment file is permanently deleted from storage along with its database record.
   *
   * The discussion_board_article_attachments table stores attachment metadata including the file path, original name, extension, size, and type (file or image). Each attachment belongs to exactly one article through the discussion_board_article_id foreign key, which references discussion_board_articles.id.
   *
   * Authorization is enforced: only the article author (discussion_board_articles.member_id) and administrators can delete attachments. Banned members cannot perform this operation. The system verifies that both the article exists and has not been deleted (deleted_at IS NULL), and that the specified attachment belongs to the article.
   *
   * Related operations:
   * - POST /articles/{articleId}/attachments: Upload new attachments to an article
   * - GET /articles/{articleId}/attachments: List all attachments for an article
   * - GET /articles/{articleId}/attachments/{attachmentId}: Download a specific attachment
   *
   * After deletion, the attachment can no longer be downloaded or referenced. The operation is irreversible.
   *
   * @param connection
   * @param articleId Unique identifier of the article that owns the attachment (UUID format). The article must exist and not be deleted.
   * @param attachmentId Unique identifier of the attachment to delete (UUID format). The attachment must belong to the specified article.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   *
   * 1. **Authentication Check**: Verify the requester is authenticated as a member (not a guest). Extract member ID from the JWT token.
   *
   * 2. **Article Validation**: Query discussion_board_articles to verify:
   *    - The article exists (id = articleId)
   *    - The article is not deleted (deleted_at IS NULL)
   *    - If deleted, return 404 Not Found
   *
   * 3. **Attachment Validation**: Query discussion_board_article_attachments to verify:
   *    - The attachment exists (id = attachmentId)
   *    - The attachment belongs to the specified article (discussion_board_article_id = articleId)
   *    - If not found or mismatch, return 404 Not Found
   *
   * 4. **Authorization Check**: Verify permission:
   *    - If requester is the article author (article.member_id === requester.id), allow deletion
   *    - If requester is an administrator (has admin role), allow deletion
   *    - Otherwise, return 403 Forbidden
   *
   * 5. **File Deletion**: Remove the physical file from storage:
   *    - Delete file at path stored in attachment.path
   *    - Handle storage-specific errors gracefully
   *
   * 6. **Database Deletion**: Delete the attachment record:
   *    - DELETE FROM discussion_board_article_attachments WHERE id = attachmentId
   *    - This is a permanent (hard) deletion
   *
   * 7. **Response**: Return the deleted attachment information as confirmation
   *
   * Error handling:
   * - 401 Unauthorized: Not authenticated
   * - 403 Forbidden: Not the author and not an admin
   * - 404 Not Found: Article or attachment not found
   * - 500 Internal Server Error: Storage deletion failure (rollback database if needed)
   *
   * Transaction: Use a single transaction for file deletion and database deletion to ensure consistency.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":attachmentId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("articleId")
    articleId: string & tags.Format<"uuid">,
    @TypedParam("attachmentId")
    attachmentId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteDiscussionBoardMemberArticlesArticleIdAttachmentsAttachmentId(
        {
          member,
          articleId,
          attachmentId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
