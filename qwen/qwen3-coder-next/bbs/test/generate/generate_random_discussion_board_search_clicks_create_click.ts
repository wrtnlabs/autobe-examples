import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchClick } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchClick";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_search_click } from "../prepare/prepare_random_discussion_board_search_click";

export async function generate_random_discussion_board_search_clicks_create_click(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSearchClick.ICreate> | undefined;
  },
): Promise<IDiscussionBoardSearchClick> {
  const prepared: IDiscussionBoardSearchClick.ICreate =
    prepare_random_discussion_board_search_click(props.body);
  return await api.functional.discussionBoard.search.clicks.createClick(
    connection,
    {
      body: prepared,
    },
  );
}
