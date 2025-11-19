import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

export async function test_api_articles_list_filter_by_pinned_status_true(
  connection: api.IConnection,
) {
  // Create search request filtering for pinned articles only
  const request = {
    page: 1,
    limit: 20,
    isPinned: true,
  } satisfies IDiscussionBoardArticle.IRequest;

  // Call the article list API with pinned status filter
  const response = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: request,
    },
  );

  // Validate complete response structure and all type constraints
  typia.assert(response);

  // Verify the pagination metadata is consistent
  TestValidator.predicate(
    "pagination current page should match request",
    response.pagination.current === request.page,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    response.pagination.limit === request.limit,
  );

  // Verify articles array is properly structured
  TestValidator.predicate(
    "all articles should have required id and title fields",
    response.data.every((article) => article.id && article.title),
  );

  // Verify response contains articles or appropriately returns empty
  TestValidator.predicate(
    "articles array exists and is valid",
    Array.isArray(response.data),
  );
}
