import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that a user cannot retrieve another user's todo item, validating strict
 * data isolation.
 *
 * This test verifies that the system enforces proper authorization boundaries
 * when accessing todo items. The scenario creates two separate user accounts
 * with distinct authentication credentials. The first user creates a todo item
 * that is exclusively owned by them. Then, the second user attempts to retrieve
 * that specific todo by its ID and should be denied access with a proper
 * authorization error (403 Forbidden).
 *
 * The test validates:
 *
 * 1. User 1 successfully creates a todo item (owned by User 1)
 * 2. User 2 cannot retrieve User 1's todo item - access denied
 * 3. Authorization boundaries are properly enforced for data isolation
 * 4. The system prevents unauthorized cross-user data access
 *
 * This ensures the application protects user data privacy and maintains strict
 * data isolation between users, preventing unauthorized cross-user data
 * access.
 */
export async function test_api_todo_retrieval_unauthorized_access_denied(
  connection: api.IConnection,
) {
  // Step 1: Create first user account
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Password = "SecurePassword123";
  const user1: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: user1Email,
        password: user1Password,
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user1);
  TestValidator.predicate(
    "user 1 account created successfully",
    user1.status === "active",
  );

  // Step 2: User 1 creates a todo item
  const todoTitle = RandomGenerator.paragraph({ sentences: 2 });
  const todoDescription = RandomGenerator.paragraph({ sentences: 5 });
  const user1Todo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        priority: "high",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(user1Todo);
  TestValidator.predicate(
    "todo item created by user 1",
    user1Todo.status === "active",
  );

  // Step 3: Create second user account
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Password = "AnotherPassword456";
  const user2: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: user2Email,
        password: user2Password,
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user2);
  TestValidator.predicate(
    "user 2 account created successfully",
    user2.status === "active",
  );

  // Step 4: User 2 attempts to retrieve User 1's todo - should fail with authorization error
  await TestValidator.error(
    "user 2 cannot retrieve user 1's todo - access denied",
    async () => {
      await api.functional.todoApp.user.todos.at(connection, {
        todoId: user1Todo.id,
      });
    },
  );
}
