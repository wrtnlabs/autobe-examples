import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardRegisteredUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_registered_user_password_reset } from "../prepare/prepare_random_discussion_board_registered_user_password_reset";

export async function generate_random_discussion_board_registered_user_password_resets_create_password_reset(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IDiscussionBoardRegisteredUserPasswordReset.ICreate>
      | undefined;
  },
): Promise<IDiscussionBoardRegisteredUserPasswordReset.ICreate> {
  const prepared: IDiscussionBoardRegisteredUserPasswordReset.ICreate =
    prepare_random_discussion_board_registered_user_password_reset(props.body);
  return await api.functional.discussionBoard.registeredUser.passwordResets.createPasswordReset(
    connection,
    {
      body: prepared,
    },
  );
}
