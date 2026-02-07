import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_todo_user_password_reset } from "../prepare/prepare_random_todo_user_password_reset";

export async function generate_random_todo_user_password_resets_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoUserPasswordReset.ICreate> | undefined;
  },
): Promise<ITodoUserPasswordReset> {
  const prepared: ITodoUserPasswordReset.ICreate =
    prepare_random_todo_user_password_reset(props.body);
  const result: ITodoUserPasswordReset =
    await api.functional.todo.user.password_resets.create(connection, {
      body: prepared,
    });
  return result;
}
