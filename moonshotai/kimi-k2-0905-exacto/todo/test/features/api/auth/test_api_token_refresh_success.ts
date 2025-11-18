import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEmailAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEmailAddress";
import type { IIPAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IIPAddress";
import type { IPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/IPassword";
import type { IRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IRefreshToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { IURI } from "@ORGANIZATION/PROJECT-api/lib/structures/IURI";

/**
 * Test successful JWT token refresh operation.
 *
 * This comprehensive test validates the complete token refresh workflow:
 *
 * 1. Creates a new user account with random credentials
 * 2. Authenticates the user to obtain initial access and refresh tokens
 * 3. Verifies the initial token structure and expiration times
 * 4. Successfully refreshes the access token using the refresh token
 * 5. Validates that new tokens are issued with updated expiration times
 * 6. Confirms that the old refresh token becomes invalid after successful rotation
 *
 * The test ensures that the token refresh mechanism works correctly, maintains
 * proper authentication state, and follows security best practices for token
 * rotation and expiration management.
 */
export async function test_api_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const signupEmail = typia.random<string & tags.Format<"email">>();
  const signupData = {
    email: signupEmail,
    password: "TestPassword123!",
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ITodoAppUser.ICreate;

  const newUser = await api.functional.auth.user.join(connection, {
    body: signupData,
  });
  typia.assert(newUser);

  // Validate initial user creation response
  TestValidator.equals("user email matches signup", newUser.email, signupEmail);
  TestValidator.predicate(
    "user has active status",
    newUser.status === "active",
  );
  TestValidator.equals("user has name field", newUser.name, null);

  // Step 2: Extract initial tokens
  const initialAccessToken = newUser.token.access;
  const initialRefreshToken = newUser.token.refresh;
  const initialExpiredAt = newUser.token.expired_at;
  const initialRefreshableUntil = newUser.token.refreshable_until;

  // Validate initial token format and timestamps
  TestValidator.predicate("access token exists", initialAccessToken !== null);
  TestValidator.predicate("refresh token exists", initialRefreshToken !== null);
  TestValidator.predicate(
    "expired_at is in future",
    new Date(initialExpiredAt) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    new Date(initialRefreshableUntil) > new Date(),
  );

  // Step 3: Wait briefly to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 4: Refresh tokens using the refresh token
  const refreshData = {
    refresh_token: initialRefreshToken,
  } satisfies ITodoAppUser.IRefresh;

  const refreshedUser = await api.functional.auth.user.refresh(connection, {
    body: refreshData,
  });
  typia.assert(refreshedUser);

  // Step 5: Extract refreshed tokens
  const refreshedAccessToken = refreshedUser.token.access;
  const refreshedRefreshToken = refreshedUser.token.refresh;
  const refreshedExpiredAt = refreshedUser.token.expired_at;
  const refreshedRefreshableUntil = refreshedUser.token.refreshable_until;

  // Step 6: Validate token refresh results
  TestValidator.notEquals(
    "new access token differs from original",
    refreshedAccessToken,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshedRefreshToken,
    initialRefreshToken,
  );
  TestValidator.equals(
    "user ID remains the same",
    refreshedUser.id,
    newUser.id,
  );
  TestValidator.equals(
    "user email remains the same",
    refreshedUser.email,
    newUser.email,
  );

  // Step 7: Validate timestamp progression
  TestValidator.predicate(
    "new expired_at is later than original",
    new Date(refreshedExpiredAt) > new Date(initialExpiredAt),
  );
  TestValidator.predicate(
    "new refreshable_until is later than original",
    new Date(refreshedRefreshableUntil) > new Date(initialRefreshableUntil),
  );

  // Step 8: Test that old refresh token is now invalid
  await TestValidator.error(
    "old refresh token should be invalid after successful refresh",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: { refresh_token: initialRefreshToken },
      });
    },
  );

  // Step 9: Test with invalid refresh token
  await TestValidator.error("invalid refresh token should fail", async () => {
    await api.functional.auth.user.refresh(connection, {
      body: { refresh_token: "invalid_refresh_token_123" },
    });
  });

  // Step 10: Validate new tokens work for subsequent operations
  const connectionWithNewToken = { ...connection };
  connectionWithNewToken.headers = {
    Authorization: refreshedAccessToken,
  };

  // Note: Since we don't have other authenticated endpoints in the provided APIs,
  // we just validate the structure of the refreshed user object
  TestValidator.predicate(
    "refreshed user has valid ID",
    typeof refreshedUser.id === "string",
  );
  TestValidator.predicate(
    "refreshed user has valid email",
    typeof refreshedUser.email === "string",
  );

  console.log(
    "Token refresh test completed successfully with proper token rotation",
  );
}
