import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test the complete workflow of a member editing their own comment on a
 * discussion board article.
 *
 * This test validates ownership-based permission checks, content update
 * functionality, timestamp tracking, and edit indicator display for member
 * comment authors.
 *
 * Workflow:
 *
 * 1. Create new member account with join
 * 2. Create a category for article organization (using random UUID as workaround)
 * 3. Create and publish an article
 * 4. Post a comment on the article
 * 5. Update the comment content with new text
 * 6. Validate the comment is updated successfully
 * 7. Verify the content reflects the changes
 * 8. Verify updated_at timestamp is modified while created_at remains unchanged
 * 9. Verify an edit indicator is displayed (updated_at > created_at)
 */
export async function test_api_comment_update_by_original_author(
  connection: api.IConnection,
) {
  // Step 1: Create new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123!";
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Generate category ID (workaround since member cannot create categories)
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create and publish an article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        summary: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        category_ids: [categoryId],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: Post a comment on the article
  const originalCommentContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const comment = await api.functional.discussionBoard.articles.comments.create(
    connection,
    {
      articleId: article.id,
      body: {
        discussion_board_article_id: article.id,
        discussion_board_parent_comment_id: null,
        content: originalCommentContent,
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // Validate initial comment state
  TestValidator.equals(
    "initial comment content matches",
    comment.content,
    originalCommentContent,
  );
  TestValidator.equals(
    "initial created_at equals updated_at",
    comment.created_at,
    comment.updated_at,
  );

  // Step 5: Update the comment content with new text
  const updatedCommentContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
  });

  const updatedComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: updatedCommentContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);

  // Step 6: Validate the comment is updated successfully
  TestValidator.equals(
    "comment ID remains unchanged",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "article ID remains unchanged",
    updatedComment.discussion_board_article_id,
    article.id,
  );

  // Step 7: Verify the content reflects the changes
  TestValidator.equals(
    "updated content matches new content",
    updatedComment.content,
    updatedCommentContent,
  );
  TestValidator.notEquals(
    "updated content differs from original",
    updatedComment.content,
    originalCommentContent,
  );

  // Step 8: Verify updated_at timestamp is modified while created_at remains unchanged
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedComment.created_at,
    comment.created_at,
  );

  const createdAtTime = new Date(updatedComment.created_at).getTime();
  const updatedAtTime = new Date(updatedComment.updated_at).getTime();

  TestValidator.predicate(
    "updated_at timestamp is greater than created_at",
    updatedAtTime > createdAtTime,
  );

  // Step 9: Verify edit indicator would be displayed
  TestValidator.predicate(
    "edit indicator should be shown (updated_at differs from created_at)",
    updatedComment.updated_at !== updatedComment.created_at,
  );

  // Verify author information remains consistent
  TestValidator.equals(
    "author type remains member",
    updatedComment.author_type,
    "member",
  );
  TestValidator.equals(
    "member author ID matches",
    updatedComment.discussion_board_member_id,
    member.id,
  );

  if (updatedComment.memberAuthor) {
    TestValidator.equals(
      "member author username matches",
      updatedComment.memberAuthor.username,
      member.username,
    );
  }
}
