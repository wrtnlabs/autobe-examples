import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieval attempt for a non-existent todo item.
 *
 * This test validates the system's error handling when attempting to retrieve a
 * todo item that does not exist in the database. The scenario follows a
 * realistic user workflow:
 *
 * 1. User registration and authentication to establish valid user context
 * 2. Generation of a valid but non-existent todo UUID
 * 3. Attempt to retrieve the non-existent todo using the valid UUID
 * 4. Validation that the system properly rejects the request with an error
 *
 * This ensures robust error handling for edge cases where clients request
 * resources that have been deleted, never existed, or are inaccessible to the
 * current user.
 */
export async function test_api_todo_retrieval_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Generate a random UUID that doesn't correspond to any existing todo
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to retrieve the non-existent todo and validate error
  await TestValidator.error(
    "retrieving non-existent todo should fail",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
