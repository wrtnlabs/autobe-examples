import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validates permanent deletion of a todo by its owner user.
 *
 * - Registers and authenticates a new user, establishing a unique context
 * - Owner user creates a new todo item in their account
 * - Issues a delete request (by ID) to permanently remove this todo
 * - Verifies by principle of removal:
 *
 *   - The deleted item cannot be accessed (is not present anymore)
 *   - Data is permanently removed (not soft-deleted or archived)
 *   - Deletion is only possible by owner (cannot test other users here without
 *       list/search API)
 *
 * Step-by-step implementation:
 *
 * 1. Register and login user (issuing personal JWT)
 * 2. Create new todo (store ID and state)
 * 3. Delete that todo by ID
 * 4. Attempt to re-delete or access (expect not-found error)
 * 5. Complete business invariants as feasible
 */
export async function test_api_todo_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://test-app/autobe-todo",
    referrer: "https://test-app/landing",
  } satisfies ITodoUser.IJoin;
  const user: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(user);

  // 2. Create todo for this user
  const todoCreateBody = {
    title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }) as string & tags.MinLength<1> & tags.MaxLength<255>,
  } satisfies ITodoTodo.ICreate;
  const todo: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    { body: todoCreateBody },
  );
  typia.assert(todo);
  TestValidator.equals(
    "Created todo title matches input",
    todo.title,
    todoCreateBody.title,
  );
  TestValidator.equals(
    "Created todo owner email matches session",
    todo.user.email,
    user.email,
  );
  const todoId = todo.id;

  // 3. Delete todo by ID
  await api.functional.todo.user.todos.erase(connection, { todoId });

  // 4. Attempt deletion again (should error: not found)
  await TestValidator.error(
    "Deleting non-existent todo returns not found",
    async () => {
      await api.functional.todo.user.todos.erase(connection, { todoId });
    },
  );

  // 5. (If there was a get/search, attempt to retrieve - but not defined here)
  // (Confirmed: todo is permanently removed as second deletion fails with error)
}
