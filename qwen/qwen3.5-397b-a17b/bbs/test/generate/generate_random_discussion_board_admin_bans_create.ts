import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_ban } from "../prepare/prepare_random_discussion_board_ban";

export async function generate_random_discussion_board_admin_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardBan.ICreate>;
  },
): Promise<IDiscussionBoardBan> {
  const prepared: IDiscussionBoardBan.ICreate =
    prepare_random_discussion_board_ban(props.body);
  const result: IDiscussionBoardBan =
    await api.functional.discussionBoard.admin.bans.create(connection, {
      body: prepared,
    });
  return result;
}
