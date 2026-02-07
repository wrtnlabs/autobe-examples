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

export async function test_api_search_analytics_aggregations(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for this test
  const adminConnection: api.IConnection = { host: connection.host };
  // Call the search analytics endpoint
  const result = await api.functional.discussionBoard.search.analytics(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardSearchAnalytic.IRequest>(),
    },
  );
  // Validate complete response structure with full type checking
  typia.assert(result);
  // Validate essential structural properties
  TestValidator.predicate("pagination exists", result.pagination !== null);
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  // Validate pagination values are non-negative
  TestValidator.predicate("current page valid", result.pagination.current >= 0);
  TestValidator.predicate("limit valid", result.pagination.limit >= 0);
  TestValidator.predicate(
    "records count valid",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pages count valid", result.pagination.pages >= 0);
  // Validate each analytics summary in the data array
  for (const analytics of result.data) {
    typia.assert(analytics);
  }
}
