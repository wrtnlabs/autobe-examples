import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_system_message } from "../prepare/prepare_random_discussion_board_system_message";

export async function generate_random_discussion_board_administrator_system_messages_create_system_message(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSystemMessage.ICreate> | undefined;
  },
): Promise<IDiscussionBoardSystemMessage> {
  const prepared: IDiscussionBoardSystemMessage.ICreate =
    prepare_random_discussion_board_system_message(props.body);
  return await api.functional.discussionBoard.administrator.systemMessages.createSystemMessage(
    connection,
    {
      body: prepared,
    },
  );
}
