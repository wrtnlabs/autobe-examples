import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { prepare_random_discussion_board_appeal } from "../prepare/prepare_random_discussion_board_appeal";
export async function generate_random_discussion_board_citizen_moderation_appeals_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardAppeal.ICreate> | undefined;
  },
): Promise<IDiscussionBoardAppeal> {
  const prepared: IDiscussionBoardAppeal.ICreate =
    prepare_random_discussion_board_appeal(props.body);
  return await api.functional.discussionBoard.citizen.moderation.appeals.create(
    connection,
    {
      body: prepared,
    },
  );
}
