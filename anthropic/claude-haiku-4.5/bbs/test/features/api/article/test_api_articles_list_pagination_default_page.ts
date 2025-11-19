import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

export async function test_api_articles_list_pagination_default_page(
  connection: api.IConnection,
) {
  // Call the articles index API without specifying page or limit parameters
  // This should use default values: page 1 and limit 20
  const response: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {} satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(response);

  // Verify the pagination metadata reflects default values
  // Default page should be 1
  TestValidator.equals(
    "current page should default to 1",
    response.pagination.current,
    1,
  );

  // Default limit should be 20
  TestValidator.equals(
    "limit should default to 20",
    response.pagination.limit,
    20,
  );

  // Verify pagination properties are valid non-negative integers
  TestValidator.predicate(
    "total records count should be non-negative",
    response.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages should be non-negative",
    response.pagination.pages >= 0,
  );

  // Verify data array exists and is an array
  TestValidator.predicate(
    "data array should be defined and be an array",
    Array.isArray(response.data),
  );

  // Verify returned articles do not exceed the limit
  TestValidator.predicate(
    "returned articles count should not exceed limit",
    response.data.length <= response.pagination.limit,
  );

  // If articles exist, verify they have required summary fields
  if (response.data.length > 0) {
    const firstArticle = response.data[0];
    TestValidator.predicate(
      "article summary should have an id",
      typeof firstArticle.id === "string" && firstArticle.id.length > 0,
    );

    TestValidator.predicate(
      "article summary should have a title",
      typeof firstArticle.title === "string" && firstArticle.title.length > 0,
    );
  }
}
