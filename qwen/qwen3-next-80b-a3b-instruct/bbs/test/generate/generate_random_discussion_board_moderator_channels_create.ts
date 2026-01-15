import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import { prepare_random_discussion_board_channel } from "../prepare/prepare_random_discussion_board_channel";
export async function generate_random_discussion_board_moderator_channels_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardChannel.ICreate> | undefined;
  },
): Promise<IDiscussionBoardChannel> {
  const prepared: IDiscussionBoardChannel.ICreate =
    prepare_random_discussion_board_channel(props.body);
  return await api.functional.discussionBoard.moderator.channels.create(
    connection,
    {
      body: prepared,
    },
  );
}
