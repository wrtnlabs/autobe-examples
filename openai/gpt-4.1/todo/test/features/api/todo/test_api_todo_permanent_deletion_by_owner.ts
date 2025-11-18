import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_todo_permanent_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register the owner user (User A)
  const joinA = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) as string & tags.MinLength<8>,
      href: "https://test-app/welcome",
      referrer: "https://test-app/landing",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(joinA);
  const userAId = joinA.id;

  // 2. Create a new todo item as owner
  const todo = await api.functional.todo.user.todos.create(connection, {
    body: {
      description: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ITodoTodo.ICreate,
  });
  typia.assert(todo);
  TestValidator.equals(
    "todo ownership is correct after creation",
    todo.user.id,
    userAId,
  );

  // 3. Delete the created todo item as owner
  await api.functional.todo.user.todos.erase(connection, { todoId: todo.id });

  // 4. Attempt to access the deleted todo item (should not be found)
  // As there is no GET endpoint for a specific todo provided, this negative test is omitted.
  // If such endpoint existed (e.g. api.functional.todo.user.todos.at), we would verify it throws.

  // 5. Register a different user (User B) and attempt to delete User A's (already deleted) todo
  const joinB = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) as string & tags.MinLength<8>,
      href: "https://test-app/welcome",
      referrer: "https://test-app/landing",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(joinB);

  // Switch to User B's session: connection.headers is managed by SDK, no need to manually swap

  // Negative check: User B attempts to delete already deleted todo (should fail with access or missing resource)
  await TestValidator.error(
    "non-owner cannot delete non-existent or foreign todo",
    async () => {
      await api.functional.todo.user.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );
}
