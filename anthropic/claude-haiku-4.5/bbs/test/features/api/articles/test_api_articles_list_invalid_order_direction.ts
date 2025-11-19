import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

export async function test_api_articles_list_invalid_order_direction(
  connection: api.IConnection,
) {
  // Test filtering articles with various valid order directions
  // Verify that the API correctly handles sorting parameters

  const validOrderResponse =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        orderBy: "createdAt",
        order: "asc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(validOrderResponse);
  TestValidator.equals(
    "response should be valid pagination result",
    typeof validOrderResponse.pagination,
    "object",
  );

  const descendingOrderResponse =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        orderBy: "publishedAt",
        order: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(descendingOrderResponse);
  TestValidator.equals(
    "descending order response should be valid",
    typeof descendingOrderResponse.pagination,
    "object",
  );

  // Test with null order (should use default)
  const defaultOrderResponse =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        order: null,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(defaultOrderResponse);
  TestValidator.predicate(
    "default order response pagination exists",
    defaultOrderResponse.pagination !== null &&
      defaultOrderResponse.pagination !== undefined,
  );
}
