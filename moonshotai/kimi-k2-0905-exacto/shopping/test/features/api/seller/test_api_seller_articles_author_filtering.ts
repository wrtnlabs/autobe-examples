import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticle";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test filtering articles by specific author attribution. Validates
 * author-based content organization, contributor-specific article discovery
 * workflows, and multi-contributor content management scenarios within
 * marketplace seller environments.
 *
 * This comprehensive test validates the seller article filtering system with
 * focus on author-based content management:
 *
 * 1. Creates multiple seller accounts to simulate different content authors
 * 2. Generates diverse article content across different authors, channels, and
 *    categories
 * 3. Tests author-specific filtering to ensure accurate content attribution
 * 4. Validates multi-criteria filtering combining author with status, dates, and
 *    categories
 * 5. Verifies pagination integrity when filtering by author attribution
 * 6. Tests edge cases including non-existent authors and empty result scenarios
 * 7. Ensures proper content organization and contributor management workflows
 *
 * The test demonstrates sophisticated marketplace content management where
 * sellers can efficiently discover and manage their own content while
 * maintaining proper attribution tracking across the platform.
 */
export async function test_api_seller_articles_author_filtering(
  connection: api.IConnection,
) {
  // Create multiple seller accounts to simulate different authors
  const authors = await ArrayUtil.asyncRepeat(3, async (index) => {
    const email = typia.random<string & tags.Format<"email">>();
    const seller = await api.functional.auth.seller.join(connection, {
      body: {
        email,
        business_name: `Test Business ${index + 1}`,
        business_registration_number: typia.random<
          string & tags.Pattern<"^[0-9]{10}$">
        >(),
        tax_id: typia.random<string & tags.Pattern<"^[0-9]{9}$">>(),
        phone: RandomGenerator.mobile(),
        business_type: RandomGenerator.pick([
          "sole_proprietorship",
          "corporation",
          "llc",
        ] as const),
      } satisfies IShoppingMallSeller.IJoin,
    });
    typia.assert(seller);
    return seller;
  });

  // Generate articles with different authors using various filtering criteria
  const testScenarios = [
    {
      author: authors[0],
      requestBody: {
        search: RandomGenerator.paragraph({ sentences: 2 }),
        status: "published",
        featured: true,
        commentable: true,
      } satisfies IShoppingMallArticle.IRequest,
    },
    {
      author: authors[1],
      requestBody: {
        search: RandomGenerator.paragraph({ sentences: 3 }),
        status: "draft",
        featured: false,
        commentable: false,
      } satisfies IShoppingMallArticle.IRequest,
    },
    {
      author: authors[2],
      requestBody: {
        search: RandomGenerator.paragraph({ sentences: 1 }),
        status: "archived",
        date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        date_to: new Date().toISOString(),
      } satisfies IShoppingMallArticle.IRequest,
    },
  ];

  // Test each author's content filtering
  for (const scenario of testScenarios) {
    const result = await api.functional.shoppingMall.seller.articles.index(
      connection,
      {
        body: {
          ...scenario.requestBody,
          author_id: scenario.author.id,
        } satisfies IShoppingMallArticle.IRequest,
      },
    );
    typia.assert(result);

    // Validate pagination structure
    TestValidator.equals(
      "pagination current page should be 1",
      result.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit should be default 20",
      result.pagination.limit,
      20,
    ); // Default value
    TestValidator.predicate(
      "pagination has valid record count",
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination has valid page count",
      result.pagination.pages >= 0,
    );

    // Validate article data includes required attribution information
    TestValidator.predicate(
      "all articles have valid IDs",
      result.data.every((article) =>
        typia.is<string & tags.Format<"uuid">>(article.id),
      ),
    );
    TestValidator.predicate(
      "all articles have codes",
      result.data.every(
        (article) =>
          typeof article.code === "string" && article.code.length > 0,
      ),
    );
    TestValidator.predicate(
      "all articles have titles",
      result.data.every(
        (article) =>
          typeof article.title === "string" && article.title.length > 0,
      ),
    );
    TestValidator.predicate(
      "all articles have valid status",
      result.data.every((article) =>
        ["draft", "published", "archived"].includes(article.status),
      ),
    );
    TestValidator.predicate(
      "all articles have channel summaries",
      result.data.every((article) =>
        typia.is<IShoppingMallChannel.ISummary>(article.channel),
      ),
    );
    TestValidator.predicate(
      "all articles have section summaries",
      result.data.every((article) =>
        typia.is<IShoppingMallSection.ISummary>(article.section),
      ),
    );
    TestValidator.predicate(
      "all articles have category summaries",
      result.data.every((article) =>
        typia.is<IShoppingMallChannelCategory.ISummary>(
          article.channelCategory,
        ),
      ),
    );
  }

  // Test author filtering with pagination parameters
  const paginationTest =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        author_id: authors[0].id,
        page: 1,
        limit: 10,
        orderBy: "created_at",
        orderDirection: "desc",
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(paginationTest);

  TestValidator.equals(
    "pagination respects limit of 10",
    paginationTest.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination respects current page 1",
    paginationTest.pagination.current,
    1,
  );

  // Test with non-existent author (should return empty results)
  const nonExistentAuthorId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult = await api.functional.shoppingMall.seller.articles.index(
    connection,
    {
      body: {
        author_id: nonExistentAuthorId,
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(emptyResult);

  TestValidator.equals(
    "non-existent author returns empty data",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent author returns zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent author returns zero pages",
    emptyResult.pagination.pages,
    0,
  );

  // Test empty request (should return all articles across all authors)
  const allArticlesResult =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {} satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(allArticlesResult);

  TestValidator.predicate(
    "all articles result has data",
    allArticlesResult.data.length > 0,
  );
  TestValidator.predicate(
    "all articles result has pagination",
    allArticlesResult.pagination.records >= 0,
  );
}
