import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_user_ban } from "../prepare/prepare_random_discussion_board_user_ban";

export async function generate_random_discussion_board_super_admin_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardUserBan.ICreate>;
  },
): Promise<IDiscussionBoardUserBan> {
  const prepared: IDiscussionBoardUserBan.ICreate =
    prepare_random_discussion_board_user_ban(props.body);
  const result: IDiscussionBoardUserBan =
    await api.functional.discussionBoard.superAdmin.bans.create(connection, {
      body: prepared,
    });
  return result;
}
