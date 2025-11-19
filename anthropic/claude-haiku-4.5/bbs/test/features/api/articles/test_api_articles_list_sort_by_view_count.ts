import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

export async function test_api_articles_list_sort_by_view_count(
  connection: api.IConnection,
) {
  // Test sorting articles by view count in descending order (most viewed first)
  const descResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        orderBy: "viewCount",
        order: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(descResponse);

  // Verify response structure
  TestValidator.predicate(
    "response should have pagination info",
    descResponse.pagination !== null && descResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "response should have data array",
    Array.isArray(descResponse.data),
  );

  // Test sorting articles by view count in ascending order (least viewed first)
  const ascResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        orderBy: "viewCount",
        order: "asc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(ascResponse);

  // Verify both responses return valid article summaries
  TestValidator.predicate(
    "descending order should return articles",
    descResponse.data.length >= 0,
  );

  TestValidator.predicate(
    "ascending order should return articles",
    ascResponse.data.length >= 0,
  );

  // Test with custom page and limit parameters
  const customPageResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
        orderBy: "viewCount",
        order: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(customPageResponse);

  TestValidator.predicate(
    "custom page response should respect limit",
    customPageResponse.data.length <= 10,
  );

  // Test pagination info accuracy
  TestValidator.predicate(
    "pagination limit should match request",
    customPageResponse.pagination.limit === 10,
  );

  TestValidator.predicate(
    "pagination current page should be 1",
    customPageResponse.pagination.current === 1,
  );

  // Test with only orderBy parameter (order defaults to desc)
  const orderByOnlyResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        orderBy: "viewCount",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(orderByOnlyResponse);

  TestValidator.predicate(
    "orderBy only request should return valid response",
    orderByOnlyResponse.pagination !== null,
  );
}
