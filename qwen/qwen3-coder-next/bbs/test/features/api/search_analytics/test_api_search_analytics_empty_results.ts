import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSearchAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_search_analytics_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Call the search analytics API with empty results scenario
  const result = await api.functional.discussionBoard.search.analytics(
    connection,
    {
      body: {},
    },
  );
  typia.assert(result);
  // Validate response structure even with empty data
  TestValidator.equals("pagination exists", result.pagination !== null, true);
  TestValidator.equals("data is array", Array.isArray(result.data), true);
  TestValidator.equals("pagination records is 0", result.pagination.records, 0);
  TestValidator.equals("pagination pages is 0", result.pagination.pages, 0);
  TestValidator.equals("data length is 0", result.data.length, 0);
}
