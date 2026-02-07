import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_flag } from "../prepare/prepare_random_discussion_board_flag";

export async function generate_random_discussion_board_super_admin_moderation_flags_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardFlag.ICreate> | undefined;
  },
): Promise<IDiscussionBoardFlag> {
  const prepared: IDiscussionBoardFlag.ICreate =
    prepare_random_discussion_board_flag(props.body);
  return await api.functional.discussionBoard.superAdmin.moderation.flags.create(
    connection,
    {
      body: prepared,
    },
  );
}
