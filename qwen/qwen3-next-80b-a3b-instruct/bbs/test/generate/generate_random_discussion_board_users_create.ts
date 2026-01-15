import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_user } from "../prepare/prepare_random_discussion_board_user";
export async function generate_random_discussion_board_users_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardUser.ICreate> | undefined;
  },
): Promise<IDiscussionBoardUser> {
  const prepared: IDiscussionBoardUser.ICreate =
    prepare_random_discussion_board_user(props.body);
  return await api.functional.discussionBoard.users.create(connection, {
    body: prepared,
  });
}
