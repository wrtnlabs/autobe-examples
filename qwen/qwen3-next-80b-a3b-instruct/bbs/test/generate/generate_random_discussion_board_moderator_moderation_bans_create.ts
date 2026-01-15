import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { prepare_random_discussion_board_ban } from "../prepare/prepare_random_discussion_board_ban";
export async function generate_random_discussion_board_moderator_moderation_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardBan.ICreate> | undefined;
  },
): Promise<IDiscussionBoardBan> {
  const prepared: IDiscussionBoardBan.ICreate =
    prepare_random_discussion_board_ban(props.body);
  return await api.functional.discussionBoard.moderator.moderation.bans.create(
    connection,
    {
      body: prepared,
    },
  );
}
