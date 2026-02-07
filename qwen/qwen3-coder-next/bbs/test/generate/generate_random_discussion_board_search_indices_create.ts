import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_search_index } from "../prepare/prepare_random_discussion_board_search_index";

export async function generate_random_discussion_board_search_indices_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSearchIndex.ICreate> | undefined;
  },
): Promise<IDiscussionBoardSearchIndex> {
  const prepared: IDiscussionBoardSearchIndex.ICreate =
    prepare_random_discussion_board_search_index(props.body);
  return await api.functional.discussionBoard.search.indices.create(
    connection,
    {
      body: prepared,
    },
  );
}
