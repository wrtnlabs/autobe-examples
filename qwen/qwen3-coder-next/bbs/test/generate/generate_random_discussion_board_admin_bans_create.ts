import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_bans_ban_record } from "../prepare/prepare_random_discussion_board_bans_ban_record";

export async function generate_random_discussion_board_admin_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardBansBanRecord.ICreate> | undefined;
  },
): Promise<IDiscussionBoardBansBanRecord> {
  const prepared: IDiscussionBoardBansBanRecord.ICreate =
    prepare_random_discussion_board_bans_ban_record(props.body);
  const result: IDiscussionBoardBansBanRecord =
    await api.functional.discussionBoard.admin.bans.create(connection, {
      body: prepared,
    });
  return result;
}
