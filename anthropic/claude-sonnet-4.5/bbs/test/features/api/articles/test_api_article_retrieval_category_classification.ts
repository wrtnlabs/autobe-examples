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
 * Test that article category information is correctly embedded in article
 * retrieval responses.
 *
 * This test validates that when retrieving an article, the category information
 * is complete and accurate, enabling proper topic organization and content
 * discovery. The test creates multiple categories across different topic areas
 * (Economic, Political, General) and verifies that articles maintain correct
 * category associations throughout their lifecycle.
 *
 * Process:
 *
 * 1. Create moderator account for category management
 * 2. Create multiple categories with different topics (Economic, Political,
 *    General)
 * 3. Create member account for article authoring
 * 4. Create articles assigned to different categories
 * 5. Retrieve each article and validate comprehensive category information
 * 6. Verify category.id, name, slug, description, sort_order, and timestamps
 * 7. Confirm articles maintain single category assignment
 * 8. Test category consistency across article lifecycle
 */
export async function test_api_article_retrieval_category_classification(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple categories with different topics
  const categoryTopics = [
    {
      name: "Economic Discussion",
      slug: "economic-discussion",
      description: "Topics related to economics, markets, and fiscal policy",
      sortOrder: 1,
    },
    {
      name: "Political Discussion",
      slug: "political-discussion",
      description: "Topics related to politics, governance, and elections",
      sortOrder: 2,
    },
    {
      name: "General Discussion",
      slug: "general-discussion",
      description: "General topics and miscellaneous discussions",
      sortOrder: 3,
    },
  ];

  const categories = await ArrayUtil.asyncMap(categoryTopics, async (topic) => {
    const category =
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: topic.name,
            slug: topic.slug,
            description: topic.description,
            sort_order: topic.sortOrder,
          } satisfies IDiscussionBoardArticleCategory.ICreate,
        },
      );
    typia.assert(category);
    return category;
  });

  // Step 3: Switch to member authentication
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create articles in different categories
  const articles = await ArrayUtil.asyncMap(categories, async (category) => {
    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_article_category_id: category.id,
          status: "published" as const,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    return { article, expectedCategory: category };
  });

  // Step 5: Retrieve each article and validate category information
  for (const { article, expectedCategory } of articles) {
    const retrievedArticle = await api.functional.discussionBoard.articles.at(
      connection,
      {
        articleId: article.id,
      },
    );
    typia.assert(retrievedArticle);

    // Validate category.id matches assigned category
    TestValidator.equals(
      "category ID matches assigned category",
      retrievedArticle.category.id,
      expectedCategory.id,
    );

    // Validate category.name reflects topic area correctly
    TestValidator.equals(
      "category name reflects topic area",
      retrievedArticle.category.name,
      expectedCategory.name,
    );

    // Validate category.slug is URL-friendly identifier
    TestValidator.equals(
      "category slug is URL-friendly",
      retrievedArticle.category.slug,
      expectedCategory.slug,
    );

    // Validate category.description provides topic guidance
    TestValidator.equals(
      "category description provides topic guidance",
      retrievedArticle.category.description,
      expectedCategory.description,
    );

    // Validate category.sort_order indicates display priority
    TestValidator.equals(
      "category sort_order indicates display priority",
      retrievedArticle.category.sort_order,
      expectedCategory.sort_order,
    );

    // Validate category timestamps match expected category
    TestValidator.equals(
      "category created_at matches expected",
      retrievedArticle.category.created_at,
      expectedCategory.created_at,
    );

    TestValidator.equals(
      "category updated_at matches expected",
      retrievedArticle.category.updated_at,
      expectedCategory.updated_at,
    );
  }

  // Step 6: Verify category consistency - retrieve articles again
  for (const { article, expectedCategory } of articles) {
    const secondRetrieval = await api.functional.discussionBoard.articles.at(
      connection,
      {
        articleId: article.id,
      },
    );
    typia.assert(secondRetrieval);

    TestValidator.equals(
      "category ID remains consistent across retrievals",
      secondRetrieval.category.id,
      expectedCategory.id,
    );

    TestValidator.equals(
      "category data remains consistent",
      secondRetrieval.category.name,
      expectedCategory.name,
    );
  }

  // Step 7: Confirm articles maintain single category assignment
  TestValidator.equals(
    "created correct number of articles",
    articles.length,
    categories.length,
  );

  TestValidator.predicate(
    "each article has exactly one category",
    articles.every(
      ({ article }) =>
        article.category !== null && article.category !== undefined,
    ),
  );
}
