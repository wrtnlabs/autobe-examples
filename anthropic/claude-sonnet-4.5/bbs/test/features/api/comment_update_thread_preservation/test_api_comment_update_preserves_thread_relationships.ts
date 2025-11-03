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
 * Test that updating a comment preserves its threading relationships and does
 * not affect its position in the thread.
 *
 * This test validates the critical requirement that comment edits only modify
 * content and timestamps, while preserving all structural relationships within
 * the comment thread. The discussion board system uses single-level threading
 * where comments can be top-level (direct article responses) or replies to
 * top-level comments.
 *
 * Workflow steps:
 *
 * 1. Create new member account with join (new user context)
 * 2. Moderator creates a category for article organization
 * 3. Member creates and publishes an article to host the comment thread
 * 4. Member creates a top-level comment directly on the article
 * 5. Member creates a reply to the top-level comment to establish threading
 * 6. Member updates the reply comment's content
 * 7. Validate the parent comment relationship is unchanged
 * 8. Validate the article relationship is unchanged
 * 9. Verify thread position is maintained
 *
 * Validation points:
 *
 * - Parent comment ID remains the same after update
 * - Article ID remains the same after update
 * - Thread structure is not disrupted by edits
 * - Only content and timestamps are modified
 */
export async function test_api_comment_update_preserves_thread_relationships(
  connection: api.IConnection,
) {
  // Step 1: Create new member account
  const memberRegistration = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member = await api.functional.auth.member.join(connection, {
    body: memberRegistration,
  });
  typia.assert(member);

  // Step 2: Create a category (as moderator - auth automatically handled by join)
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create and publish an article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 4: Create a top-level comment on the article
  const topLevelCommentData = {
    discussion_board_article_id: article.id,
    discussion_board_parent_comment_id: null,
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const topLevelComment =
    await api.functional.discussionBoard.articles.comments.create(connection, {
      articleId: article.id,
      body: topLevelCommentData,
    });
  typia.assert(topLevelComment);

  // Step 5: Create a reply to the top-level comment
  const replyCommentData = {
    discussion_board_article_id: article.id,
    discussion_board_parent_comment_id: topLevelComment.id,
    content: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const replyComment =
    await api.functional.discussionBoard.articles.comments.create(connection, {
      articleId: article.id,
      body: replyCommentData,
    });
  typia.assert(replyComment);

  // Store original relationships before update
  const originalArticleId = replyComment.discussion_board_article_id;
  const originalParentCommentId =
    replyComment.discussion_board_parent_comment_id;
  const originalContent = replyComment.content;
  const originalCreatedAt = replyComment.created_at;

  // Step 6: Update the reply comment's content
  const updatedContent = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 12,
  });
  const updateData = {
    content: updatedContent,
  } satisfies IDiscussionBoardComment.IUpdate;

  const updatedComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: replyComment.id,
        body: updateData,
      },
    );
  typia.assert(updatedComment);

  // Step 7: Validate the parent comment relationship is unchanged
  TestValidator.equals(
    "parent comment ID remains unchanged after update",
    updatedComment.discussion_board_parent_comment_id,
    originalParentCommentId,
  );

  // Step 8: Validate the article relationship is unchanged
  TestValidator.equals(
    "article ID remains unchanged after update",
    updatedComment.discussion_board_article_id,
    originalArticleId,
  );

  // Step 9: Verify thread position is maintained and only content/timestamps changed
  TestValidator.equals(
    "comment ID remains the same",
    updatedComment.id,
    replyComment.id,
  );

  TestValidator.equals(
    "created_at timestamp is preserved",
    updatedComment.created_at,
    originalCreatedAt,
  );

  TestValidator.notEquals(
    "content has been updated",
    updatedComment.content,
    originalContent,
  );

  TestValidator.equals(
    "updated content matches the new content",
    updatedComment.content,
    updatedContent,
  );

  TestValidator.predicate(
    "updated_at timestamp has changed",
    new Date(updatedComment.updated_at) > new Date(originalCreatedAt),
  );
}
