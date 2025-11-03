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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test filtering a member's articles by specific categories.
 *
 * This test validates the category filtering functionality for member articles.
 * It creates a member account, multiple categories, and articles with different
 * category assignments, then verifies that the category filter returns only
 * articles matching the specified categories.
 *
 * Steps:
 *
 * 1. Create a member account for authoring articles
 * 2. Create multiple categories (3 distinct categories)
 * 3. Create articles with different category combinations
 * 4. Filter articles by single category and verify results
 * 5. Filter articles by multiple categories and verify results
 * 6. Validate that only matching articles are returned
 */
export async function test_api_member_articles_with_filtering_by_category(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Test1234!@#$",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create three distinct categories
  const categoryA =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Economics ${RandomGenerator.alphaNumeric(6)}`,
          description: "Economic policy and analysis",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(categoryA);

  const categoryB =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Politics ${RandomGenerator.alphaNumeric(6)}`,
          description: "Political analysis and commentary",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(categoryB);

  const categoryC =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Trade ${RandomGenerator.alphaNumeric(6)}`,
          description: "International trade discussions",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(categoryC);

  // Step 3: Create articles with different category combinations
  // Article 1: Only Category A
  const article1 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: `Article Economics ${RandomGenerator.alphaNumeric(5)}`,
        body: RandomGenerator.content({ paragraphs: 2 }),
        category_ids: [categoryA.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);

  // Article 2: Only Category B
  const article2 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: `Article Politics ${RandomGenerator.alphaNumeric(5)}`,
        body: RandomGenerator.content({ paragraphs: 2 }),
        category_ids: [categoryB.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);

  // Article 3: Categories A and B
  const article3 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: `Article Mixed AB ${RandomGenerator.alphaNumeric(5)}`,
        body: RandomGenerator.content({ paragraphs: 2 }),
        category_ids: [categoryA.id, categoryB.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article3);

  // Article 4: Only Category C
  const article4 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: `Article Trade ${RandomGenerator.alphaNumeric(5)}`,
        body: RandomGenerator.content({ paragraphs: 2 }),
        category_ids: [categoryC.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article4);

  // Step 4: Filter by single category (Category A)
  const filterByCategoryA =
    await api.functional.discussionBoard.members.articles.index(connection, {
      memberUsername: member.username,
      body: {
        category_slugs: [categoryA.slug],
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(filterByCategoryA);

  // Validate: Should return article1 and article3 (both have Category A)
  TestValidator.equals(
    "filtered by category A should return 2 articles",
    filterByCategoryA.data.length,
    2,
  );

  const categoryAArticleIds = filterByCategoryA.data.map((a) => a.id);
  TestValidator.predicate(
    "article1 should be in category A results",
    categoryAArticleIds.includes(article1.id),
  );
  TestValidator.predicate(
    "article3 should be in category A results",
    categoryAArticleIds.includes(article3.id),
  );

  // Step 5: Filter by multiple categories (Category A and Category C)
  const filterByMultipleCategories =
    await api.functional.discussionBoard.members.articles.index(connection, {
      memberUsername: member.username,
      body: {
        category_slugs: [categoryA.slug, categoryC.slug],
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(filterByMultipleCategories);

  // Validate: Should return article1, article3 (Category A), and article4 (Category C)
  TestValidator.equals(
    "filtered by categories A and C should return 3 articles",
    filterByMultipleCategories.data.length,
    3,
  );

  const multiCategoryArticleIds = filterByMultipleCategories.data.map(
    (a) => a.id,
  );
  TestValidator.predicate(
    "article1 should be in multi-category results",
    multiCategoryArticleIds.includes(article1.id),
  );
  TestValidator.predicate(
    "article3 should be in multi-category results",
    multiCategoryArticleIds.includes(article3.id),
  );
  TestValidator.predicate(
    "article4 should be in multi-category results",
    multiCategoryArticleIds.includes(article4.id),
  );

  // Step 6: Filter by Category B only
  const filterByCategoryB =
    await api.functional.discussionBoard.members.articles.index(connection, {
      memberUsername: member.username,
      body: {
        category_slugs: [categoryB.slug],
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(filterByCategoryB);

  // Validate: Should return article2 and article3 (both have Category B)
  TestValidator.equals(
    "filtered by category B should return 2 articles",
    filterByCategoryB.data.length,
    2,
  );

  const categoryBArticleIds = filterByCategoryB.data.map((a) => a.id);
  TestValidator.predicate(
    "article2 should be in category B results",
    categoryBArticleIds.includes(article2.id),
  );
  TestValidator.predicate(
    "article3 should be in category B results",
    categoryBArticleIds.includes(article3.id),
  );
}
