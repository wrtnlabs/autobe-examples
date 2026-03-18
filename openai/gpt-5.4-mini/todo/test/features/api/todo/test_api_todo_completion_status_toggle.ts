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

export async function test_api_todo_completion_status_toggle(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.todoApp.auth.member.join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        start_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals(
    "new todo should start incomplete",
    todo.is_completed,
    false,
  );
  const initialSnapshot = {
    id: todo.id,
    member: todo.member,
    title: todo.title,
    description: todo.description,
    start_at: todo.start_at,
    due_at: todo.due_at,
    created_at: todo.created_at,
    deleted_at: todo.deleted_at,
  };
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
  TestValidator.equals(
    "todo id should remain the same after completing",
    completed.id,
    initialSnapshot.id,
  );
  TestValidator.equals(
    "todo owner should remain the same after completing",
    completed.member,
    initialSnapshot.member,
  );
  TestValidator.equals(
    "todo title should remain unchanged after completing",
    completed.title,
    initialSnapshot.title,
  );
  TestValidator.equals(
    "todo description should remain unchanged after completing",
    completed.description,
    initialSnapshot.description,
  );
  TestValidator.equals(
    "todo start date should remain unchanged after completing",
    completed.start_at,
    initialSnapshot.start_at,
  );
  TestValidator.equals(
    "todo due date should remain unchanged after completing",
    completed.due_at,
    initialSnapshot.due_at,
  );
  TestValidator.equals(
    "todo created_at should remain unchanged after completing",
    completed.created_at,
    initialSnapshot.created_at,
  );
  TestValidator.equals(
    "todo deleted_at should remain unchanged after completing",
    completed.deleted_at,
    initialSnapshot.deleted_at,
  );
  TestValidator.equals(
    "todo should become completed",
    completed.is_completed,
    true,
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
  TestValidator.equals(
    "todo id should remain the same after reverting",
    reverted.id,
    initialSnapshot.id,
  );
  TestValidator.equals(
    "todo owner should remain the same after reverting",
    reverted.member,
    initialSnapshot.member,
  );
  TestValidator.equals(
    "todo title should remain unchanged after reverting",
    reverted.title,
    initialSnapshot.title,
  );
  TestValidator.equals(
    "todo description should remain unchanged after reverting",
    reverted.description,
    initialSnapshot.description,
  );
  TestValidator.equals(
    "todo start date should remain unchanged after reverting",
    reverted.start_at,
    initialSnapshot.start_at,
  );
  TestValidator.equals(
    "todo due date should remain unchanged after reverting",
    reverted.due_at,
    initialSnapshot.due_at,
  );
  TestValidator.equals(
    "todo created_at should remain unchanged after reverting",
    reverted.created_at,
    initialSnapshot.created_at,
  );
  TestValidator.equals(
    "todo deleted_at should remain unchanged after reverting",
    reverted.deleted_at,
    initialSnapshot.deleted_at,
  );
  TestValidator.equals(
    "todo should become incomplete again",
    reverted.is_completed,
    false,
  );
}
