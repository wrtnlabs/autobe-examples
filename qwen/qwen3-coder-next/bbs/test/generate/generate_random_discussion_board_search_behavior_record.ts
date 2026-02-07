import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchBehavior } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchBehavior";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_search_behavior } from "../prepare/prepare_random_discussion_board_search_behavior";

export async function generate_random_discussion_board_search_behavior_record(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSearchBehavior.ICreate> | undefined;
  },
): Promise<IDiscussionBoardSearchBehavior> {
  const prepared: IDiscussionBoardSearchBehavior.ICreate =
    prepare_random_discussion_board_search_behavior(props.body);
  const result: IDiscussionBoardSearchBehavior =
    await api.functional.discussionBoard.search.behavior.record(connection, {
      body: prepared,
    });
  return result;
}
