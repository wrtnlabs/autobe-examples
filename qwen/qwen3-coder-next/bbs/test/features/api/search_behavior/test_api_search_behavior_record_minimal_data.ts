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

export async function test_api_search_behavior_record_minimal_data(
  connection: api.IConnection,
): Promise<void> {
  // Create a user-specific connection for authentication
  const userConnection: api.IConnection = { host: connection.host };
  // Prepare minimal search behavior data (only required fields)
  const behaviorData = typia.random<IDiscussionBoardSearchBehavior.ICreate>();
  // Record search behavior with minimal data
  const result = await api.functional.discussionBoard.search.behavior.record(
    userConnection,
    { body: behaviorData },
  );
  typia.assert(result);
}
