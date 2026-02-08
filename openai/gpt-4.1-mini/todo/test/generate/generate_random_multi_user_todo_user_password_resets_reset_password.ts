import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserPasswordReset";
import type { IMultiUserTodoUserPasswordResetResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserPasswordResetResponse";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_multi_user_todo_user_password_reset } from "../prepare/prepare_random_multi_user_todo_user_password_reset";

export async function generate_random_multi_user_todo_user_password_resets_reset_password(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMultiUserTodoUserPasswordReset.ICreate> | undefined;
  },
): Promise<IMultiUserTodoUserPasswordResetResponse> {
  const prepared: IMultiUserTodoUserPasswordReset.ICreate =
    prepare_random_multi_user_todo_user_password_reset(props.body);
  const result: IMultiUserTodoUserPasswordResetResponse =
    await api.functional.multiUserTodo.user.password_resets.resetPassword(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
