import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_ban_appeal } from "../prepare/prepare_random_discussion_board_ban_appeal";

export async function generate_random_discussion_board_user_ban_records_appeals_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardBanAppeal.ICreate>;
    params: {
      banRecordId: string;
    };
  },
): Promise<IDiscussionBoardBanAppeal> {
  const prepared: IDiscussionBoardBanAppeal.ICreate =
    prepare_random_discussion_board_ban_appeal(props.body);
  const result: IDiscussionBoardBanAppeal =
    await api.functional.discussionBoard.user.ban_records.appeals.create(
      connection,
      {
        banRecordId: props.params.banRecordId,
        body: prepared,
      },
    );
  return result;
}
