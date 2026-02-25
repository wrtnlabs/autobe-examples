import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IDiscussionBoardArticleFile } from "../../../../api/structures/IDiscussionBoardArticleFile";
import { getDiscussionBoardArticlesArticleIdFilesFileId } from "../../../../providers/getDiscussionBoardArticlesArticleIdFilesFileId";
import { patchDiscussionBoardArticlesArticleIdFiles } from "../../../../providers/patchDiscussionBoardArticlesArticleIdFiles";

@Controller("/discussionBoard/articles/:articleId/files")
export class DiscussionboardArticlesFilesController {
  /**
   * Manage file attachments for a specific article by adding new files or removing existing ones.
   *
   * This endpoint allows authenticated users to modify the file attachments on their articles. Users can upload new files to attach to the article and remove existing attachments by specifying their IDs. The operation supports partial updates - only specify the files to add or remove.
   *
   * Authorization is strictly limited to the article's author. Any attempt by a non-author to modify attachments will result in a 403 Forbidden error. Additionally, users who have been banned from the platform cannot modify their articles' attachments even if they are the original author.
   *
   * File attachments are subject to comprehensive validation:
   *
   * - **File Count**: Maximum 10 file attachments per article. Attempts to exceed this limit will return a validation error.
   * - **Individual File Size**: Maximum 10MB per file. Files exceeding this limit will be rejected.
   * - **Total Attachment Size**: Maximum 50MB combined size for all file attachments on the article.
   * - **Allowed File Types**: Only specific document and archive formats are permitted:
   * - Documents: PDF, DOC, DOCX, TXT, RTF
   * - Spreadsheets: XLS, XLSX, CSV
   * - Presentations: PPT, PPTX
   * - Archives: ZIP, RAR, 7Z
   *
   * When files are removed, the physical files are permanently deleted from storage and their database records are cascade deleted. The original_filename is preserved for display and download purposes while a system-generated unique filename is used for storage to prevent conflicts.
   *
   * Related operations:
   * - Use GET /articles/{articleId} to view article details with all attachments
   * - Use PATCH /articles/{articleId}/images to manage image attachments separately
   *
   * @param connection
   * @param articleId Target article's unique identifier (global scope)
   * @param body JSON object containing two optional arrays: 'additions' for new files to upload (each with file data, original filename, MIME type, and size), and 'removals' for file IDs to delete from the article
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implementation steps:
   *
   * 1. **Authentication Check**: Verify JWT token validity. Return 401 with AUTH_REQUIRED if not authenticated.
   *
   * 2. **Article Validation**: Query discussion_board_articles table for the specified articleId. Return 404 with ARTICLE_NOT_FOUND if article doesn't exist.
   *
   * 3. **Authorization Check**: Compare discussion_board_user_id of the article with authenticated user's ID. Return 403 with NOT_ARTICLE_OWNER if mismatch.
   *
   * 4. **Ban Status Check**: Query discussion_board_users to check if user has an active ban (is_banned = true). Return 403 with USER_BANNED if banned.
   *
   * 5. **Process Removals**: For each fileId in removals array:
   *    - Verify file belongs to the article (discussion_board_article_id matches)
   *    - Delete physical file from storage using storage_path
   *    - Delete record from discussion_board_article_files (cascade on delete handles this)
   *
   * 6. **Process Additions**: For each file in additions array:
   *    - Validate file type against allowed MIME types (check mime_type field)
   *    - Validate file size <= 10MB (10,485,760 bytes)
   *    - Calculate new total size and verify <= 50MB
   *    - Count current + new files and verify <= 10 total
   *    - Generate unique storage_path (UUID-based filename)
   *    - Store file in object storage
   *    - Insert record into discussion_board_article_files with:
   *      - discussion_board_article_id: the article's ID
   *      - original_filename: user-provided filename
   *      - storage_path: generated unique path
   *      - file_size: in bytes
   *      - mime_type: validated MIME type
   *      - created_at: current timestamp
   *
   * 7. **Return Response**: Query all files for the article and return as array of file summaries (id, original_filename, file_size, mime_type, created_at). Exclude storage_path from response.
   *
   * Error handling:
   * - FILE_TYPE_NOT_ALLOWED: MIME type not in allowed list
   * - FILE_SIZE_EXCEEDED: File > 10MB
   * - FILE_COUNT_EXCEEDED: Total files would exceed 10
   * - ARTICLE_ATTACHMENT_LIMIT_EXCEEDED: Total size would exceed 50MB
   * - FILE_NOT_FOUND: Specified removal fileId doesn't exist or doesn't belong to article
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async updateFiles(
    @TypedParam("articleId")
    articleId: string,
    @TypedBody()
    body: IDiscussionBoardArticleFile.IUpdate,
  ): Promise<IDiscussionBoardArticleFile.ISummary> {
    try {
      return await patchDiscussionBoardArticlesArticleIdFiles({
        articleId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a specific file attachment from an article.
   *
   * This endpoint allows users to access file attachments that have been uploaded to articles. Users can download files in various formats including PDF documents, Word documents (DOC/DOCX), Excel spreadsheets (XLS/XLSX), PowerPoint presentations (PPT/PPTX), text files, and archive files (ZIP, RAR, 7Z).
   *
   * The operation validates that the requested file exists and is associated with the specified article. If the file does not exist or does not belong to the article, an appropriate error is returned.
   *
   * File downloads are available to all users including guests, authenticated users, and administrators. The original filename is preserved for the download, and the MIME type is provided for proper content handling.
   *
   * Related to the article detail view where users can see all attached files and initiate downloads. The articleId parameter ensures proper context and prevents unauthorized access to files from different articles.
   *
   * @param connection
   * @param articleId Unique identifier of the article containing the file attachment
   * @param fileId Unique identifier of the file attachment to retrieve
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implementation steps:
   *
   * 1. Validate path parameters:
   *    - articleId must be a valid UUID format
   *    - fileId must be a valid UUID format
   *
   * 2. Query discussion_board_article_files table:
   *    - Find file by id = fileId AND discussion_board_article_id = articleId
   *    - Include join with discussion_board_articles to verify article exists
   *    - Check article.deleted_at is null (article not soft-deleted)
   *
   * 3. If file not found:
   *    - Return 404 NOT_FOUND error with code FILE_NOT_FOUND
   *
   * 4. If article not found or soft-deleted:
   *    - Return 404 NOT_FOUND error with code ARTICLE_NOT_FOUND
   *
   * 5. Generate download URL:
   *    - Construct URL using storage_path and file metadata
   *    - The URL should be a direct download link or a signed URL for cloud storage
   *
   * 6. Return file metadata object with:
   *    - id: file UUID
   *    - articleId: parent article UUID
   *    - originalFilename: user's original filename
   *    - fileSize: size in bytes
   *    - mimeType: MIME type string
   *    - downloadUrl: URI string for file download
   *    - createdAt: upload timestamp
   *
   * No authentication required - file downloads are publicly accessible.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":fileId")
  public async at(
    @TypedParam("articleId")
    articleId: string,
    @TypedParam("fileId")
    fileId: string,
  ): Promise<IDiscussionBoardArticleFile> {
    try {
      return await getDiscussionBoardArticlesArticleIdFilesFileId({
        articleId,
        fileId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
