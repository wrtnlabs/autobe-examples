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

import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_trash_detail_view_own_deleted_todo(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(member);
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        start_at: typia.random<string & tags.Format<"date-time">>(),
        due_at: typia.random<string & tags.Format<"date-time">>(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  const trashTodo = await api.functional.todoApp.member.todos.trash.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(trashTodo);
  TestValidator.equals("todo id", trashTodo.id, todo.id);
  TestValidator.equals("owner id", trashTodo.member.id, member.id);
  TestValidator.equals("owner email", trashTodo.member.email, member.email);
  TestValidator.equals("title", trashTodo.title, todo.title);
  TestValidator.equals("description", trashTodo.description, todo.description);
  TestValidator.equals("start_at", trashTodo.start_at, todo.start_at);
  TestValidator.equals("due_at", trashTodo.due_at, todo.due_at);
  TestValidator.equals(
    "is_completed",
    trashTodo.is_completed,
    todo.is_completed,
  );
  TestValidator.predicate("deleted_at is set", trashTodo.deleted_at !== null);
  TestValidator.equals("created_at", trashTodo.created_at, todo.created_at);
}
