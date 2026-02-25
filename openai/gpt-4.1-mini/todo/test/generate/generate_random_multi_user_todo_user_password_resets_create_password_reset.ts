import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_multi_user_todo_user_password_reset } from "../prepare/prepare_random_multi_user_todo_user_password_reset";

export async function generate_random_multi_user_todo_user_password_resets_create_password_reset(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMultiUserTodoUserPasswordReset.ICreate> | undefined;
  },
): Promise<void> {
  const prepared: IMultiUserTodoUserPasswordReset.ICreate =
    prepare_random_multi_user_todo_user_password_reset(props.body);
  return await api.functional.multiUserTodo.user.password_resets.createPasswordReset(
    connection,
    {
      body: prepared,
    },
  );
}
