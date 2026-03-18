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

export async function test_api_todo_completion_status_preserves_todo_fields(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.todoApp.auth.member.join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  const title = RandomGenerator.paragraph({ sentences: 2 });
  const description = RandomGenerator.content({ paragraphs: 1 });
  const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dueAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title,
        description,
        start_at: startAt,
        due_at: dueAt,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals("initial title preserved", todo.title, title);
  TestValidator.equals(
    "initial description preserved",
    todo.description,
    description,
  );
  TestValidator.equals("initial start date preserved", todo.start_at, startAt);
  TestValidator.equals("initial due date preserved", todo.due_at, dueAt);
  TestValidator.equals("initial completion false", todo.is_completed, false);
  const completed =
    await api.functional.todoApp.member.todos.completion_status.updateCompletionStatus(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          completionStatus: "complete",
        } satisfies ITodoAppTodo.IUpdateCompletionStatus,
      },
    );
  typia.assert(completed);
  TestValidator.equals("completed todo id preserved", completed.id, todo.id);
  TestValidator.equals(
    "completed member preserved",
    completed.member,
    todo.member,
  );
  TestValidator.equals("completed title preserved", completed.title, title);
  TestValidator.equals(
    "completed description preserved",
    completed.description,
    description,
  );
  TestValidator.equals(
    "completed start date preserved",
    completed.start_at,
    startAt,
  );
  TestValidator.equals("completed due date preserved", completed.due_at, dueAt);
  TestValidator.equals("completed state changed", completed.is_completed, true);
  TestValidator.equals(
    "completed created_at preserved",
    completed.created_at,
    todo.created_at,
  );
  const reverted =
    await api.functional.todoApp.member.todos.completion_status.updateCompletionStatus(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          completionStatus: "incomplete",
        } satisfies ITodoAppTodo.IUpdateCompletionStatus,
      },
    );
  typia.assert(reverted);
  TestValidator.equals("reverted todo id preserved", reverted.id, todo.id);
  TestValidator.equals(
    "reverted member preserved",
    reverted.member,
    todo.member,
  );
  TestValidator.equals("reverted title preserved", reverted.title, title);
  TestValidator.equals(
    "reverted description preserved",
    reverted.description,
    description,
  );
  TestValidator.equals(
    "reverted start date preserved",
    reverted.start_at,
    startAt,
  );
  TestValidator.equals("reverted due date preserved", reverted.due_at, dueAt);
  TestValidator.equals(
    "reverted state changed back",
    reverted.is_completed,
    false,
  );
  TestValidator.equals(
    "reverted created_at preserved",
    reverted.created_at,
    todo.created_at,
  );
}
