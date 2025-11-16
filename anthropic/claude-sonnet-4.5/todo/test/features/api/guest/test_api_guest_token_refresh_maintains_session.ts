import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test that guest token refresh maintains session continuity and preserves
 * guest account context.
 *
 * This test validates the guest token refresh mechanism by:
 *
 * 1. Registering a guest account and obtaining initial tokens
 * 2. Performing a token refresh operation
 * 3. Verifying that the refreshed tokens maintain the same guest account ID
 * 4. Confirming session continuity throughout the refresh process
 * 5. Ensuring guest account information remains consistent
 *
 * The test ensures that token refresh enables long-lived guest sessions while
 * maintaining security through short-lived access tokens without creating new
 * sessions.
 */
export async function test_api_guest_token_refresh_maintains_session(
  connection: api.IConnection,
) {
  // Step 1: Register a guest account and obtain initial tokens
  const initialGuest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(initialGuest);

  // Step 2: Extract the refresh token from the initial response
  const refreshToken: string = initialGuest.token.refresh;
  typia.assert<string>(refreshToken);

  // Step 3: Perform token refresh operation
  const refreshedGuest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ITodoListGuest.IRefresh,
    });
  typia.assert(refreshedGuest);

  // Step 4: Validate that the guest account ID remains the same
  TestValidator.equals(
    "guest ID should remain consistent after token refresh",
    refreshedGuest.id,
    initialGuest.id,
  );

  // Step 5: Validate that the IP address remains the same
  TestValidator.equals(
    "guest IP should remain consistent after token refresh",
    refreshedGuest.ip,
    initialGuest.ip,
  );

  // Step 6: Validate that the created_at timestamp remains the same
  TestValidator.equals(
    "guest created_at should remain consistent after token refresh",
    refreshedGuest.created_at,
    initialGuest.created_at,
  );

  // Step 7: Validate that new tokens were issued (they should differ from initial tokens)
  TestValidator.notEquals(
    "new access token should be different from initial access token",
    refreshedGuest.token.access,
    initialGuest.token.access,
  );

  // Step 8: Validate that the refreshed token structure is valid
  typia.assert<IAuthorizationToken>(refreshedGuest.token);

  // Step 9: Verify that the new access token is automatically set in connection headers
  if (connection.headers && connection.headers.Authorization) {
    TestValidator.equals(
      "connection headers should contain new access token",
      connection.headers.Authorization,
      refreshedGuest.token.access,
    );
  }
}
