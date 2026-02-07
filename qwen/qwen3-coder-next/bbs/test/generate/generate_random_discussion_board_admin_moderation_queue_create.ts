import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_bans_appeal } from "../prepare/prepare_random_discussion_board_bans_appeal";

export async function generate_random_discussion_board_admin_moderation_queue_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardBansAppeal.ICreate> | undefined;
    params: {
      banRecordId: string;
    };
  },
): Promise<IDiscussionBoardBansAppeal> {
  const prepared: IDiscussionBoardBansAppeal.ICreate =
    prepare_random_discussion_board_bans_appeal(props.body);
  return await api.functional.discussionBoard.admin.moderation.queue.create(
    connection,
    {
      body: prepared,
      banRecordId: props.params.banRecordId,
    },
  );
}
