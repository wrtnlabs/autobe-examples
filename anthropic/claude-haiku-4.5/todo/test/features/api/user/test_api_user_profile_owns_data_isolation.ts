import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that users can only access their own profile, not other users' profiles.
 *
 * This test verifies proper data isolation in the user profile endpoint by:
 *
 * 1. Registering two different user accounts (User A and User B)
 * 2. Authenticating User A and retrieving their profile
 * 3. Authenticating User B and retrieving their profile
 * 4. Confirming that User B's profile retrieval returns only User B's data
 * 5. Validating that the email and ID in the retrieved profile match User B's
 *    registered data
 *
 * This ensures the API enforces proper access control and prevents users from
 * accessing other users' account information through the profile endpoint.
 */
export async function test_api_user_profile_owns_data_isolation(
  connection: api.IConnection,
) {
  // Step 1: Register User A
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = "securePassword123";
  const userARegistration = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userARegistration);
  const userA = userARegistration.id;
  const userATokenAccess = userARegistration.token.access;

  // Step 2: Register User B
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = "securePassword456";
  const userBRegistration = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userBRegistration);
  const userB = userBRegistration.id;

  // Step 3: Retrieve User A's profile using User A's token
  const userAConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${userATokenAccess}`,
    },
  };
  const userAProfile =
    await api.functional.todoList.user.auth.user.profile.at(userAConnection);
  typia.assert(userAProfile);
  TestValidator.equals("User A profile ID matches", userAProfile.id, userA);
  TestValidator.equals("User A email matches", userAProfile.email, userAEmail);

  // Step 4: Retrieve User B's profile using User B's token
  const userBConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${userBRegistration.token.access}`,
    },
  };
  const userBProfile =
    await api.functional.todoList.user.auth.user.profile.at(userBConnection);
  typia.assert(userBProfile);

  // Step 5: Verify User B's profile contains only User B's data
  TestValidator.equals("User B profile ID matches", userBProfile.id, userB);
  TestValidator.equals("User B email matches", userBProfile.email, userBEmail);

  // Step 6: Confirm data isolation - User B's profile should NOT match User A's
  TestValidator.notEquals(
    "User B profile should not match User A profile",
    userBProfile.id,
    userA,
  );
  TestValidator.notEquals(
    "User B email should not match User A email",
    userBProfile.email,
    userAEmail,
  );
}
