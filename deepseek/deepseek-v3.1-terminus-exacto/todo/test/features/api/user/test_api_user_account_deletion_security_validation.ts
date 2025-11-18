import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate security measures during user account deletion operations.
 *
 * This test ensures proper authorization enforcement for account deletion,
 * verifying that users can only delete their own accounts and that security
 * mechanisms prevent unauthorized deletion attempts. The test creates multiple
 * user accounts and validates authentication context switching and proper
 * access control.
 */
export async function test_api_user_account_deletion_security_validation(
  connection: api.IConnection,
) {
  // Create primary user account
  const primaryUserEmail = typia.random<string & tags.Format<"email">>();
  const primaryUser = await api.functional.auth.user.join(connection, {
    body: {
      email: primaryUserEmail,
      password: "password123",
      name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(primaryUser);

  // Create secondary user account
  const secondaryUserEmail = typia.random<string & tags.Format<"email">>();
  const secondaryUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondaryUserEmail,
      password: "password456",
      name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(secondaryUser);

  // Attempt unauthorized deletion - secondary user trying to delete primary user's account
  // The SDK automatically uses the latest authentication token (secondary user)
  await TestValidator.error(
    "unauthorized user cannot delete other user's account",
    async () => {
      await api.functional.todoApp.user.users.erase(connection, {
        userEmail: primaryUserEmail,
      });
    },
  );

  // For authorized deletion, we need to re-authenticate as the primary user
  // Since there's no login function, we'll create a fresh connection without authentication
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Re-authenticate as primary user by joining again (which sets the auth token)
  const reauthenticatedPrimaryUser = await api.functional.auth.user.join(
    unauthConnection,
    {
      body: {
        email: primaryUserEmail,
        password: "password123",
        name: RandomGenerator.name(),
        href: "https://example.com",
        referrer: "https://example.com/signup",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(reauthenticatedPrimaryUser);

  // Authorized deletion - primary user deleting their own account
  const deletedUser = await api.functional.todoApp.user.users.erase(
    unauthConnection,
    {
      userEmail: primaryUserEmail,
    },
  );
  typia.assert(deletedUser);

  // Validate deletion response matches original user data
  TestValidator.equals(
    "deleted user email matches original",
    deletedUser.email,
    primaryUserEmail,
  );
  TestValidator.equals(
    "deleted user ID matches original",
    deletedUser.id,
    primaryUser.id,
  );
  TestValidator.equals(
    "deleted user name matches original",
    deletedUser.name,
    primaryUser.name,
  );
}
