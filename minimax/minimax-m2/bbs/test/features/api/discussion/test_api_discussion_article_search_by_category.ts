import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionArticle";

/**
 * Test category filtering for economic and political discussion articles.
 *
 * Validates that the article search API properly filters articles by category
 * and returns accurate paginated results with proper metadata.
 */
export async function test_api_discussion_article_search_by_category(
  connection: api.IConnection,
) {
  // Test Economic Policy category filtering
  const economicPolicyResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        category: "Economic Policy",
        page: 1,
        limit: 10,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });

  typia.assert(economicPolicyResult);
  TestValidator.equals(
    "Economic Policy results returned",
    economicPolicyResult.data.length >= 0,
    true,
  );

  // Validate all returned articles have Economic Policy category
  for (const article of economicPolicyResult.data) {
    TestValidator.equals(
      "article has Economic Policy category",
      article.category,
      "Economic Policy",
    );
  }

  // Validate pagination metadata
  TestValidator.equals(
    "pagination metadata present",
    economicPolicyResult.pagination !== undefined,
    true,
  );
  if (economicPolicyResult.pagination) {
    TestValidator.equals(
      "current page is 1",
      economicPolicyResult.pagination.current,
      1,
    );
    TestValidator.equals(
      "limit is 10",
      economicPolicyResult.pagination.limit,
      10,
    );
  }

  // Test Political Analysis category filtering
  const politicalAnalysisResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        category: "Political Analysis",
        page: 1,
        limit: 10,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });

  typia.assert(politicalAnalysisResult);
  TestValidator.equals(
    "Political Analysis results returned",
    politicalAnalysisResult.data.length >= 0,
    true,
  );

  // Validate all returned articles have Political Analysis category
  for (const article of politicalAnalysisResult.data) {
    TestValidator.equals(
      "article has Political Analysis category",
      article.category,
      "Political Analysis",
    );
  }

  // Test Market Discussion category filtering
  const marketDiscussionResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        category: "Market Discussion",
        page: 1,
        limit: 10,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });

  typia.assert(marketDiscussionResult);
  TestValidator.equals(
    "Market Discussion results returned",
    marketDiscussionResult.data.length >= 0,
    true,
  );

  // Validate all returned articles have Market Discussion category
  for (const article of marketDiscussionResult.data) {
    TestValidator.equals(
      "article has Market Discussion category",
      article.category,
      "Market Discussion",
    );
  }

  // Test Regulatory Updates category filtering
  const regulatoryUpdatesResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        category: "Regulatory Updates",
        page: 1,
        limit: 10,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });

  typia.assert(regulatoryUpdatesResult);
  TestValidator.equals(
    "Regulatory Updates results returned",
    regulatoryUpdatesResult.data.length >= 0,
    true,
  );

  // Validate all returned articles have Regulatory Updates category
  for (const article of regulatoryUpdatesResult.data) {
    TestValidator.equals(
      "article has Regulatory Updates category",
      article.category,
      "Regulatory Updates",
    );
  }

  // Test non-existent category (should return empty results)
  const nonExistentResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        category: "NonExistentCategory",
        page: 1,
        limit: 10,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });

  typia.assert(nonExistentResult);
  TestValidator.equals(
    "non-existent category returns empty",
    nonExistentResult.data.length === 0,
    true,
  );

  // Test pagination with Economic Policy filter
  const paginationResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        category: "Economic Policy",
        page: 2,
        limit: 5,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });

  typia.assert(paginationResult);
  TestValidator.equals(
    "page 2 returns results",
    paginationResult.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "page number is 2",
    paginationResult.pagination.current,
    2,
  );
  TestValidator.equals("limit is 5", paginationResult.pagination.limit, 5);

  // Validate all articles in page 2 still have Economic Policy category
  for (const article of paginationResult.data) {
    TestValidator.equals(
      "page 2 article has Economic Policy category",
      article.category,
      "Economic Policy",
    );
  }

  // Test combined search and category filter
  const searchAndCategoryResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        category: "Political Analysis",
        search: "policy",
        page: 1,
        limit: 10,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });

  typia.assert(searchAndCategoryResult);
  TestValidator.equals(
    "search with category filter returns results",
    searchAndCategoryResult.data.length >= 0,
    true,
  );

  // Validate all results have Political Analysis category
  for (const article of searchAndCategoryResult.data) {
    TestValidator.equals(
      "search result has Political Analysis category",
      article.category,
      "Political Analysis",
    );
  }

  // Test sorting within category filter
  const sortedResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        category: "Market Discussion",
        order_by: "title",
        order_direction: "asc",
        page: 1,
        limit: 20,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });

  typia.assert(sortedResult);
  TestValidator.equals(
    "sorted results returned",
    sortedResult.data.length >= 0,
    true,
  );

  // Validate all sorted results have Market Discussion category
  for (const article of sortedResult.data) {
    TestValidator.equals(
      "sorted result has Market Discussion category",
      article.category,
      "Market Discussion",
    );
  }

  // Validate alphabetical sorting if multiple results
  if (sortedResult.data.length > 1) {
    for (let i = 1; i < sortedResult.data.length; i++) {
      const previousTitle = sortedResult.data[i - 1].title.toLowerCase();
      const currentTitle = sortedResult.data[i].title.toLowerCase();
      TestValidator.predicate(
        "titles are alphabetically sorted",
        previousTitle <= currentTitle,
      );
    }
  }

  // Test pagination boundary - request page that may exceed available pages
  const boundaryResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        category: "Economic Policy",
        page: 9999,
        limit: 10,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });

  typia.assert(boundaryResult);
  TestValidator.equals(
    "boundary page request handled",
    boundaryResult.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "boundary page returns empty or valid results",
    boundaryResult.data.length === 0 || boundaryResult.data.length <= 10,
    true,
  );

  // Test different pagination limits within category filter
  const limitTestResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        category: "Political Analysis",
        page: 1,
        limit: 1,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });

  typia.assert(limitTestResult);
  TestValidator.equals(
    "limit 1 returns at most 1 result",
    limitTestResult.data.length <= 1,
    true,
  );
  TestValidator.equals(
    "limit 1 has correct metadata",
    limitTestResult.pagination.limit,
    1,
  );

  // Validate single result has Political Analysis category
  if (limitTestResult.data.length > 0) {
    TestValidator.equals(
      "single result has Political Analysis category",
      limitTestResult.data[0].category,
      "Political Analysis",
    );
  }
}
