import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusLog";
import type { IStatusLogMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IStatusLogMetadata";
import { prepare_random_discussion_board_status_log } from "../prepare/prepare_random_discussion_board_status_log";
export async function generate_random_discussion_board_status_logs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardStatusLog.ICreate> | undefined;
  },
): Promise<IDiscussionBoardStatusLog> {
  const prepared: IDiscussionBoardStatusLog.ICreate =
    prepare_random_discussion_board_status_log(props.body);
  return await api.functional.discussionBoard.status_logs.create(connection, {
    body: prepared,
  });
}
