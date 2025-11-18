import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test authenticated user accessing their own profile information through the
 * todo application system. User creates account via registration, then
 * retrieves their personal user data including account creation timestamps and
 * basic profile details. Validates that users can only access their own account
 * information and that sensitive data like password hashes are properly
 * excluded from responses.
 */
export async function test_api_user_profile_access_own_account(
  connection: api.IConnection,
) {
  // Generate random user registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  // Create new user account via registration
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      ip: "127.0.0.1",
      href: `https://example.com/path`,
      referrer: `https://google.com/search`,
    } satisfies ITodoAppUser.IJoin,
  });

  // Validate authentication tokens were issued
  typia.assert(userAuth);

  // Verify auth response contains user details without sensitive data
  TestValidator.predicate("user ID is valid UUID", userAuth.id.length > 0);
  TestValidator.equals("user email matches", userAuth.email, email);
  TestValidator.predicate(
    "token is provided",
    userAuth.token.access.length > 0,
  );

  // Ensure no password or sensitive data is exposed
  TestValidator.predicate(
    "no password hash in response",
    !("password" in userAuth),
  );
  TestValidator.predicate(
    "no password_hash in response",
    !("password_hash" in userAuth),
  );
  TestValidator.equals(
    "no deleted_at in auth response",
    userAuth.deleted_at,
    undefined,
  );

  // Retrieve user's own profile data
  const userProfile = await api.functional.todoApp.user.users.at(connection, {
    userId: userAuth.id,
  });

  // Validate profile data structure
  typia.assert(userProfile);

  // Verify profile data matches authentication data
  TestValidator.equals(
    "profile ID matches auth ID",
    userProfile.id,
    userAuth.id,
  );
  TestValidator.equals(
    "profile email matches",
    userProfile.email,
    userAuth.email,
  );
  TestValidator.predicate(
    "profile has created_at",
    userProfile.created_at.length > 0,
  );

  // Verify sensitive data exclusions
  TestValidator.predicate(
    "no password in profile",
    !("password" in userProfile),
  );
  TestValidator.predicate(
    "no password_hash in profile",
    !("password_hash" in userProfile),
  );
  TestValidator.predicate("no token in profile", !("token" in userProfile));
}
