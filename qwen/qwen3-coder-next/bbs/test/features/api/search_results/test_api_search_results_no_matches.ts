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

export async function test_api_search_results_no_matches(
  connection: api.IConnection,
): Promise<void> {
  // Query for non-existent search term that should return no results
  const output =
    await api.functional.discussionBoard.search.results.index(connection);
  typia.assert(output);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
    output.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 10", output.pagination.limit, 10);
  TestValidator.equals("pagination records is 0", output.pagination.records, 0);
  TestValidator.equals("pagination pages is 0", output.pagination.pages, 0);
  // Validate empty results array
  TestValidator.equals("results array is empty", output.data, []);
  // Validate that pages calculation is correct when records is 0
  TestValidator.equals(
    "pages is 0 when records is 0",
    output.pagination.pages,
    0,
  );
}
