import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful retrieval of user information by email address.
 *
 * This test validates that the GET endpoint /todoApp/user/users/{userEmail}
 * correctly returns complete user profile information when provided with a
 * valid email address. The test creates a user account first, then retrieves it
 * by email to ensure all fields match the original creation data.
 */
export async function test_api_user_retrieval_by_email(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const authUserEmail = typia.random<string & tags.Format<"email">>();
  const authUser = await api.functional.auth.user.join(connection, {
    body: {
      email: authUserEmail,
      password: "testPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(authUser);

  // Step 2: Create target user account to be retrieved
  const targetUserEmail = typia.random<string & tags.Format<"email">>();
  const targetUser = await api.functional.auth.user.join(connection, {
    body: {
      email: targetUserEmail,
      password: "targetPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(targetUser);

  // Step 3: Retrieve user by email
  const retrievedUser = await api.functional.todoApp.user.users.at(connection, {
    userEmail: targetUserEmail,
  });
  typia.assert(retrievedUser);

  // Step 4: Validate all user fields match
  TestValidator.equals("user ID matches", retrievedUser.id, targetUser.id);
  TestValidator.equals(
    "user email matches",
    retrievedUser.email,
    targetUserEmail,
  );
  TestValidator.equals(
    "user name matches",
    retrievedUser.name,
    targetUser.name,
  );
  TestValidator.equals(
    "user status matches",
    retrievedUser.status,
    targetUser.status,
  );
  TestValidator.equals(
    "created_at timestamp matches",
    retrievedUser.created_at,
    targetUser.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp matches",
    retrievedUser.updated_at,
    targetUser.updated_at,
  );
}
