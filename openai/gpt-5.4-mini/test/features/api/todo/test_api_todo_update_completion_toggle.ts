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

export async function test_api_todo_update_completion_toggle(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.todoApp.auth.member.join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  const title = RandomGenerator.name();
  const description = RandomGenerator.paragraph({ sentences: 2 });
  const start_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const due_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title,
        description,
        start_at,
        due_at,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals("new todo starts incomplete", todo.is_completed, false);
  TestValidator.equals("todo title preserved on create", todo.title, title);
  TestValidator.equals(
    "todo description preserved on create",
    todo.description,
    description,
  );
  TestValidator.equals(
    "todo start date preserved on create",
    todo.start_at,
    start_at,
  );
  TestValidator.equals(
    "todo due date preserved on create",
    todo.due_at,
    due_at,
  );
  const completed = await api.functional.todoApp.member.todos.patchByTodoid(
    memberConnection,
    {
      todoId: todo.id,
      body: { is_completed: true } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(completed);
  TestValidator.equals(
    "todo id preserved after completion toggle",
    completed.id,
    todo.id,
  );
  TestValidator.equals(
    "todo owner preserved after completion toggle",
    completed.member.id,
    todo.member.id,
  );
  TestValidator.equals(
    "todo owner email preserved after completion toggle",
    completed.member.email,
    todo.member.email,
  );
  TestValidator.equals(
    "todo title preserved after completion toggle",
    completed.title,
    title,
  );
  TestValidator.equals(
    "todo description preserved after completion toggle",
    completed.description,
    description,
  );
  TestValidator.equals(
    "todo start date preserved after completion toggle",
    completed.start_at,
    start_at,
  );
  TestValidator.equals(
    "todo due date preserved after completion toggle",
    completed.due_at,
    due_at,
  );
  TestValidator.equals("todo marked completed", completed.is_completed, true);
  const reverted = await api.functional.todoApp.member.todos.patchByTodoid(
    memberConnection,
    {
      todoId: todo.id,
      body: { is_completed: false } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(reverted);
  TestValidator.equals(
    "todo id preserved after reverting completion",
    reverted.id,
    todo.id,
  );
  TestValidator.equals(
    "todo owner preserved after reverting completion",
    reverted.member.id,
    todo.member.id,
  );
  TestValidator.equals(
    "todo title preserved after reverting completion",
    reverted.title,
    title,
  );
  TestValidator.equals(
    "todo description preserved after reverting completion",
    reverted.description,
    description,
  );
  TestValidator.equals(
    "todo start date preserved after reverting completion",
    reverted.start_at,
    start_at,
  );
  TestValidator.equals(
    "todo due date preserved after reverting completion",
    reverted.due_at,
    due_at,
  );
  TestValidator.equals(
    "todo marked incomplete again",
    reverted.is_completed,
    false,
  );
}
