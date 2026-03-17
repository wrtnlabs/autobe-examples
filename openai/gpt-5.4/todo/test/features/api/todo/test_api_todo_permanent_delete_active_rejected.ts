import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

export async function test_api_todo_permanent_delete_active_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "authorized member email matches join input",
    authorized.email,
    joinBody.email,
  );
  const todoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  } satisfies ITodoAppTodo.ICreate;
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: todoBody,
    },
  );
  typia.assert(todo);
  TestValidator.equals(
    "todo title matches create input",
    todo.title,
    todoBody.title,
  );
  TestValidator.equals(
    "todo description matches create input",
    todo.description,
    todoBody.description ?? null,
  );
  TestValidator.equals("todo is active before erase", todo.deleted_at, null);
  TestValidator.equals("todo is incomplete on creation", todo.completed, false);
  TestValidator.equals(
    "todo completion timestamp absent",
    todo.completed_at,
    null,
  );
  await TestValidator.error(
    "permanent delete rejects active todo",
    async () => {
      await api.functional.todoApp.member.todos.erase(memberConnection, {
        todoId: todo.id,
      });
    },
  );
}
