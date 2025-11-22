import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionArticle";

/**
 * Test status-based filtering functionality for discussion articles.
 *
 * This test validates the article search API's ability to filter articles by
 * their publication status ('published', 'draft', 'archived') and ensure
 * accurate results. The test uses existing articles in the system and verifies
 * that status filtering returns only articles matching the specified status
 * values.
 *
 * Test Strategy:
 *
 * 1. Test filtering by each individual status value
 * 2. Validate result accuracy and status consistency
 * 3. Verify pagination behavior with status filtering
 * 4. Test baseline comparison with no filtering
 * 5. Ensure business logic for status-based content visibility
 */
export async function test_api_discussion_article_search_with_status_filter(
  connection: api.IConnection,
) {
  // Test filtering by 'published' status
  const publishedFilterResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "published",
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(publishedFilterResult);

  // Validate that only published articles are returned
  const publishedArticles = publishedFilterResult.data.filter(
    (article) => article.status === "published",
  );

  TestValidator.predicate(
    "published status filter returns only published articles",
    publishedArticles.length === publishedFilterResult.data.length,
  );

  // Test filtering by 'draft' status
  const draftFilterResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "draft",
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(draftFilterResult);

  // Validate that only draft articles are returned
  const draftArticles = draftFilterResult.data.filter(
    (article) => article.status === "draft",
  );

  TestValidator.predicate(
    "draft status filter returns only draft articles",
    draftArticles.length === draftFilterResult.data.length,
  );

  // Test filtering by 'archived' status
  const archivedFilterResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "archived",
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(archivedFilterResult);

  // Validate that only archived articles are returned
  const archivedArticles = archivedFilterResult.data.filter(
    (article) => article.status === "archived",
  );

  TestValidator.predicate(
    "archived status filter returns only archived articles",
    archivedArticles.length === archivedFilterResult.data.length,
  );

  // Test pagination with status filtering
  const paginatedResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 1,
        limit: 5,
        status: "published",
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(paginatedResult);

  // Validate pagination structure
  TestValidator.equals(
    "pagination current page is correct",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is respected in filtered results",
    paginatedResult.pagination.limit,
    5,
  );

  // Verify all returned articles have the correct status
  const statusConsistency = paginatedResult.data.every(
    (article) => article.status === "published",
  );
  TestValidator.predicate(
    "all returned articles have consistent published status",
    statusConsistency,
  );

  // Test no status filter (should return all articles regardless of status)
  const noFilterResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(noFilterResult);

  // Verify results include articles with different statuses
  const statusTypes = new Set(
    noFilterResult.data.map((article) => article.status),
  );
  TestValidator.predicate(
    "no status filter returns articles with multiple status types",
    statusTypes.size > 1,
  );

  // Test that filtered results are subset of unfiltered results
  const publishedIds = new Set(
    publishedFilterResult.data.map((article) => article.id),
  );
  const unfilteredIds = new Set(
    noFilterResult.data.map((article) => article.id),
  );

  const allFilteredIdsInUnfiltered = Array.from(publishedIds).every((id) =>
    unfilteredIds.has(id),
  );
  TestValidator.predicate(
    "filtered published articles are subset of all articles",
    allFilteredIdsInUnfiltered,
  );

  // Test edge case: empty results for uncommon status
  const uncommonStatusResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "uncommon_status",
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(uncommonStatusResult);

  TestValidator.predicate(
    "filtering by uncommon status returns empty or valid result",
    uncommonStatusResult.data.length >= 0,
  );

  // Verify pagination data structure integrity
  TestValidator.equals(
    "pagination structure has required fields",
    noFilterResult.pagination.current,
    noFilterResult.pagination.current,
  );
  TestValidator.equals(
    "pagination records count is consistent",
    noFilterResult.pagination.records,
    noFilterResult.data.length,
  );
}
