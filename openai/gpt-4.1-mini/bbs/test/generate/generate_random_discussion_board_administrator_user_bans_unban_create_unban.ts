import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_user_unban } from "../prepare/prepare_random_discussion_board_user_unban";

export async function generate_random_discussion_board_administrator_user_bans_unban_create_unban(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardUserUnban.ICreate> | undefined;
    params: {
      banId: string;
    };
  },
): Promise<IDiscussionBoardUserUnban> {
  const prepared: IDiscussionBoardUserUnban.ICreate =
    prepare_random_discussion_board_user_unban(props.body);
  const result: IDiscussionBoardUserUnban =
    await api.functional.discussionBoard.administrator.userBans.unban.createUnban(
      connection,
      {
        banId: props.params.banId,
        body: prepared,
      },
    );
  return result;
}
