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

export async function test_api_search_analytics_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for the request
  const actorConnection: api.IConnection = { host: connection.host };
  // Test search analytics pagination
  const result = await api.functional.discussionBoard.search.analytics(
    actorConnection,
    {
      body: typia.random<IDiscussionBoardSearchAnalytic.IRequest>(),
    },
  );
  typia.assert(result);
}
