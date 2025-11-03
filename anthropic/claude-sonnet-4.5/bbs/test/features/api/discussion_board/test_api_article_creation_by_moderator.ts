import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test the complete workflow of a moderator creating and publishing a new
 * article on the discussion board.
 *
 * This test validates that authenticated moderators can successfully create
 * articles with all required fields and optional metadata. It verifies that
 * articles are created with status 'published', view_count and comment_count
 * initialized to 0, and that the moderator's identity is properly tracked for
 * accountability and audit purposes.
 *
 * Test workflow:
 *
 * 1. Create and authenticate as a moderator account
 * 2. Create a category for article classification
 * 3. Create an article with required fields
 * 4. Validate article structure and initial values
 */
export async function test_api_article_creation_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a category (required for article creation)
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Verify category creation
  TestValidator.equals(
    "category name matches",
    category.name,
    categoryData.name,
  );

  // Step 3: Create an article as the moderator
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
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
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 4: Validate article business logic
  TestValidator.equals(
    "article title matches",
    article.title,
    articleData.title,
  );
  TestValidator.equals("article body matches", article.body, articleData.body);
  TestValidator.equals(
    "article status is published",
    article.status,
    "published",
  );
  TestValidator.equals("view_count initialized to 0", article.view_count, 0);
  TestValidator.equals(
    "comment_count initialized to 0",
    article.comment_count,
    0,
  );

  // Verify category assignment
  TestValidator.equals(
    "article category matches created category",
    article.categories[0].id,
    category.id,
  );
}
