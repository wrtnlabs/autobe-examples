import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { prepare_random_discussion_board_member_session } from "../prepare/prepare_random_discussion_board_member_session";
export async function generate_random_discussion_board_admin_members_sessions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardMemberSession.ICreate> | undefined;
    params: {
      memberId: string;
    };
  },
): Promise<IDiscussionBoardMemberSession> {
  const prepared: IDiscussionBoardMemberSession.ICreate =
    prepare_random_discussion_board_member_session(props.body);
  return await api.functional.discussionBoard.admin.members.sessions.create(
    connection,
    {
      body: prepared,
      memberId: props.params.memberId,
    },
  );
}
