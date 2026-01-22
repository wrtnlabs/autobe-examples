import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRefreshToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { prepare_random_todo_app_refresh_token } from "../prepare/prepare_random_todo_app_refresh_token";
export async function generate_random_todo_app_guest_refresh_tokens_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppRefreshToken.ICreate> | undefined;
  },
): Promise<ITodoAppRefreshToken> {
  const prepared: ITodoAppRefreshToken.ICreate =
    prepare_random_todo_app_refresh_token(props.body);
  return await api.functional.todoApp.guest.refresh_tokens.create(connection, {
    body: prepared,
  });
}
