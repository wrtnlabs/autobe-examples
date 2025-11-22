import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionArticle";

export async function test_api_discussion_article_attachment_filtering(
  connection: api.IConnection,
) {
  // Test attachment filtering capability for discussion articles

  // Test 1: Filter articles with attachments (has_attachments=true)
  const articlesWithAttachments: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        has_attachments: true,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(articlesWithAttachments);

  // Validate response structure
  TestValidator.equals(
    "response has pagination info",
    articlesWithAttachments.pagination,
    {
      current: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
      limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
      records: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
      pages: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    },
  );

  // Test 2: Filter articles without attachments (has_attachments=false)
  const articlesWithoutAttachments: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        has_attachments: false,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(articlesWithoutAttachments);

  // Test 3: Get all articles without filtering (no has_attachments parameter)
  const allArticles: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(allArticles);

  // Validate that all responses have consistent structure
  TestValidator.equals(
    "all responses have data arrays",
    typeof allArticles.data,
    "object",
  );

  TestValidator.predicate(
    "articles with attachments response has data",
    Array.isArray(articlesWithAttachments.data),
  );

  TestValidator.predicate(
    "articles without attachments response has data",
    Array.isArray(articlesWithoutAttachments.data),
  );

  // Test 4: Combine attachment filter with other search parameters
  const filteredByCategory: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
        category: "Economic Policy",
        has_attachments: true,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(filteredByCategory);

  // Test 5: Test with search term and attachment filter
  const searchWithAttachments: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 1,
        limit: 15,
        search: "monetary policy",
        has_attachments: true,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(searchWithAttachments);

  // Test 6: Test pagination with attachment filter
  const paginatedWithAttachments: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 2,
        limit: 5,
        has_attachments: true,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(paginatedWithAttachments);

  // Validate pagination values
  TestValidator.equals(
    "pagination current page matches request",
    paginatedWithAttachments.pagination.current,
    2,
  );

  TestValidator.equals(
    "pagination limit matches request",
    paginatedWithAttachments.pagination.limit,
    5,
  );

  // Test 7: Validate article summary structure
  if (allArticles.data.length > 0) {
    const firstArticle = allArticles.data[0];
    TestValidator.equals(
      "article has required fields",
      typeof firstArticle.id,
      "string",
    );

    TestValidator.equals(
      "article title is string",
      typeof firstArticle.title,
      "string",
    );

    TestValidator.equals(
      "article category is string",
      typeof firstArticle.category,
      "string",
    );

    TestValidator.equals(
      "article status is string",
      typeof firstArticle.status,
      "string",
    );
  }
}
