import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user profile retrieval with self-access-only authorization.
 *
 * This test validates that the user profile retrieval endpoint properly
 * enforces authorization boundaries. It ensures that authenticated users can
 * only access their own profile information and receive appropriate
 * authorization errors when attempting to access other users' profiles.
 *
 * Test workflow:
 *
 * 1. Create first user account (User A) - automatically authenticated as User A
 * 2. Verify User A can successfully retrieve their own profile (self-access)
 * 3. Create second user account (User B) - automatically authenticated as User B
 * 4. Attempt to retrieve User A's profile while authenticated as User B
 * 5. Validate that an authorization error is returned (cross-user access denied)
 *
 * This validates the security principle that user-scoped endpoints enforce
 * ownership-based access control, preventing unauthorized profile access.
 */
export async function test_api_user_profile_retrieval_self_access_only(
  connection: api.IConnection,
) {
  // Step 1: Create first user account (User A)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = "securePassword123";

  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userA);

  // Step 2: Verify User A can retrieve their own profile (self-access validation)
  const userAProfile = await api.functional.todoList.user.users.at(connection, {
    userId: userA.id,
  });
  typia.assert(userAProfile);

  TestValidator.equals("user A profile ID matches", userAProfile.id, userA.id);
  TestValidator.equals(
    "user A profile email matches",
    userAProfile.email,
    userAEmail,
  );

  // Step 3: Create second user account (User B)
  // After this call, connection is automatically authenticated as User B
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = "anotherSecurePass456";

  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userB);

  // Step 4: Attempt to retrieve User A's profile while authenticated as User B
  // This should fail with an authorization error (cross-user access violation)
  await TestValidator.error("user B cannot access user A profile", async () => {
    await api.functional.todoList.user.users.at(connection, {
      userId: userA.id,
    });
  });
}
