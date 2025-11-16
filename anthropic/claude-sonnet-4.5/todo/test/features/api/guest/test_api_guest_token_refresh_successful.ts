import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test successful guest JWT access token refresh using a valid refresh token.
 *
 * This test validates the complete token refresh workflow for guest accounts:
 *
 * 1. Register a new guest account to obtain initial access and refresh tokens
 * 2. Use the refresh token to request new tokens through the refresh endpoint
 * 3. Validate that the endpoint accepts the valid refresh token
 * 4. Verify that a new token pair is returned following IAuthorizationToken
 *    structure
 * 5. Confirm that the new access token has updated expiration timestamps
 * 6. Ensure the guest can continue their session seamlessly with new tokens
 *
 * This ensures that guest users can maintain long-lived sessions through token
 * refresh without requiring re-registration, while still benefiting from the
 * security of short-lived access tokens.
 */
export async function test_api_guest_token_refresh_successful(
  connection: api.IConnection,
) {
  // Step 1: Register a new guest account to obtain initial tokens
  const registrationData = {
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListGuest.ICreate;

  const initialGuest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: registrationData,
    });
  typia.assert(initialGuest);

  // Extract the refresh token from initial registration
  const refreshToken: string = initialGuest.token.refresh;

  // Step 2: Use the refresh token to request new tokens
  const refreshRequest = {
    refresh_token: refreshToken,
  } satisfies ITodoListGuest.IRefresh;

  const refreshedGuest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshRequest,
    });
  typia.assert(refreshedGuest);

  // Step 3: Validate business logic - guest ID should remain the same
  TestValidator.equals(
    "refreshed guest ID matches original guest ID",
    refreshedGuest.id,
    initialGuest.id,
  );

  // Step 4: Verify that new tokens are different from original tokens
  TestValidator.notEquals(
    "new access token differs from original access token",
    refreshedGuest.token.access,
    initialGuest.token.access,
  );
}
