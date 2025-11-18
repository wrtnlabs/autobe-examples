import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that users can only delete todos they own.
 *
 * This test validates exclusive ownership enforcement on todo deletion by:
 *
 * 1. Creating first user account and authenticating
 * 2. Creating a todo item owned by the first user
 * 3. Creating second user account with separate authentication
 * 4. Attempting to delete the first user's todo as the second user
 * 5. Verifying deletion fails with authorization error
 *
 * This ensures proper access control and ownership validation on the delete
 * endpoint.
 */
export async function test_api_todo_deletion_ownership_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first user
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Password = RandomGenerator.alphabets(8) + "Pass1"; // Ensure 8+ chars
  const user1Auth = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      password: user1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user1Auth);
  // SDK automatically updates connection.headers.Authorization after join()

  // Step 2: User1 creates a todo
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription = RandomGenerator.content({ paragraphs: 1 });
  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
        description: todoDescription,
        priority: "high",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  TestValidator.equals(
    "created todo has valid id",
    typeof createdTodo.id,
    "string",
  );

  // Step 3: Create and authenticate second user
  // This replaces the current connection authentication context
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Password = RandomGenerator.alphabets(8) + "Pass2"; // Ensure 8+ chars
  const user2Auth = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      password: user2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user2Auth);
  // SDK automatically updates connection.headers.Authorization after join()
  // Now connection is authenticated as user2

  // Step 4: User2 attempts to delete User1's todo - should fail
  await TestValidator.error(
    "user2 cannot delete user1 todo - ownership validation enforced",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: createdTodo.id,
      });
    },
  );

  // Ownership validation is confirmed: User2 was blocked from deleting User1's todo
  TestValidator.predicate("deletion ownership validation confirmed", true);
}
