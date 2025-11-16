import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test retrieval of a todo using a non-existent UUID.
 *
 * This test validates that the API properly handles requests for non-existent
 * todo items. The test authenticates a user and then attempts to retrieve a
 * todo item using a randomly generated UUID that has never been created.
 *
 * The test ensures:
 *
 * 1. User authentication works correctly
 * 2. The API returns appropriate error response when requesting non-existent
 *    resources
 * 3. Invalid resource identifiers are properly validated
 *
 * Steps:
 *
 * 1. Create and authenticate a new user account
 * 2. Generate a random UUID for a non-existent todo
 * 3. Attempt to retrieve the todo with the non-existent ID
 * 4. Verify that an error is thrown as expected
 */
export async function test_api_todo_retrieval_nonexistent_id(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user account
  const userCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(8),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppUser.ICreate;

  const authenticatedUser = await api.functional.auth.user.join(connection, {
    body: userCreateData,
  });
  typia.assert(authenticatedUser);

  // Step 2: Generate a random UUID for a non-existent todo
  const nonexistentTodoId = typia.random<string & tags.Format<"uuid">>();

  // Step 3 & 4: Attempt to retrieve the non-existent todo and verify error handling
  await TestValidator.error(
    "should return error when retrieving non-existent todo",
    async () => {
      await api.functional.todoApp.user.todos.at(connection, {
        todoId: nonexistentTodoId,
      });
    },
  );
}
