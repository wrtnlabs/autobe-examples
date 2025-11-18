import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test authenticated user attempting to access another user's profile data to
 * verify authorization boundaries. Create two separate user accounts, then
 * attempt cross-user profile access to validate proper data isolation and
 * permission enforcement. Ensures users cannot view other users' personal
 * information while maintaining strict authentication-based access controls.
 */
export async function test_api_user_profile_different_user_access(
  connection: api.IConnection,
) {
  // Create first user account
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: "SecurePassword123!",
      ip: "192.168.1.1",
      href: "https://example.com",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(firstUser);

  // Verify first user is authenticated and can access their own profile
  const ownProfile = await api.functional.todoApp.user.users.at(connection, {
    userId: firstUser.id,
  });
  typia.assert(ownProfile);

  TestValidator.equals(
    "own profile has correct user ID",
    ownProfile.id,
    firstUser.id,
  );
  TestValidator.equals(
    "own profile has correct email",
    ownProfile.email,
    firstUserEmail,
  );

  // Create second user account with different email
  // Need fresh connection context to avoid authentication conflicts
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser = await api.functional.auth.user.join(unauthConn, {
    body: {
      email: secondUserEmail,
      password: "AnotherSecure456!",
      ip: "192.168.1.2",
      href: "https://example.com",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(secondUser);

  // Verify second user can access their own profile
  const secondUserProfile = await api.functional.todoApp.user.users.at(
    unauthConn,
    {
      userId: secondUser.id,
    },
  );
  typia.assert(secondUserProfile);

  TestValidator.equals(
    "second user profile has correct ID",
    secondUserProfile.id,
    secondUser.id,
  );
  TestValidator.equals(
    "second user profile has correct email",
    secondUserProfile.email,
    secondUserEmail,
  );

  // Test cross-user access attempts
  // Second user trying to access first user's profile should be denied
  await TestValidator.error(
    "second user cannot access first user's profile",
    async () => {
      await api.functional.todoApp.user.users.at(unauthConn, {
        userId: firstUser.id,
      });
    },
  );

  // Return to first user's authentication context
  const firstUserConn = {
    ...connection,
    headers: { Authorization: firstUser.token.access },
  };

  // First user trying to access second user's profile should be denied
  await TestValidator.error(
    "first user cannot access second user's profile",
    async () => {
      await api.functional.todoApp.user.users.at(firstUserConn, {
        userId: secondUser.id,
      });
    },
  );
}
