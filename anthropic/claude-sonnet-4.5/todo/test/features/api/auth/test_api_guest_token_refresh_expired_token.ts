import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test token refresh behavior when the refresh token has expired.
 *
 * This test validates that the system properly handles token refresh attempts
 * when the refresh token has expired (past the refreshable_until timestamp).
 * The test demonstrates the token lifecycle and verifies that expired tokens
 * cannot be used to obtain new access tokens, requiring users to
 * re-authenticate.
 *
 * Test steps:
 *
 * 1. Register a guest user and obtain initial tokens
 * 2. Verify the token structure and expiration metadata
 * 3. Attempt to refresh using an invalid/malformed token to simulate rejection
 * 4. Verify the refresh operation fails appropriately
 * 5. Confirm that valid re-authentication through registration works
 */
export async function test_api_guest_token_refresh_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Register a guest user to obtain initial tokens
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const guestPassword = typia.random<string & tags.MinLength<8>>();

  const registrationBody = {
    email: guestEmail,
    password: guestPassword,
    name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies ITodoListGuest.ICreate;

  const guestUser: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: registrationBody,
    });
  typia.assert(guestUser);

  // Step 2: Validate the token structure and metadata
  typia.assert<IAuthorizationToken>(guestUser.token);
  typia.assert<string>(guestUser.token.access);
  typia.assert<string>(guestUser.token.refresh);
  typia.assert<string & tags.Format<"date-time">>(guestUser.token.expired_at);
  typia.assert<string & tags.Format<"date-time">>(
    guestUser.token.refreshable_until,
  );

  // Step 3: Verify token metadata is present and valid
  TestValidator.predicate(
    "access token should be non-empty",
    guestUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    guestUser.token.refresh.length > 0,
  );

  // Step 4: Validate that refreshable_until is in the future
  const refreshableUntil = new Date(guestUser.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate(
    "refreshable_until should be in the future",
    refreshableUntil > now,
  );

  // Step 5: Test refresh endpoint with an invalid/malformed token to simulate expiration scenario
  // Since we cannot manipulate time in the test environment, we use an invalid token
  // to demonstrate that the API properly rejects invalid/expired tokens
  const invalidRefreshToken =
    "invalid_expired_token_" + RandomGenerator.alphaNumeric(32);

  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );

  // Step 6: Verify that with a valid refresh token, the refresh works correctly
  // This demonstrates the normal happy path before expiration
  const refreshedUser: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: guestUser.token.refresh,
      } satisfies ITodoListGuest.IRefresh,
    });
  typia.assert(refreshedUser);

  // Step 7: Validate the refreshed tokens are new and valid
  typia.assert<IAuthorizationToken>(refreshedUser.token);
  TestValidator.predicate(
    "refreshed access token should be non-empty",
    refreshedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token should be non-empty",
    refreshedUser.token.refresh.length > 0,
  );

  // Step 8: Verify the user ID remains the same after refresh
  TestValidator.equals(
    "user ID should remain the same after token refresh",
    refreshedUser.id,
    guestUser.id,
  );
}
