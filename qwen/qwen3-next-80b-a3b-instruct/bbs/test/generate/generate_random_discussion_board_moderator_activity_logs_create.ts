import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";
import type { IDiscussionBoardActivityLogMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLogMetadata";
import { prepare_random_discussion_board_activity_log } from "../prepare/prepare_random_discussion_board_activity_log";
export async function generate_random_discussion_board_moderator_activity_logs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardActivityLog.ICreate> | undefined;
  },
): Promise<IDiscussionBoardActivityLog> {
  const Prepared: IDiscussionBoardActivityLog.ICreate =
    prepare_random_discussion_board_activity_log(props.body);
  const result: IDiscussionBoardActivityLog =
    await api.functional.discussionBoard.moderator.activity_logs.create(
      connection,
      {
        body: Prepared,
      },
    );
  return result;
}
