import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";

/**
 * Test attempting to delete non-existent todo items.
 *
 * This test validates appropriate error responses when trying to delete todo
 * items that have never existed or have already been deleted, ensuring proper
 * error handling for missing resources.
 */
export async function test_api_delete_non_existent_todo(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "testPassword123",
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // Step 2: Attempt to delete a non-existent todo using a random UUID
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail to delete non-existent todo",
    async () => {
      await api.functional.todo.member.todos.erase(connection, {
        todoId: nonExistentTodoId,
      });
    },
  );

  // Step 3: Attempt to delete another non-existent todo to ensure consistency
  const anotherNonExistentTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should consistently fail to delete non-existent todos",
    async () => {
      await api.functional.todo.member.todos.erase(connection, {
        todoId: anotherNonExistentTodoId,
      });
    },
  );
}
