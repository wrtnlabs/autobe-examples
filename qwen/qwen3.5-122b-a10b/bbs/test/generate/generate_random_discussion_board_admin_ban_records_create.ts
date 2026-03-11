import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_ban_record } from "../prepare/prepare_random_discussion_board_ban_record";

export async function generate_random_discussion_board_admin_ban_records_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardBanRecord.ICreate>;
  },
): Promise<IDiscussionBoardBanRecord> {
  const prepared: IDiscussionBoardBanRecord.ICreate =
    prepare_random_discussion_board_ban_record(props.body);
  const result: IDiscussionBoardBanRecord =
    await api.functional.discussionBoard.admin.ban_records.create(connection, {
      body: prepared,
    });
  return result;
}
