import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { prepare_random_discussion_board_admin_session } from "../prepare/prepare_random_discussion_board_admin_session";
export async function generate_random_discussion_board_admin_admins_sessions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardAdminSession.ICreate> | undefined;
    params: {
      adminId: string;
    };
  },
): Promise<IDiscussionBoardAdminSession> {
  const prepared: IDiscussionBoardAdminSession.ICreate =
    prepare_random_discussion_board_admin_session(props.body);
  return await api.functional.discussionBoard.admin.admins.sessions.create(
    connection,
    {
      body: prepared,
      adminId: props.params.adminId,
    },
  );
}
