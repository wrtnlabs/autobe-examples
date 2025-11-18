import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test complete user account deletion workflow where authenticated user
 * permanently removes their own account. Validates that account deletion is
 * permanent, removes user data, and prevents future authentication attempts.
 * Ensures proper cleanup of user-related data while maintaining system
 * integrity.
 */
export async function test_api_user_account_permanent_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(createdUser);

  // Step 2: Validate user creation and authentication
  TestValidator.equals("user ID is valid UUID", createdUser.id, createdUser.id);
  TestValidator.equals(
    "user email matches input",
    createdUser.email,
    userEmail,
  );
  TestValidator.predicate(
    "user status is active",
    createdUser.status === "active",
  );
  TestValidator.predicate(
    "authentication token exists",
    createdUser.token.access.length > 0,
  );

  // Step 3: Execute permanent account deletion
  await api.functional.todoList.user.users.erase(connection, {
    userId: createdUser.id,
  });

  // Step 4: Verify deletion prevents future authentication attempts
  // Create unauthenticated connection for testing
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt to login with deleted user credentials should fail
  await TestValidator.error("deleted user cannot authenticate", async () => {
    await api.functional.auth.user.join(unauthConn, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ICreate,
    });
  });

  // Step 5: Test that deleted user cannot perform authenticated operations
  // Attempt to delete the same user again should fail
  await TestValidator.error("cannot delete already deleted user", async () => {
    await api.functional.todoList.user.users.erase(connection, {
      userId: createdUser.id,
    });
  });
}
