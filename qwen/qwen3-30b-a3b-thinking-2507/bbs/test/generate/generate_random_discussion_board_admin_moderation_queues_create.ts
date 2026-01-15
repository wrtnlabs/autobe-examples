import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationQueue";
import { prepare_random_discussion_board_moderation_queue } from "../prepare/prepare_random_discussion_board_moderation_queue";
export async function generate_random_discussion_board_admin_moderation_queues_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardModerationQueue.ICreate> | undefined;
  },
): Promise<IDiscussionBoardModerationQueue> {
  const prepared: IDiscussionBoardModerationQueue.ICreate =
    prepare_random_discussion_board_moderation_queue(props.body);
  return await api.functional.discussionBoard.admin.moderation.queues.create(
    connection,
    {
      body: prepared,
    },
  );
}
