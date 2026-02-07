import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchBehavior } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchBehavior";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_discussion_board_search_behavior_record } from "../../../generate/generate_random_discussion_board_search_behavior_record";
import { prepare_random_discussion_board_search_behavior } from "../../../prepare/prepare_random_discussion_board_search_behavior";

export async function test_api_search_behavior_record_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for search behavior recording
  const actorConnection: api.IConnection = { host: connection.host };
  // Record search behavior analytics
  const behavior = await api.functional.discussionBoard.search.behavior.record(
    actorConnection,
    {
      body: typia.random<IDiscussionBoardSearchBehavior.ICreate>(),
    },
  );
  typia.assert(behavior);
}
