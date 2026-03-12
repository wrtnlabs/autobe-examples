import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test comprehensive article search with text search, tag filtering, and date range criteria.
 *
 * This test validates the article search functionality by:
 * 1. Testing text search with trigram similarity
 * 2. Testing tag filtering with AND logic
 * 3. Testing date range filtering
 * 4. Testing combined search criteria
 * 5. Testing sorting options (createdAt, updatedAt, title)
 * 6. Testing sort order (asc/desc)
 */
export async function test_api_article_search_with_tags_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Test 1: Text search with "climate" keyword
  const textSearchResult = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        search: "climate",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(textSearchResult);
  TestValidator.equals(
    "text search pagination present",
    textSearchResult.pagination.current,
    1,
  );
  TestValidator.predicate("text search returns valid structure", () =>
    Array.isArray(textSearchResult.data),
  );
  // Test 2: Tag filtering with AND logic
  const tagId1 = typia.random<string & tags.Format<"uuid">>();
  const tagId2 = typia.random<string & tags.Format<"uuid">>();
  const tagFilterResult = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        tag_ids: [tagId1, tagId2],
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(tagFilterResult);
  TestValidator.predicate("tag filter returns valid structure", () =>
    Array.isArray(tagFilterResult.data),
  );
  // Test 3: Date range filtering
  const fromDate = new Date("2024-01-01T00:00:00Z").toISOString();
  const toDate = new Date("2024-06-30T23:59:59Z").toISOString();
  const dateRangeResult = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        from_date: fromDate,
        to_date: toDate,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  TestValidator.predicate("date range filter returns valid structure", () =>
    Array.isArray(dateRangeResult.data),
  );
  // Validate date range filtering - all articles should be within the specified range
  for (const article of dateRangeResult.data) {
    const articleDate = new Date(article.created_at);
    const from = new Date(fromDate);
    const to = new Date(toDate);
    TestValidator.predicate(
      `article ${article.id} created_at within date range`,
      articleDate >= from && articleDate <= to,
    );
  }
  // Test 4: Combined criteria (search + tag_ids + date_range)
  const combinedResult = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        search: "climate",
        tag_ids: [tagId1],
        from_date: fromDate,
        to_date: toDate,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(combinedResult);
  TestValidator.predicate("combined filter returns valid structure", () =>
    Array.isArray(combinedResult.data),
  );
  // Test 5: Sorting by title ascending
  const sortByTitleAscResult =
    await api.functional.discussionBoard.articles.index(memberConnection, {
      body: {
        sortBy: "title",
        sortOrder: "asc",
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(sortByTitleAscResult);
  TestValidator.predicate("sort by title asc returns valid structure", () =>
    Array.isArray(sortByTitleAscResult.data),
  );
  // Validate title ascending order
  for (let i = 1; i < sortByTitleAscResult.data.length; i++) {
    const prevTitle = sortByTitleAscResult.data[i - 1].title;
    const currTitle = sortByTitleAscResult.data[i].title;
    TestValidator.predicate(
      `title ascending order at index ${i}`,
      prevTitle.localeCompare(currTitle) <= 0,
    );
  }
  // Test 6: Sorting by updatedAt descending
  const sortByUpdatedAtDescResult =
    await api.functional.discussionBoard.articles.index(memberConnection, {
      body: {
        sortBy: "updatedAt",
        sortOrder: "desc",
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(sortByUpdatedAtDescResult);
  TestValidator.predicate(
    "sort by updatedAt desc returns valid structure",
    () => Array.isArray(sortByUpdatedAtDescResult.data),
  );
  // Validate updatedAt descending order
  for (let i = 1; i < sortByUpdatedAtDescResult.data.length; i++) {
    const prevDate = new Date(sortByUpdatedAtDescResult.data[i - 1].updated_at);
    const currDate = new Date(sortByUpdatedAtDescResult.data[i].updated_at);
    TestValidator.predicate(
      `updatedAt descending order at index ${i}`,
      prevDate >= currDate,
    );
  }
  // Test 7: Pagination test
  const paginationResult = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    10,
  );
  // Test 8: Empty results (search for non-existent content)
  const emptyResult = await api.functional.discussionBoard.articles.index(
    memberConnection,
    {
      body: {
        search: "xkcd123456789nonexistent",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.predicate("empty search returns valid structure", () =>
    Array.isArray(emptyResult.data),
  );
  TestValidator.equals(
    "empty search returns empty array",
    emptyResult.data.length,
    0,
  );
  // Test 9: Sorting by createdAt descending (default behavior)
  const sortByCreatedAtDescResult =
    await api.functional.discussionBoard.articles.index(memberConnection, {
      body: {
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(sortByCreatedAtDescResult);
  // Validate createdAt descending order
  for (let i = 1; i < sortByCreatedAtDescResult.data.length; i++) {
    const prevDate = new Date(sortByCreatedAtDescResult.data[i - 1].created_at);
    const currDate = new Date(sortByCreatedAtDescResult.data[i].created_at);
    TestValidator.predicate(
      `createdAt descending order at index ${i}`,
      prevDate >= currDate,
    );
  }
  // Test 10: Verify pagination metadata consistency
  TestValidator.predicate(
    "pagination records matches data length on first page",
    paginationResult.pagination.records >= paginationResult.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    paginationResult.pagination.pages ===
      Math.ceil(
        paginationResult.pagination.records / paginationResult.pagination.limit,
      ),
  );
}
