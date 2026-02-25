import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_moderation_action_type } from "../prepare/prepare_random_discussion_board_moderation_action_type";

export async function generate_random_discussion_board_super_admin_moderation_action_types_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IDiscussionBoardModerationActionType.ICreate>
      | undefined;
  },
): Promise<IDiscussionBoardModerationActionType> {
  const prepared: IDiscussionBoardModerationActionType.ICreate =
    prepare_random_discussion_board_moderation_action_type(props.body);
  return await api.functional.discussionBoard.superAdmin.moderation_action_types.create(
    connection,
    {
      body: prepared,
    },
  );
}
