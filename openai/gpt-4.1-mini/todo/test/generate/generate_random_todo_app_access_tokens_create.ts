import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import { prepare_random_todo_app_access_token } from "../prepare/prepare_random_todo_app_access_token";
export async function generate_random_todo_app_access_tokens_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppAccessToken.ICreate> | undefined;
  },
): Promise<ITodoAppAccessToken> {
  const prepared: ITodoAppAccessToken.ICreate =
    prepare_random_todo_app_access_token(props.body);
  const result: ITodoAppAccessToken =
    await api.functional.todoApp.access_tokens.create(connection, {
      body: prepared,
    });
  return result;
}
