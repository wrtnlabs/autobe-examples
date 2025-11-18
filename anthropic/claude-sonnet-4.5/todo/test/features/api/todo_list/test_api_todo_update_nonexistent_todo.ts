import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that attempting to update a todo item with a nonexistent UUID fails
 * appropriately.
 *
 * Business Context: The API should validate todo item existence before allowing
 * updates. When a user attempts to update a todo that doesn't exist in the
 * database, the system must reject the operation with an error response,
 * ensuring data integrity and preventing updates to invalid resources.
 *
 * Test Workflow:
 *
 * 1. Create a new user account via the join endpoint
 * 2. Authenticate as the newly created user (authentication is handled
 *    automatically by the SDK)
 * 3. Generate a valid UUID format that doesn't correspond to any existing todo in
 *    the database
 * 4. Attempt to update a todo using this nonexistent UUID with valid update data
 * 5. Verify that the operation fails with an error (the todo does not exist)
 */
export async function test_api_todo_update_nonexistent_todo(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();
  const currentHref = typia.random<string & tags.Format<"uri">>();
  const referrerHref = typia.random<string & tags.Format<"uri">>();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: currentHref,
      referrer: referrerHref,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Generate a nonexistent todo UUID
  // This UUID has valid format but doesn't correspond to any existing todo
  const nonexistentTodoId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Prepare valid update data
  const updateData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    completed: true,
  } satisfies ITodoListTodo.IUpdate;

  // Step 4: Attempt to update the nonexistent todo and expect an error
  await TestValidator.error(
    "updating nonexistent todo should fail",
    async () => {
      await api.functional.todoList.user.todos.update(connection, {
        todoId: nonexistentTodoId,
        body: updateData,
      });
    },
  );
}
