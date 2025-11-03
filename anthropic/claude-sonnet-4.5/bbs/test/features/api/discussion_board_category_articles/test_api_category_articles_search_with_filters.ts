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

export async function test_api_category_articles_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    href: "https://test.example.com/register",
    referrer: "https://test.example.com/home",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a test category
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create multiple test articles with different characteristics
  const baseDate = new Date();
  const articles: IDiscussionBoardArticle[] = [];

  // Article 1: Recent article with keyword "economy"
  const article1Data = {
    title: "Economic Policy Analysis and Future Trends",
    body:
      RandomGenerator.content({ paragraphs: 3 }) +
      " economy economic monetary policy",
    summary: "Analysis of current economic trends",
    category_ids: [category.id],
    tag_ids: [],
    image_ids: [],
    document_ids: [],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article1 =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: article1Data,
    });
  typia.assert(article1);
  articles.push(article1);

  // Article 2: Article with keyword "policy"
  const article2Data = {
    title: "Political Policy Framework Discussion",
    body:
      RandomGenerator.content({ paragraphs: 2 }) +
      " policy political framework governance",
    summary: "Framework for political policies",
    category_ids: [category.id],
    tag_ids: [],
    image_ids: [],
    document_ids: [],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article2 =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: article2Data,
    });
  typia.assert(article2);
  articles.push(article2);

  // Article 3: Article without specific keywords
  const article3Data = {
    title: "General Discussion Board Guidelines",
    body:
      RandomGenerator.content({ paragraphs: 2 }) +
      " discussion guidelines community",
    summary: "Community discussion guidelines",
    category_ids: [category.id],
    tag_ids: [],
    image_ids: [],
    document_ids: [],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article3 =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: article3Data,
    });
  typia.assert(article3);
  articles.push(article3);

  // Step 4: Test basic category article listing without filters
  const allArticlesRequest = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardArticle.IRequest;

  const allArticlesResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.categories.articles.index(connection, {
      categorySlug: category.slug,
      body: allArticlesRequest,
    });
  typia.assert(allArticlesResult);

  TestValidator.equals(
    "all articles count should match created articles",
    allArticlesResult.pagination.records,
    articles.length,
  );

  TestValidator.predicate(
    "all articles should be returned in the list",
    allArticlesResult.data.length === articles.length,
  );

  // Step 5: Test keyword search for "economy"
  const economySearchRequest = {
    search: "economy",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticle.IRequest;

  const economySearchResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.categories.articles.index(connection, {
      categorySlug: category.slug,
      body: economySearchRequest,
    });
  typia.assert(economySearchResult);

  TestValidator.predicate(
    "economy search should return at least one article",
    economySearchResult.data.length >= 1,
  );

  const economyArticle = economySearchResult.data.find(
    (a) => a.id === article1.id,
  );
  TestValidator.predicate(
    "economy search should include article with economy keyword",
    economyArticle !== undefined,
  );

  // Step 6: Test keyword search for "policy"
  const policySearchRequest = {
    search: "policy",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticle.IRequest;

  const policySearchResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.categories.articles.index(connection, {
      categorySlug: category.slug,
      body: policySearchRequest,
    });
  typia.assert(policySearchResult);

  TestValidator.predicate(
    "policy search should return articles",
    policySearchResult.data.length >= 1,
  );

  // Step 7: Test pagination with limit
  const paginationRequest = {
    page: 1,
    limit: 2,
  } satisfies IDiscussionBoardArticle.IRequest;

  const paginationResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.categories.articles.index(connection, {
      categorySlug: category.slug,
      body: paginationRequest,
    });
  typia.assert(paginationResult);

  TestValidator.equals(
    "pagination should respect limit",
    paginationResult.data.length,
    2,
  );

  TestValidator.equals(
    "pagination total records should match",
    paginationResult.pagination.records,
    articles.length,
  );

  // Step 8: Test sorting by creation date descending (newest first)
  const sortDescRequest = {
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticle.IRequest;

  const sortDescResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.categories.articles.index(connection, {
      categorySlug: category.slug,
      body: sortDescRequest,
    });
  typia.assert(sortDescResult);

  TestValidator.predicate(
    "sorted results should return articles",
    sortDescResult.data.length === articles.length,
  );

  // Verify descending order - newest first
  if (sortDescResult.data.length >= 2) {
    const firstDate = new Date(sortDescResult.data[0].created_at);
    const secondDate = new Date(sortDescResult.data[1].created_at);

    TestValidator.predicate(
      "articles should be sorted by date descending",
      firstDate >= secondDate,
    );
  }

  // Step 9: Test sorting by creation date ascending (oldest first)
  const sortAscRequest = {
    sort_by: "created_at" as const,
    sort_order: "asc" as const,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticle.IRequest;

  const sortAscResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.categories.articles.index(connection, {
      categorySlug: category.slug,
      body: sortAscRequest,
    });
  typia.assert(sortAscResult);

  // Verify ascending order - oldest first
  if (sortAscResult.data.length >= 2) {
    const firstDate = new Date(sortAscResult.data[0].created_at);
    const secondDate = new Date(sortAscResult.data[1].created_at);

    TestValidator.predicate(
      "articles should be sorted by date ascending",
      firstDate <= secondDate,
    );
  }

  // Step 10: Test combined filters - keyword search with pagination
  const combinedRequest = {
    search: "policy",
    page: 1,
    limit: 5,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardArticle.IRequest;

  const combinedResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.categories.articles.index(connection, {
      categorySlug: category.slug,
      body: combinedRequest,
    });
  typia.assert(combinedResult);

  TestValidator.predicate(
    "combined filters should return filtered results",
    combinedResult.data.length >= 1,
  );

  // Verify all returned articles belong to the correct category
  for (const articleSummary of allArticlesResult.data) {
    const hasCategory = articleSummary.categories.some(
      (c) => c.id === category.id,
    );
    TestValidator.predicate(
      "all articles should belong to the specified category",
      hasCategory,
    );
  }
}
