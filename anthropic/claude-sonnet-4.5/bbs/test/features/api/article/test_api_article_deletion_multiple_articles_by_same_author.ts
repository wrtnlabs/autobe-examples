import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test member's ability to delete multiple articles they authored in sequence.
 *
 * This test validates independent deletion operations and proper state
 * management when a member deletes multiple articles one by one. Each deletion
 * should succeed independently, set the deleted_at timestamp correctly, and not
 * affect other articles.
 *
 * Test Flow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create article category for classification
 * 3. Create member account and authenticate
 * 4. Create three separate published articles
 * 5. Delete each article sequentially
 * 6. Validate each deletion sets deleted_at timestamp correctly
 * 7. Verify deletion isolation - only targeted article is affected
 */
export async function test_api_article_deletion_multiple_articles_by_same_author(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator to create category
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create category for articles
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: `${RandomGenerator.alphabets(5)}-${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >() satisfies number as number,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create three separate articles
  const article1 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);

  const article2 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);

  const article3 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article3);

  // Step 5: Delete first article
  const deletedArticle1 =
    await api.functional.discussionBoard.member.articles.erase(connection, {
      articleId: article1.id,
    });
  typia.assert(deletedArticle1);

  // Step 6: Validate first deletion
  TestValidator.predicate(
    "first article deletion sets deleted_at timestamp",
    deletedArticle1.deleted_at !== null &&
      deletedArticle1.deleted_at !== undefined,
  );
  TestValidator.equals(
    "first deleted article ID matches",
    deletedArticle1.id,
    article1.id,
  );
  TestValidator.equals(
    "first deleted article title preserved",
    deletedArticle1.title,
    article1.title,
  );

  // Step 7: Delete second article
  const deletedArticle2 =
    await api.functional.discussionBoard.member.articles.erase(connection, {
      articleId: article2.id,
    });
  typia.assert(deletedArticle2);

  // Step 8: Validate second deletion
  TestValidator.predicate(
    "second article deletion sets deleted_at timestamp",
    deletedArticle2.deleted_at !== null &&
      deletedArticle2.deleted_at !== undefined,
  );
  TestValidator.equals(
    "second deleted article ID matches",
    deletedArticle2.id,
    article2.id,
  );
  TestValidator.equals(
    "second deleted article title preserved",
    deletedArticle2.title,
    article2.title,
  );

  // Step 9: Delete third article
  const deletedArticle3 =
    await api.functional.discussionBoard.member.articles.erase(connection, {
      articleId: article3.id,
    });
  typia.assert(deletedArticle3);

  // Step 10: Validate third deletion
  TestValidator.predicate(
    "third article deletion sets deleted_at timestamp",
    deletedArticle3.deleted_at !== null &&
      deletedArticle3.deleted_at !== undefined,
  );
  TestValidator.equals(
    "third deleted article ID matches",
    deletedArticle3.id,
    article3.id,
  );
  TestValidator.equals(
    "third deleted article title preserved",
    deletedArticle3.title,
    article3.title,
  );

  // Step 11: Verify all three articles have valid deleted_at timestamps
  TestValidator.predicate(
    "all three articles successfully marked as deleted",
    deletedArticle1.deleted_at !== null &&
      deletedArticle2.deleted_at !== null &&
      deletedArticle3.deleted_at !== null,
  );
}
