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

export async function test_api_todo_creation_minimum_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: "https://example.com/register",
        referrer: "https://example.com/",
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Create a todo with only the title (minimum fields)
  const todo: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Buy groceries",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Validate the todo response
  TestValidator.equals("title", todo.title, "Buy groceries");
  TestValidator.equals(
    "completed_at is null (incomplete by default)",
    todo.completed_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null (active by default)",
    todo.deleted_at,
    null,
  );
  TestValidator.equals(
    "description is null (not provided)",
    todo.description,
    null,
  );
  TestValidator.equals(
    "start_date is null (not provided)",
    todo.start_date,
    null,
  );
  TestValidator.equals("due_date is null (not provided)", todo.due_date, null);
  TestValidator.predicate(
    "id is a valid UUID",
    /^[0-9a-f-]{36}$/i.test(todo.id),
  );
  TestValidator.predicate("created_at is populated", !!todo.created_at);
  TestValidator.predicate("updated_at is populated", !!todo.updated_at);
  TestValidator.equals(
    "member id matches authenticated member",
    todo.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member email matches authenticated member",
    todo.member.email,
    authorized.email,
  );
}
