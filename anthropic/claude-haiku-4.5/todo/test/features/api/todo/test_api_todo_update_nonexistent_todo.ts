import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating a todo that doesn't exist.
 *
 * This test validates that attempting to update a non-existent todo returns an
 * appropriate error response. The test authenticates a user, generates an
 * invalid todo ID, and attempts to update it, verifying that the API properly
 * handles the not-found scenario without revealing sensitive information about
 * resource existence.
 *
 * Steps:
 *
 * 1. Authenticate a new user via the join endpoint
 * 2. Generate a non-existent UUID for the todo ID
 * 3. Attempt to update the non-existent todo with valid update data
 * 4. Verify the operation fails with appropriate error handling
 */
export async function test_api_todo_update_nonexistent_todo(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user by joining
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10) + "1Aa!", // At least 8 chars
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Generate a non-existent UUID for the todo
  const nonexistentTodoId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to update the non-existent todo with valid update data
  await TestValidator.error("update nonexistent todo should fail", async () => {
    await api.functional.todoList.user.todos.update(connection, {
      todoId: nonexistentTodoId,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        completed: false,
        priority: "high",
      } satisfies ITodoListTodo.IUpdate,
    });
  });
}
