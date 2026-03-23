import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_trash_permanent_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<
      string & tags.Format<"email">
    >() satisfies string as string &
      tags.MinLength<1> &
      tags.MaxLength<255> &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16) satisfies string as string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Format<"password">,
    href: "https://example.com/register" satisfies string as string &
      tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string as string &
      tags.Format<"uri">,
    ip: "127.0.0.1" satisfies string as string & tags.Format<"ipv4">,
  } satisfies ITodoAppMemberSession.IJoin;
  const authResponse = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authResponse);
  // 2. Create authenticated connection
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    authorization: authResponse.token.access,
  };
  // 3. Create a new todo
  const todoInput = {
    title: RandomGenerator.name() satisfies string as string &
      tags.MinLength<1> &
      tags.MaxLength<500>,
    description: RandomGenerator.paragraph({
      sentences: 2,
    }) satisfies string as string | null,
    start_date: new Date().toISOString() satisfies string as
      | (string & tags.Format<"date-time">)
      | null,
    due_date: new Date(Date.now() + 86400000).toISOString() satisfies string as
      | (string & tags.Format<"date-time">)
      | null,
  } satisfies ITodoAppTodo.ICreate;
  const createdTodo = await api.functional.todoApp.member.todos.create(
    authenticatedConnection,
    { body: todoInput },
  );
  typia.assert(createdTodo);
  // Verify todo is not in trash initially
  TestValidator.equals(
    "todo not trashed initially",
    createdTodo.is_trashed,
    false,
  );
  // 4. Soft delete the todo to move it to trash
  await api.functional.todoApp.member.todos.erase(authenticatedConnection, {
    todoId: createdTodo.id,
  });
  // 5. Verify todo is now in trash (check is_trashed flag)
  const trashTodoInput = {
    title: RandomGenerator.name() satisfies string as string &
      tags.MinLength<1> &
      tags.MaxLength<500>,
    description: RandomGenerator.paragraph({
      sentences: 1,
    }) satisfies string as string | null,
  } satisfies ITodoAppTodo.ICreate;
  const trashTodo = await api.functional.todoApp.member.todos.create(
    authenticatedConnection,
    { body: trashTodoInput },
  );
  typia.assert(trashTodo);
  // Soft delete this todo to verify the endpoint works
  await api.functional.todoApp.member.todos.erase(authenticatedConnection, {
    todoId: trashTodo.id,
  });
  // 6. Permanently delete the todo from trash
  await api.functional.todoApp.member.trash.erase(authenticatedConnection, {
    todoId: trashTodo.id,
  });
  // 7. Verify the todo is completely removed (404)
  await TestValidator.error("todo permanently deleted", async () => {
    await api.functional.todoApp.member.trash.erase(authenticatedConnection, {
      todoId: trashTodo.id,
    });
  });
}
