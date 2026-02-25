import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUnban";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_unban } from "../prepare/prepare_random_discussion_board_unban";

export async function generate_random_discussion_board_unbans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardUnban.ICreate>;
  },
): Promise<IDiscussionBoardUnban> {
  const prepared: IDiscussionBoardUnban.ICreate =
    prepare_random_discussion_board_unban(props.body);
  const result: IDiscussionBoardUnban =
    await api.functional.discussionBoard.unbans.create(connection, {
      body: prepared,
    });
  return result;
}
