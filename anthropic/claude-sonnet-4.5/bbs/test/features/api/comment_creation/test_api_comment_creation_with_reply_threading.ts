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
 * Test comment creation with single-level reply threading functionality.
 *
 * This test validates the discussion board's comment threading system by
 * creating a reply comment that references a parent top-level comment. It
 * ensures that the parent-child relationship is properly established through
 * the discussion_board_parent_comment_id field and that the single-level
 * threading structure is maintained.
 *
 * Workflow:
 *
 * 1. Create and authenticate a new member account
 * 2. Create a category for article organization
 * 3. Create and publish an article to host the comment thread
 * 4. Create a top-level comment on the article
 * 5. Create a reply comment referencing the parent comment
 * 6. Validate reply creation with correct parent relationship
 * 7. Verify threading structure is properly maintained
 */
export async function test_api_comment_creation_with_reply_threading(
  connection: api.IConnection,
) {
  // Step 1: Create new member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create category for article organization
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create and publish article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: Create top-level parent comment
  const parentComment =
    await api.functional.discussionBoard.articles.comments.create(connection, {
      articleId: article.id,
      body: {
        discussion_board_article_id: article.id,
        discussion_board_parent_comment_id: null,
        content: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(parentComment);

  // Validate parent comment is top-level (no parent)
  TestValidator.equals(
    "parent comment should be top-level",
    parentComment.discussion_board_parent_comment_id,
    null,
  );

  // Step 5: Create reply comment referencing parent comment
  const replyComment =
    await api.functional.discussionBoard.articles.comments.create(connection, {
      articleId: article.id,
      body: {
        discussion_board_article_id: article.id,
        discussion_board_parent_comment_id: parentComment.id,
        content: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(replyComment);

  // Step 6: Validate reply comment has correct parent relationship
  TestValidator.equals(
    "reply comment should reference parent comment",
    replyComment.discussion_board_parent_comment_id,
    parentComment.id,
  );

  // Step 7: Validate both comments are associated with the article
  TestValidator.equals(
    "parent comment should belong to article",
    parentComment.discussion_board_article_id,
    article.id,
  );

  TestValidator.equals(
    "reply comment should belong to article",
    replyComment.discussion_board_article_id,
    article.id,
  );

  // Validate single-level threading structure
  TestValidator.predicate(
    "reply comment should have a parent ID",
    replyComment.discussion_board_parent_comment_id !== null &&
      replyComment.discussion_board_parent_comment_id !== undefined,
  );

  TestValidator.predicate(
    "parent comment should not have a parent (top-level)",
    parentComment.discussion_board_parent_comment_id === null,
  );
}
