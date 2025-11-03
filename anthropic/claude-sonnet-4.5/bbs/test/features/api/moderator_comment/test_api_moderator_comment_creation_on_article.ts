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
 * Test the complete workflow of a moderator posting a new comment on an
 * article.
 *
 * This test validates that moderators can successfully create comments on
 * published articles, ensuring proper authentication, comment content
 * validation, and immediate visibility of the posted comment.
 *
 * Test steps:
 *
 * 1. Create a new moderator account using the join operation
 * 2. Create a category (required for article creation)
 * 3. Create an article as a moderator to have a target for commenting
 * 4. Post a new comment on the created article with valid content
 * 5. Validate the comment was created successfully with correct metadata
 * 6. Verify the comment content matches what was submitted
 * 7. Verify the author_type is set to 'moderator'
 * 8. Verify the comment is immediately visible (no approval required)
 * 9. Verify timestamps (created_at, updated_at) are properly set
 */
export async function test_api_moderator_comment_creation_on_article(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create a category (required for article creation)
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create an article as a moderator
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 4: Post a new comment on the created article
  const commentContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const commentData = {
    discussion_board_article_id: article.id,
    content: commentContent,
  } satisfies IDiscussionBoardComment.ICreate;

  const comment =
    await api.functional.discussionBoard.moderator.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  // Step 5: Validate the comment was created successfully
  TestValidator.predicate(
    "comment should have valid UUID",
    comment.id !== undefined && comment.id.length > 0,
  );

  // Step 6: Verify the comment content matches submission
  TestValidator.equals(
    "comment content matches submitted content",
    comment.content,
    commentContent,
  );

  // Step 7: Verify the author_type is set to 'moderator'
  TestValidator.equals(
    "comment author type is moderator",
    comment.author_type,
    "moderator",
  );

  // Step 8: Verify the comment references the correct article
  TestValidator.equals(
    "comment belongs to correct article",
    comment.discussion_board_article_id,
    article.id,
  );

  // Step 9: Verify timestamps are properly set
  TestValidator.predicate(
    "created_at timestamp is set",
    comment.created_at !== undefined && comment.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at timestamp is set",
    comment.updated_at !== undefined && comment.updated_at.length > 0,
  );

  // Step 10: Verify comment is not deleted (deleted_at should be null)
  TestValidator.equals("comment is not deleted", comment.deleted_at, null);

  // Step 11: Verify moderator author information is populated
  TestValidator.predicate(
    "moderator author information exists",
    comment.moderatorAuthor !== null && comment.moderatorAuthor !== undefined,
  );

  if (comment.moderatorAuthor) {
    TestValidator.equals(
      "moderator author ID matches authenticated moderator",
      comment.moderatorAuthor.id,
      moderator.id,
    );
  }
}
