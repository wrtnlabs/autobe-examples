import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { prepare_random_todo_app_user_password_reset } from "../prepare/prepare_random_todo_app_user_password_reset";
export async function generate_random_todo_app_user_password_resets_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppUserPasswordReset.ICreate> | undefined;
  },
): Promise<ITodoAppUserPasswordReset> {
  const prepared: ITodoAppUserPasswordReset.ICreate =
    prepare_random_todo_app_user_password_reset(props.body);
  const result: ITodoAppUserPasswordReset =
    await api.functional.todoApp.user_password_resets.create(connection, {
      body: prepared,
    });
  return result;
}
