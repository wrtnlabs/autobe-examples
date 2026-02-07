import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchIndex";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_search_indices_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Execute search indices retrieval
  const result =
    await api.functional.discussionBoard.search.indices.index(connection);
  // Validate response structure with complete type validation
  typia.assert(result);
  // Validate pagination metadata exists and has correct types
  TestValidator.predicate("pagination exists", result.pagination !== undefined);
  TestValidator.predicate(
    "pagination.current is valid",
    result.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination.limit is valid",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records is valid",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is valid",
    result.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate("data array exists", result.data !== undefined);
  // Validate data array contains search index entries (even if empty array is valid)
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // Validate each search index entry has the expected structure (empty object in this case)
  result.data.forEach((index, i) => {
    TestValidator.predicate(
      `search index entry ${i} is object`,
      typeof index === "object" && index !== null && !Array.isArray(index),
    );
  });
}
