import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardAuthenticationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthenticationLog";
import { prepare_random_discussion_board_authentication_log } from "../prepare/prepare_random_discussion_board_authentication_log";
export async function generate_random_discussion_board_citizen_authentication_logs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardAuthenticationLog.ICreate> | undefined;
  },
): Promise<IDiscussionBoardAuthenticationLog> {
  const prepared: IDiscussionBoardAuthenticationLog.ICreate =
    prepare_random_discussion_board_authentication_log(props.body);
  return await api.functional.discussionBoard.citizen.authentication_logs.create(
    connection,
    {
      body: prepared,
    },
  );
}
