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

export async function test_api_todo_restore_preserves_edit_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create initial todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.predicate("todo is active", todo.deleted_at === null);
  // 3. Edit the todo multiple times to generate history
  const firstUpdate = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: "Updated Title - First Edit",
        description: "Updated description after first edit",
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  TestValidator.equals(
    "title updated",
    firstUpdate.title,
    "Updated Title - First Edit",
  );
  const secondUpdate = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: "Updated Title - Second Edit",
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  TestValidator.equals(
    "title updated again",
    secondUpdate.title,
    "Updated Title - Second Edit",
  );
  // Store pre-deletion state for comparison
  const preDeletionState = {
    id: secondUpdate.id,
    title: secondUpdate.title,
    description: secondUpdate.description,
    start_date: secondUpdate.start_date,
    due_date: secondUpdate.due_date,
    completed: secondUpdate.completed,
    member_id: secondUpdate.member.id,
  };
  // 4. Soft delete the todo
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 5. Restore the todo from trash
  const restored = await api.functional.todoApp.member.todos.restore(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(restored);
  // 6. Verify restoration preserved all data
  TestValidator.equals("todo ID preserved", restored.id, preDeletionState.id);
  TestValidator.equals(
    "title preserved after restore",
    restored.title,
    preDeletionState.title,
  );
  TestValidator.equals(
    "description preserved after restore",
    restored.description,
    preDeletionState.description,
  );
  TestValidator.equals(
    "start_date preserved after restore",
    restored.start_date,
    preDeletionState.start_date,
  );
  TestValidator.equals(
    "due_date preserved after restore",
    restored.due_date,
    preDeletionState.due_date,
  );
  TestValidator.equals(
    "completed status preserved",
    restored.completed,
    preDeletionState.completed,
  );
  TestValidator.equals(
    "member ownership preserved",
    restored.member.id,
    preDeletionState.member_id,
  );
  // 7. Verify todo is active (deleted_at cleared)
  TestValidator.predicate(
    "todo is active after restore",
    restored.deleted_at === null,
  );
  // 8. Verify updated_at was refreshed on restore
  TestValidator.predicate(
    "updated_at refreshed on restore",
    restored.updated_at >= secondUpdate.updated_at,
  );
}
