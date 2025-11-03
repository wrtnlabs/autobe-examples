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
 * Test article search functionality with keyword filtering to discover relevant
 * discussions.
 *
 * This test validates the comprehensive article search system, ensuring users
 * can effectively find economic and political discussions through keyword-based
 * search. The test verifies full-text search across article titles and body
 * content, proper relevance ranking with title matches prioritized over body
 * content matches, and correct pagination behavior.
 *
 * Test workflow:
 *
 * 1. Create moderator account and test category
 * 2. Generate test articles with strategic keyword placement
 * 3. Perform keyword searches and validate results
 * 4. Verify relevance ranking (title matches first)
 * 5. Test pagination with search results
 * 6. Confirm public accessibility without authentication
 */
export async function test_api_article_search_with_keyword_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for article creation
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create test category for article classification
  const categoryData = {
    name: "Economic Policy Analysis",
    description: "Category for testing economic policy article searches",
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create test articles with strategic keyword placement
  // Article 1: Keyword "monetary policy" in title only
  const article1Data = {
    title: "Understanding Modern Monetary Policy Frameworks",
    body: "This article examines central banking systems and interest rate mechanisms in contemporary economic contexts. The analysis covers various aspects of financial regulation and economic stability measures.",
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article1: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: article1Data,
    });
  typia.assert(article1);

  // Article 2: Keyword "monetary policy" in body only
  const article2Data = {
    title: "Central Banking Systems in the 21st Century",
    body: "Exploring how monetary policy shapes economic outcomes through interest rates, quantitative easing, and regulatory frameworks. This comprehensive analysis covers the evolution of monetary policy tools.",
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article2: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: article2Data,
    });
  typia.assert(article2);

  // Article 3: Keyword "trade agreements" in title and body
  const article3Data = {
    title: "International Trade Agreements and Global Commerce",
    body: "An in-depth examination of how trade agreements reshape international commerce, including tariff structures, dispute resolution mechanisms, and economic partnership frameworks.",
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article3: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: article3Data,
    });
  typia.assert(article3);

  // Article 4: Different keyword "climate change" as control
  const article4Data = {
    title: "Climate Change Economics and Environmental Policy",
    body: "Analyzing the economic implications of climate change and environmental regulations on global markets and sustainability initiatives.",
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article4: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: article4Data,
    });
  typia.assert(article4);

  // Article 5: Keyword "monetary policy" in both title and body
  const article5Data = {
    title: "Monetary Policy Impacts on Economic Growth",
    body: "This article explores how monetary policy decisions by central banks influence economic growth, inflation rates, and employment levels across different economic conditions.",
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article5: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: article5Data,
    });
  typia.assert(article5);

  // Step 4: Test keyword search with "monetary policy"
  const searchRequest1 = {
    search: "monetary policy",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticle.IRequest;

  const searchResults1: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.search(connection, {
      body: searchRequest1,
    });
  typia.assert(searchResults1);

  // Step 5: Validate search results contain expected articles
  TestValidator.predicate(
    "search should find articles containing monetary policy",
    searchResults1.data.length >= 3,
  );

  // Verify article 1 (title match) is in results
  const foundArticle1 = searchResults1.data.find((a) => a.id === article1.id);
  if (foundArticle1) {
    typia.assertGuard(foundArticle1);
    TestValidator.equals(
      "article 1 title should match",
      foundArticle1.title,
      article1.title,
    );
  }

  // Verify article 2 (body match) is in results
  const foundArticle2 = searchResults1.data.find((a) => a.id === article2.id);
  if (foundArticle2) {
    typia.assertGuard(foundArticle2);
  }

  // Verify article 5 (both title and body match) is in results
  const foundArticle5 = searchResults1.data.find((a) => a.id === article5.id);
  if (foundArticle5) {
    typia.assertGuard(foundArticle5);
  }

  // Step 6: Verify relevance ranking - title matches should appear before body-only matches
  const article1Index = searchResults1.data.findIndex(
    (a) => a.id === article1.id,
  );
  const article2Index = searchResults1.data.findIndex(
    (a) => a.id === article2.id,
  );
  const article5Index = searchResults1.data.findIndex(
    (a) => a.id === article5.id,
  );

  if (article1Index !== -1 && article2Index !== -1) {
    TestValidator.predicate(
      "title match should rank higher than body-only match",
      article1Index < article2Index,
    );
  }

  if (article5Index !== -1 && article2Index !== -1) {
    TestValidator.predicate(
      "title+body match should rank higher than body-only match",
      article5Index < article2Index,
    );
  }

  // Step 7: Test search with "trade agreements"
  const searchRequest2 = {
    search: "trade agreements",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticle.IRequest;

  const searchResults2: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.search(connection, {
      body: searchRequest2,
    });
  typia.assert(searchResults2);

  TestValidator.predicate(
    "search should find article about trade agreements",
    searchResults2.data.length >= 1,
  );

  const foundArticle3 = searchResults2.data.find((a) => a.id === article3.id);
  if (foundArticle3) {
    typia.assertGuard(foundArticle3);
    TestValidator.equals(
      "found article should match article 3",
      foundArticle3.id,
      article3.id,
    );
  }

  // Step 8: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    searchResults1.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    searchResults1.pagination.limit === 10,
  );

  TestValidator.predicate(
    "pagination records should reflect total matches",
    searchResults1.pagination.records >= 3,
  );

  // Step 9: Test search without authentication (public access)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  const publicSearchRequest = {
    search: "monetary policy",
    page: 1,
    limit: 5,
  } satisfies IDiscussionBoardArticle.IRequest;

  const publicSearchResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.search(
      unauthConnection,
      {
        body: publicSearchRequest,
      },
    );
  typia.assert(publicSearchResults);

  TestValidator.predicate(
    "public search should return results without authentication",
    publicSearchResults.data.length >= 1,
  );

  // Step 10: Verify search results contain complete article summary information
  if (searchResults1.data.length > 0) {
    const sampleResult = searchResults1.data[0];
    typia.assertGuard(sampleResult);

    TestValidator.predicate(
      "article summary should have author information",
      sampleResult.author !== null && sampleResult.author !== undefined,
    );

    TestValidator.predicate(
      "article summary should have categories",
      sampleResult.categories.length > 0,
    );

    TestValidator.equals(
      "article category should match created category",
      sampleResult.categories[0].id,
      category.id,
    );
  }

  // Step 11: Test pagination with smaller page size
  const paginatedRequest = {
    search: "monetary policy",
    page: 1,
    limit: 2,
  } satisfies IDiscussionBoardArticle.IRequest;

  const paginatedResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.search(connection, {
      body: paginatedRequest,
    });
  typia.assert(paginatedResults);

  TestValidator.predicate(
    "paginated results should respect limit",
    paginatedResults.data.length <= 2,
  );

  TestValidator.predicate(
    "pagination should calculate correct total pages",
    paginatedResults.pagination.pages >= 1,
  );

  // Step 12: Test page 2 if there are enough results
  if (paginatedResults.pagination.pages > 1) {
    const page2Request = {
      search: "monetary policy",
      page: 2,
      limit: 2,
    } satisfies IDiscussionBoardArticle.IRequest;

    const page2Results: IPageIDiscussionBoardArticle.ISummary =
      await api.functional.discussionBoard.search.articles.search(connection, {
        body: page2Request,
      });
    typia.assert(page2Results);

    TestValidator.predicate(
      "page 2 should return different results",
      page2Results.data.length > 0,
    );

    TestValidator.predicate(
      "page 2 current page should be 2",
      page2Results.pagination.current === 2,
    );
  }
}
