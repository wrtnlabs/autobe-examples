import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_creation_default_incomplete_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user account
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple todos without specifying completion status
  const todoCount = 3;
  const todos = await ArrayUtil.asyncRepeat(todoCount, async () => {
    const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 5,
          }),
          description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    return todo;
  });

  // Step 3: Validate each todo has default incomplete status
  for (let i = 0; i < todos.length; i++) {
    const todo = todos[i];

    // Verify is_completed defaults to false
    TestValidator.equals(
      `todo ${i + 1} should be incomplete by default`,
      todo.is_completed,
      false,
    );

    // Verify completed_at defaults to null
    TestValidator.equals(
      `todo ${i + 1} completed_at should be null for new incomplete todo`,
      todo.completed_at,
      null,
    );
  }

  // Step 4: Verify consistency - all created todos are incomplete
  TestValidator.predicate(
    "all created todos should have is_completed = false",
    todos.every((todo) => todo.is_completed === false),
  );

  // Step 5: Verify all completed_at fields are null
  TestValidator.predicate(
    "all created todos should have completed_at = null",
    todos.every(
      (todo) => todo.completed_at === null || todo.completed_at === undefined,
    ),
  );
}
