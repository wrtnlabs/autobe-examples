import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoPriority";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";

/**
 * Test attempting to retrieve a non-existent todo.
 *
 * This test validates the system's error handling when attempting to access
 * todo items that don't exist. It ensures proper error responses are returned
 * for missing resources, which is critical for robust API behavior and user
 * experience when dealing with invalid or deleted todo IDs.
 *
 * Test workflow:
 *
 * 1. Register a new member user to establish authenticated access
 * 2. Generate a random UUID for a non-existent todo ID
 * 3. Attempt to retrieve the non-existent todo and validate error response
 * 4. Confirm the system properly handles missing resources
 */
export async function test_api_retrieve_non_existent_todo(
  connection: api.IConnection,
) {
  // Step 1: Register a new member user to create authenticated session
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // Step 2: Generate a random UUID for a non-existent todo ID
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to retrieve the non-existent todo and validate error
  await TestValidator.error(
    "should fail to retrieve non-existent todo",
    async () => {
      await api.functional.todo.member.todos.at(connection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
