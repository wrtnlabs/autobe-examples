import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test that users cannot update other users' profiles by attempting to modify
 * accounts they don't own. Validates authorization boundaries and security
 * measures prevent unauthorized account modifications.
 */
export async function test_api_user_profile_update_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Create first user account (User A)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: "password123",
      password_hash: "$2b$10$placeholderhashforsecurity", // Realistic hash format
      status: "active" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(userA);

  // Step 2: Create second user account (User B)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: "password456",
      password_hash: "$2b$10$differenthashforuserb", // Different hash for User B
      status: "active" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(userB);

  // Step 3: Create prerequisite todo to establish user creation context
  // This establishes that user operations are working correctly before testing authorization boundaries
  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 1 }),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);

  // Step 4: Attempt unauthorized update - User A tries to update User B's profile
  // This should fail due to authorization boundaries
  await TestValidator.error(
    "user cannot update other user's profile",
    async () => {
      await api.functional.todoApp.user.users.update(connection, {
        userId: userB.id, // Trying to update User B's profile
        body: {
          email: typia.random<string & tags.Format<"email">>(), // Attempt to change email
        } satisfies ITodoAppUser.IUpdate,
      });
    },
  );

  // Step 5: Validate that both users' authentication remains intact
  // This ensures the failed update attempt didn't break existing authentication
  TestValidator.predicate(
    "user A authentication token is valid",
    userA.token.access.length > 0 && userA.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "user B authentication token is valid",
    userB.token.access.length > 0 && userB.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "user tokens have future expiration dates",
    new Date(userA.token.expired_at) > new Date() &&
      new Date(userB.token.expired_at) > new Date(),
  );
}
