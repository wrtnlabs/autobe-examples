import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { prepare_random_discussion_board_moderation_action } from "../prepare/prepare_random_discussion_board_moderation_action";
export async function generate_random_discussion_board_moderator_moderation_actions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardModerationAction.ICreate> | undefined;
  },
): Promise<IDiscussionBoardModerationAction> {
  const prepared: IDiscussionBoardModerationAction.ICreate =
    prepare_random_discussion_board_moderation_action(props.body);
  return await api.functional.discussionBoard.moderator.moderation.actions.create(
    connection,
    {
      body: prepared,
    },
  );
}
