import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test that account deletion properly handles user data preservation
 * requirements. Authenticate as registered user, delete account, and verify
 * that while the account is soft-deleted (deleted_at set), related data like
 * posts, comments, and voting history may be preserved for platform integrity
 * and audit purposes according to data retention policies.
 */
export async function test_api_user_account_deletion_data_preservation(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account with unique credentials
  const username = `testuser_${RandomGenerator.alphaNumeric(8)}`;
  const email = `test_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const password = "TestPassword123!";

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username,
        email,
        password,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });

  // Validate user registration and authentication
  typia.assert(user);
  TestValidator.equals("user ID is generated", user.id, user.id);
  TestValidator.equals("username matches input", user.username, username);
  TestValidator.equals("email matches input", user.email, email);
  TestValidator.equals(
    "account status is active",
    user.accountStatus,
    "active",
  );
  TestValidator.equals(
    "business status is active",
    user.businessStatus,
    "active",
  );
  TestValidator.predicate(
    "authentication token exists",
    user.token.access.length > 0,
  );

  // Step 2: Execute account deletion
  await api.functional.redditPlatform.registeredUser.auth.profile.erase(
    connection,
  );

  // Step 3: Verify data preservation by attempting re-registration
  // If soft deletion works correctly, same credentials should work again
  const reRegisteredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username,
        email,
        password,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });

  // Validate re-registration succeeds (proving soft deletion)
  typia.assert(reRegisteredUser);
  TestValidator.notEquals(
    "new user ID differs from original",
    reRegisteredUser.id,
    user.id,
  );
  TestValidator.equals(
    "username can be reused",
    reRegisteredUser.username,
    username,
  );
  TestValidator.equals("email can be reused", reRegisteredUser.email, email);
  TestValidator.predicate(
    "re-registration authentication token exists",
    reRegisteredUser.token.access.length > 0,
  );

  // Verify original user account data is preserved while allowing re-registration
  TestValidator.equals(
    "original user account status unchanged",
    user.accountStatus,
    "active",
  );
  TestValidator.equals(
    "re-registered user account status is active",
    reRegisteredUser.accountStatus,
    "active",
  );
}
