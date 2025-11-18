import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test authenticated user self-deletion functionality.
 *
 * This test validates that a user can successfully delete their own account
 * through the API. The test follows these steps:
 *
 * 1. Create a new user account using the join endpoint
 * 2. Verify the user is authenticated with valid tokens
 * 3. Use the authenticated session to delete the user's own account
 * 4. Verify the deletion operation completes successfully
 *
 * This ensures the self-deletion workflow works correctly and users have
 * control over their account lifecycle management.
 */
export async function test_api_user_account_self_deletion(
  connection: api.IConnection,
) {
  // 1. Create a new user account
  const email = typia.random<string & tags.Format<"email">>();
  const userJoinData = {
    email,
    password: "StrongPass123!",
    href: "https://example.com/join",
    referrer: "https://example.com/",
  } satisfies ITodoAppUser.IJoin;

  const createdUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinData,
    });
  typia.assert(createdUser);

  // 2. Verify user creation and authentication context
  TestValidator.equals("user email matches", createdUser.email, email);
  TestValidator.predicate("user has valid ID", createdUser.id.length > 0);
  TestValidator.predicate(
    "user has access token",
    createdUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "user has refresh token",
    createdUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "user created_at is valid timestamp",
    createdUser.created_at.length > 0,
  );

  // 3. Delete the user's own account using authenticated session
  // The connection now has authentication headers set by the join operation
  await api.functional.todoApp.user.users.erase(connection, {
    userId: createdUser.id,
  });

  // 4. Verify deletion completed successfully (operation returns void)
  // Test passes if no errors are thrown during deletion
  TestValidator.predicate("self-deletion completed without errors", true);
}
