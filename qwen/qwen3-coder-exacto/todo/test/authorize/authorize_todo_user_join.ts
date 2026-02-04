import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
export async function authorize_todo_user_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppTodoUser.IJoin>;
  },
): Promise<ITodoAppTodoUser.IAuthorized> {
  const joinInput = {
    email:
      props.body?.email ??
      `todo-user-${RandomGenerator.alphaNumeric(16)}@wrtn.io`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? "https://todo.wrtn.io/register",
    referrer: props.body?.referrer ?? "https://todo.wrtn.io",
    ip: props.body?.ip ?? null,
  } satisfies ITodoAppTodoUser.IJoin;
  return await api.functional.todoApp.auth.todo_user.join(connection, {
    body: joinInput,
  });
}
