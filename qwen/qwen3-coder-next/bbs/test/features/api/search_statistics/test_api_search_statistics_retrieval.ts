import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchQuery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_search_statistics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for authenticated user
  const userConnection: api.IConnection = { host: connection.host };
  // Retrieve search statistics with random request parameters
  const stats =
    await api.functional.discussionBoard.search.queries.statistics.indexStatistics(
      userConnection,
      {
        body: typia.random<IDiscussionBoardSearchQuery.IRequest>(),
      },
    );
  typia.assert(stats);
}
