import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchResult";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchResult";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_search_results_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve paginated search results
  const output =
    await api.functional.discussionBoard.search.results.index(connection);
  // Validate response structure with typia
  typia.assert(output);
  // Validate pagination structure
  TestValidator.equals("pagination exists", typeof output.pagination, "object");
  // Validate pagination properties
  TestValidator.predicate(
    "current page is positive integer",
    typeof output.pagination.current === "number" &&
      output.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit is positive integer",
    typeof output.pagination.limit === "number" && output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative integer",
    typeof output.pagination.records === "number" &&
      output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative integer",
    typeof output.pagination.pages === "number" && output.pagination.pages >= 0,
  );
  // Validate pagination mathematical relationships
  const expectedPages = Math.ceil(
    output.pagination.records / output.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation correct",
    output.pagination.pages,
    expectedPages,
  );
  // Validate data array exists
  TestValidator.equals("data array exists", Array.isArray(output.data), true);
  // Validate search result items structure
  if (output.data.length > 0) {
    const firstResult = output.data[0];
    TestValidator.equals(
      "first result is object",
      typeof firstResult,
      "object",
    );
    TestValidator.equals(
      "first result is not null",
      firstResult !== null,
      true,
    );
  }
}
