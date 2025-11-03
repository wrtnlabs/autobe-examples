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
 * Test category deletion when the category has articles associated with it.
 *
 * This test validates that a category can be successfully deleted even when it
 * has articles associated with it. The test creates a moderator account,
 * creates a category, creates multiple articles categorized under that
 * category, then successfully deletes the category.
 *
 * Note: This test cannot verify the cascade deletion behavior (whether articles
 * still exist or category associations are removed) because the available API
 * does not provide endpoints to retrieve articles after creation.
 *
 * Steps:
 *
 * 1. Authenticate as moderator
 * 2. Create a test category
 * 3. Create multiple articles categorized under the test category
 * 4. Delete the category and verify the deletion response
 */
export async function test_api_category_deletion_with_articles(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a test category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create multiple articles categorized under the test category
  const article1 =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article1);

  const article2 =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article2);

  const article3 =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article3);

  // Verify articles were created with the category association
  TestValidator.predicate(
    "article1 should have the test category",
    article1.categories.some((c) => c.id === category.id),
  );
  TestValidator.predicate(
    "article2 should have the test category",
    article2.categories.some((c) => c.id === category.id),
  );
  TestValidator.predicate(
    "article3 should have the test category",
    article3.categories.some((c) => c.id === category.id),
  );

  // Step 4: Delete the category
  const deletedCategory =
    await api.functional.discussionBoard.moderator.categories.erase(
      connection,
      {
        categorySlug: category.slug,
      },
    );
  typia.assert(deletedCategory);

  // Verify the deleted category response matches the original
  TestValidator.equals(
    "deleted category ID matches",
    deletedCategory.id,
    category.id,
  );
  TestValidator.equals(
    "deleted category name matches",
    deletedCategory.name,
    category.name,
  );
  TestValidator.equals(
    "deleted category slug matches",
    deletedCategory.slug,
    category.slug,
  );
}
