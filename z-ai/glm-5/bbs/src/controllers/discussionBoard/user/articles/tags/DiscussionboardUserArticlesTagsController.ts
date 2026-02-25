import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IDiscussionBoardArticle } from "../../../../../api/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "../../../../../api/structures/IDiscussionBoardArticleTag";
import { UserAuth } from "../../../../../decorators/UserAuth";
import { UserPayload } from "../../../../../decorators/payload/UserPayload";
import { deleteDiscussionBoardUserArticlesArticleIdTagsTagId } from "../../../../../providers/deleteDiscussionBoardUserArticlesArticleIdTagsTagId";
import { postDiscussionBoardUserArticlesArticleIdTags } from "../../../../../providers/postDiscussionBoardUserArticlesArticleIdTags";

@Controller("/discussionBoard/user/articles/:articleId/tags")
export class DiscussionboardUserArticlesTagsController {
  /**
   * Associate one or more tags with an existing article.
   *
   * This operation allows the article author to add tags to their article for flexible categorization beyond section-based organization. Each tag is a free-form text string that gets normalized to lowercase and validated for format compliance (1-50 characters, alphanumeric with hyphens and underscores only).
   *
   * The operation validates that the authenticated user is the article author, ensuring only the content owner can modify article tags. Banned users are denied access regardless of article ownership.
   *
   * Tags are processed as follows:
   * - Each tag value is trimmed of leading/trailing whitespace
   * - Tags are converted to lowercase for case-insensitive comparison
   * - Duplicate tags in the request are automatically removed
   * - Tags that already exist in the platform are reused (reference existing tag record)
   * - New tags are created in the master tag registry
   * - Duplicate associations (tag already on the article) are handled gracefully
   *
   * The operation enforces a maximum of 15 tags per article. If adding the new tags would exceed this limit, the operation is rejected with a validation error.
   *
   * This endpoint complements the article creation and editing workflows, allowing tag management as a standalone operation for existing articles.
   *
   * **Related Operations**:
   * - Use GET /articles/{articleId} to retrieve the article with all its current tags
   * - Use PUT /articles/{articleId} to update article content along with tags
   * - Use DELETE /articles/{articleId}/tags/{tagId} to remove a specific tag from an article
   *
   * @param connection
   * @param articleId Unique identifier of the article to which tags will be added
   * @param body Array of tag values to associate with the article. Each tag is normalized to lowercase and validated for format (1-50 characters, alphanumeric with hyphens and underscores only). Duplicate tags are automatically removed. Maximum total tags per article is 15.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor user
   * @x-autobe-specification Implementation steps for adding tags to an article:
   *
   * 1. **Authentication Verification**: Extract user from JWT token. Return 401 if not authenticated.
   *
   * 2. **Article Lookup**: Query discussion_board_articles by articleId. Return 404 if article not found or is soft-deleted (deleted_at IS NULL).
   *
   * 3. **Authorization Check**: Compare discussion_board_user_id with authenticated user's ID. Return 403 if not the author.
   *
   * 4. **Ban Status Check**: Query discussion_board_bans to verify user is not currently banned. Return 403 with USER_BANNED if banned.
   *
   * 5. **Tag Validation**: For each tag in request:
   *    - Trim whitespace
   *    - Validate length (1-50 characters)
   *    - Validate characters (alphanumeric, hyphens, underscores only)
   *    - Convert to lowercase
   *    - Return 400 with TAG_TOO_LONG, TAG_INVALID_CHARACTERS if validation fails
   *
   * 6. **Duplicate Removal**: Remove duplicate tags from the request array after normalization.
   *
   * 7. **Tag Limit Check**: Query current tag count for article from discussion_board_article_tags. Add new unique tags count. Return 400 with TAG_LIMIT_EXCEEDED if total exceeds 15.
   *
   * 8. **Tag Processing**: For each normalized tag value:
   *    - Check if tag exists in discussion_board_tags by value (unique constraint)
   *    - If not exists, create new tag record with id (UUID), value, created_at, updated_at
   *    - Check if article-tag association exists in discussion_board_article_tags (unique constraint)
   *    - If not exists, create association record with id (UUID), discussion_board_article_id, discussion_board_tag_id, created_at
   *
   * 9. **Response**: Return the updated article with all its tags by querying:
   *    - discussion_board_articles by articleId
   *    - discussion_board_article_tags where discussion_board_article_id = articleId
   *    - discussion_board_tags for each association
   *    - Include section reference and author reference
   *
   * Transaction: Wrap steps 8-9 in a database transaction to ensure atomicity.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @UserAuth()
    user: UserPayload,
    @TypedParam("articleId")
    articleId: string,
    @TypedBody()
    body: IDiscussionBoardArticleTag.ICreate,
  ): Promise<IDiscussionBoardArticle> {
    try {
      return await postDiscussionBoardUserArticlesArticleIdTags({
        user,
        articleId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Removes a specific tag association from an article.
   *
   * This operation allows article authors to remove individual tags from their articles during the editing process. The operation targets the junction table discussion_board_article_tags and deletes the association record between the specified article and tag.
   *
   * **Authorization Requirements**:
   * - Only the article's author can remove tags from their article
   * - Banned users cannot perform this operation even if they are the author
   * - Administrators cannot modify article tags (administrators only have deletion rights for entire articles)
   *
   * **Cascade Behavior**:
   * When a tag association is removed, only the junction record is deleted. The article and tag entities themselves remain intact. The tag can still be used in other articles. This supports the tag normalization strategy where tags persist independently and are reused across the platform.
   *
   * **Related Operations**:
   * - Use PATCH /articles/{articleId} for complete article updates including tag replacement
   * - Use GET /articles/{articleId} to view current article tags
   * - Use POST /articles to create new articles with tags
   *
   * @param connection
   * @param articleId Unique identifier of the article from which to remove the tag
   * @param tagId Unique identifier of the tag to remove from the article
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor user
   * @x-autobe-specification Delete a tag association from an article.
   *
   * **Database Operation**:
   * 1. Validate the user is authenticated
   * 2. Query discussion_board_articles to verify the article exists and user is the author
   * 3. Check if the user is banned via discussion_board_users.permission_level and ban status
   * 4. Query discussion_board_article_tags to find the association record matching articleId and tagId
   * 5. Delete the junction record if found
   *
   * **Authorization Logic**:
   * - Must be the article author (discussion_board_articles.discussion_board_user_id matches authenticated user)
   * - User must not be banned
   * - Throw 403 if not author or if banned
   *
   * **Error Handling**:
   * - 401 if not authenticated
   * - 403 if user is not the article author or if banned
   * - 404 if article not found or tag association not found
   *
   * **Transaction**: Single delete operation on junction table, no cascade effects needed.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":tagId")
  public async erase(
    @UserAuth()
    user: UserPayload,
    @TypedParam("articleId")
    articleId: string & tags.Format<"uuid">,
    @TypedParam("tagId")
    tagId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteDiscussionBoardUserArticlesArticleIdTagsTagId({
        user,
        articleId,
        tagId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
