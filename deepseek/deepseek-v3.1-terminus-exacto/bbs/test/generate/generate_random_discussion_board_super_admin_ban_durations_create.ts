import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_ban_duration } from "../prepare/prepare_random_discussion_board_ban_duration";

export async function generate_random_discussion_board_super_admin_ban_durations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardBanDuration.ICreate>;
  },
): Promise<IDiscussionBoardBanDuration> {
  const prepared: IDiscussionBoardBanDuration.ICreate =
    prepare_random_discussion_board_ban_duration(props.body);
  const result: IDiscussionBoardBanDuration =
    await api.functional.discussionBoard.superAdmin.ban_durations.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
