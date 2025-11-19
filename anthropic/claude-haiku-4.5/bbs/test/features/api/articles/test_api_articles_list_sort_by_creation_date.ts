import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

export async function test_api_articles_list_sort_by_creation_date(
  connection: api.IConnection,
) {
  // Test ascending order (oldest first by creation date)
  const ascendingResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        orderBy: "createdAt",
        order: "asc",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(ascendingResult);

  // Test descending order (newest first by creation date)
  const descendingResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        orderBy: "createdAt",
        order: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(descendingResult);

  // Verify both results have valid pagination info
  TestValidator.predicate(
    "ascending order pagination should have valid records count",
    ascendingResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "descending order pagination should have valid records count",
    descendingResult.pagination.records >= 0,
  );

  // If there are articles to compare
  if (ascendingResult.data.length > 1) {
    // Verify that first article in descending matches last article in ascending
    TestValidator.equals(
      "descending first article id should match ascending last article id",
      descendingResult.data[0].id,
      ascendingResult.data[ascendingResult.data.length - 1].id,
    );
  }

  // If there are articles, verify the second article in descending matches second-to-last in ascending
  if (ascendingResult.data.length > 2 && descendingResult.data.length > 2) {
    TestValidator.equals(
      "descending second article id should match ascending second-to-last article id",
      descendingResult.data[1].id,
      ascendingResult.data[ascendingResult.data.length - 2].id,
    );
  }

  // Test pagination with smaller limit
  const paginatedResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        orderBy: "createdAt",
        order: "asc",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(paginatedResult);

  TestValidator.predicate(
    "paginated result should respect requested limit",
    paginatedResult.data.length <= 5,
  );

  TestValidator.equals(
    "pagination limit should match requested limit",
    paginatedResult.pagination.limit,
    5,
  );

  TestValidator.equals(
    "pagination current page should be 1",
    paginatedResult.pagination.current,
    1,
  );

  // Test descending order with pagination
  const paginatedDescending =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 5,
        orderBy: "createdAt",
        order: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(paginatedDescending);

  TestValidator.predicate(
    "paginated descending result should respect requested limit",
    paginatedDescending.data.length <= 5,
  );

  // Verify that when sorting by createdAt with asc/desc, the results are in opposite order
  if (paginatedResult.data.length > 0 && paginatedDescending.data.length > 0) {
    TestValidator.equals(
      "ascending first article should match descending last article when paginated",
      paginatedResult.data[0].id,
      paginatedDescending.data[paginatedDescending.data.length - 1].id,
    );
  }
}
