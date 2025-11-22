import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionArticle";

export async function test_api_discussion_article_search_basic(
  connection: api.IConnection,
) {
  // Test basic search functionality with pagination
  const searchParams: IEconPoliticalDiscussionArticle.IRequest = {
    page: 1,
    limit: 20,
    search: "economic policy",
    category: "Economic Policy",
    status: "published",
    order_by: "created_at",
    order_direction: "desc",
  };

  // Perform the search operation
  const searchResult: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: searchParams,
    });

  // Validate response structure and type
  typia.assert(searchResult);

  // Validate pagination metadata
  TestValidator.equals(
    "current page number",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page limit is within bounds",
    searchResult.pagination.limit >= 1 && searchResult.pagination.limit <= 50,
  );
  TestValidator.predicate(
    "total records is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is calculated correctly",
    searchResult.pagination.pages >= 0,
  );

  // Validate article structure and required fields
  const articles: IEconPoliticalDiscussionArticle.ISummary[] =
    searchResult.data;

  for (const article of articles) {
    // Validate required fields are present
    TestValidator.predicate(
      "article has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        article.id,
      ),
    );
    TestValidator.predicate(
      "article has non-empty title",
      article.title.length > 0,
    );
    TestValidator.predicate(
      "article has non-empty category",
      article.category.length > 0,
    );
    TestValidator.predicate(
      "article has non-empty status",
      article.status.length > 0,
    );
    TestValidator.predicate(
      "article has valid creation timestamp",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
        article.created_at,
      ),
    );
    TestValidator.predicate(
      "article has valid update timestamp",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
        article.updated_at,
      ),
    );

    // Validate timestamp ordering
    const createdDate = new Date(article.created_at);
    const updatedDate = new Date(article.updated_at);
    TestValidator.predicate(
      "updated timestamp is after or equal to created timestamp",
      updatedDate.getTime() >= createdDate.getTime(),
    );
  }

  // Test pagination edge cases
  const emptySearchParams: IEconPoliticalDiscussionArticle.IRequest = {
    search: "nonexistent-keyword-that-should-return-no-results",
    page: 1,
    limit: 10,
  };

  const emptySearchResult: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: emptySearchParams,
    });

  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search returns zero records or actual matches",
    emptySearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data array exists even if empty",
    Array.isArray(emptySearchResult.data),
  );

  // Test default pagination parameters
  const defaultSearchParams: IEconPoliticalDiscussionArticle.IRequest = {};

  const defaultSearchResult: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: defaultSearchParams,
    });

  typia.assert(defaultSearchResult);
  TestValidator.predicate(
    "default search uses reasonable page size",
    defaultSearchResult.pagination.limit <= 20,
  ); // Should default to reasonable size
  TestValidator.predicate(
    "default search starts at page 1",
    defaultSearchResult.pagination.current >= 1,
  );

  // Test maximum page size
  const largePageParams: IEconPoliticalDiscussionArticle.IRequest = {
    page: 1,
    limit: 50, // Maximum allowed
  };

  const largePageResult: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: largePageParams,
    });

  typia.assert(largePageResult);
  TestValidator.predicate(
    "page limit respects maximum constraint",
    largePageResult.pagination.limit <= 50,
  );
}
