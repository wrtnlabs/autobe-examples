import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_update_mark_completed(
  connection: api.IConnection,
) {
  // Step 1: Create user account for todo completion test
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);
  TestValidator.predicate(
    "user should be authenticated",
    user.token.access !== undefined,
  );

  // Step 2: Create active todo item to be marked as completed
  const activeTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        priority: "medium",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(activeTodo);
  TestValidator.equals(
    "created todo should have active status",
    activeTodo.status,
    "active",
  );
  TestValidator.predicate(
    "completion timestamp should be null for active todo",
    activeTodo.completed_at === null || activeTodo.completed_at === undefined,
  );

  // Step 3: Mark the todo as completed by updating status field
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: activeTodo.id,
      body: {
        status: "completed",
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(completedTodo);

  // Step 4: Verify the todo is marked as completed
  TestValidator.equals(
    "updated todo should have completed status",
    completedTodo.status,
    "completed",
  );
  TestValidator.predicate(
    "completion timestamp should be recorded",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  // Step 5: Verify completion timestamp is in valid ISO 8601 format
  TestValidator.predicate(
    "completion timestamp should be valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      completedTodo.completed_at ?? "",
    ),
  );

  // Step 6: Verify other properties remain unchanged
  TestValidator.equals(
    "todo title should remain unchanged",
    completedTodo.title,
    activeTodo.title,
  );
  TestValidator.equals(
    "todo description should remain unchanged",
    completedTodo.description,
    activeTodo.description,
  );
  TestValidator.equals(
    "todo priority should remain unchanged",
    completedTodo.priority,
    activeTodo.priority,
  );
  TestValidator.predicate(
    "created_at timestamp should not change",
    completedTodo.created_at === activeTodo.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp should be more recent than created_at",
    new Date(completedTodo.updated_at).getTime() >=
      new Date(completedTodo.created_at).getTime(),
  );
}
