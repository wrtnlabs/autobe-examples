import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IDiscussionBoardArticle } from "../../../../../api/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTagSummary } from "../../../../../api/structures/IDiscussionBoardArticleTagSummary";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteDiscussionBoardMemberArticlesArticleIdTagsTagId } from "../../../../../providers/deleteDiscussionBoardMemberArticlesArticleIdTagsTagId";
import { patchDiscussionBoardMemberArticlesArticleIdTags } from "../../../../../providers/patchDiscussionBoardMemberArticlesArticleIdTags";

@Controller("/discussionBoard/member/articles/:articleId/tags")
export class DiscussionboardMemberArticlesTagsController {
  /**
   * Update the tags associated with a specific discussion board article.
   *
   * This operation allows article owners to add, modify, or remove tags from their articles. Tags enable multi-dimensional categorization beyond the single section assignment, allowing articles to be discovered through multiple tag-based searches and filters.
   *
   * Security and Permissions:
   * - Only the article owner (discussion_board_member_id matches authenticated member) can update tags
   * - Administrators can update tags on any article for moderation purposes
   * - Guests and non-owners receive authorization errors
   *
   * Tag Management Rules:
   * - Tags are stored as free-text strings with case-insensitive uniqueness within an article
   * - Duplicate tags within the same article are automatically prevented
   * - Empty tag strings are rejected with validation errors
   * - Tags are created in discussion_board_tags if they don't exist, or reused if they do
   * - Tag associations are managed through the discussion_board_article_tags junction table
   *
   * Related Operations:
   * - GET /articles/{articleId} - Retrieve article details including current tags
   * - PATCH /articles/{articleId} - Update article content (title, body) along with tags
   * - PATCH /tags - Search and list available tags for discovery
   *
   * @param connection
   * @param articleId Target article's UUID identifier (global scope)
   * @param body Tag update operations for the article
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps for tag update operation:
   *
   * 1. Authentication and Authorization:
   *    - Extract authenticated member ID from session/token
   *    - Query discussion_board_articles by articleId
   *    - Verify article exists and is not soft-deleted (deleted_at IS NULL)
   *    - Check if member is article owner OR has admin privileges
   *    - Return 403 Forbidden if unauthorized
   *
   * 2. Request Body Validation:
   *    - Validate tags array contains non-empty strings
   *    - Check for duplicate tags in request (case-insensitive)
   *    - Enforce maximum tag count per article (business rule: typically 10-20 tags)
   *    - Validate tag name length (e.g., 1-50 characters)
   *
   * 3. Tag Resolution and Creation:
   *    - For each tag in request:
   *      a. Query discussion_board_tags by name (case-insensitive)
   *      b. If exists, use existing tag ID
   *      c. If not exists, create new tag with current timestamp
   *    - Handle tag creation atomically within transaction
   *
   * 4. Tag Association Management:
   *    - Query existing discussion_board_article_tags for this article
   *    - Compare current tags with requested tags:
   *      a. Tags in request but not in current: INSERT new associations
   *      b. Tags in current but not in request: DELETE associations (soft delete with deleted_at)
   *      c. Tags in both: No action needed
   *    - Use transaction to ensure atomicity
   *
   * 5. Response Construction:
   *    - Query final state of discussion_board_article_tags for this article
   *    - Join with discussion_board_tags to get tag names and descriptions
   *    - Return array of tag association summaries with tag details
   *
   * 6. Error Handling:
   *    - 404 Not Found: Article does not exist or is soft-deleted
   *    - 403 Forbidden: Not article owner and not admin
   *    - 400 Bad Request: Invalid tag format, empty tags, or duplicates
   *    - 409 Conflict: Tag count exceeds maximum limit
   *    - 500 Internal Server Error: Database transaction failures
   *
   * Database Queries:
   * - SELECT discussion_board_articles WHERE id = :articleId AND deleted_at IS NULL
   * - SELECT discussion_board_tags WHERE LOWER(name) = LOWER(:tagName)
   * - INSERT INTO discussion_board_tags (name, created_at, updated_at) VALUES (...)
   * - SELECT discussion_board_article_tags WHERE discussion_board_article_id = :articleId AND deleted_at IS NULL
   * - INSERT INTO discussion_board_article_tags (...) VALUES (...)
   * - UPDATE discussion_board_article_tags SET deleted_at = NOW() WHERE id = :tagAssociationId
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("articleId")
    articleId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IDiscussionBoardArticle.ITag,
  ): Promise<IDiscussionBoardArticleTagSummary> {
    try {
      return await patchDiscussionBoardMemberArticlesArticleIdTags({
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
   * Permanently remove a tag association from an article through soft deletion of the junction table record.
   *
   * This operation removes the relationship between a specific article and tag by marking the association record as deleted in the discussion_board_article_tags junction table. The tag entity itself remains in the system and can still be associated with other articles. Only the specific association between the specified article and tag is removed through soft deletion.
   *
   * Security and authorization: Only the article owner (the member who created the article) or an administrator with moderation privileges can remove tags from an article. This enforces content ownership control and provides administrators with moderation capabilities as defined in the Article Deletion and Ownership requirements.
   *
   * Database behavior: The operation performs a soft delete by setting the deleted_at timestamp on the discussion_board_article_tags record rather than physically removing it. This preserves the audit trail and historical data while removing the association from active queries. The discussion_board_article_tags table supports soft deletion through its deleted_at column.
   *
   * Error conditions: Returns 404 Not Found if the article, tag, or association does not exist. Returns 403 Forbidden if the authenticated user lacks authorization. Returns 400 Bad Request for invalid UUID parameter formats.
   *
   * Related operations: Use GET /discussionBoard/member/articles/{articleId} to retrieve article details including current tag associations. Use POST /discussionBoard/member/articles/{articleId}/tags to add new tag associations to an article.
   *
   * @param connection
   * @param articleId Target article's unique identifier (global scope)
   * @param tagId Tag to remove from the article (global scope)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Remove tag association from article by deleting the record from discussion_board_article_tags junction table.
   *
   * Implementation steps:
   * 1. Verify article exists and is not soft-deleted (deleted_at IS NULL)
   * 2. Verify tag exists in discussion_board_tags
   * 3. Verify authenticated user is the article owner (discussion_board_member_id matches) OR is an administrator
   * 4. Query discussion_board_article_tags for record with discussion_board_article_id = {articleId} AND discussion_board_tag_id = {tagId}
   * 5. If record not found, return 404 Not Found
   * 6. Delete the association record from discussion_board_article_tags
   * 7. Return 204 No Content on success
   *
   * Error handling:
   * - 404: Article not found, tag not found, or association does not exist
   * - 403: User is not article owner and not an administrator
   * - 400: Invalid UUID format for articleId or tagId
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":tagId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("articleId")
    articleId: string & tags.Format<"uuid">,
    @TypedParam("tagId")
    tagId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteDiscussionBoardMemberArticlesArticleIdTagsTagId({
        member,
        articleId,
        tagId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
