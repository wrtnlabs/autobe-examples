import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test that token refresh returns properly formatted authorization response.
 *
 * Guest users receive both short-lived access tokens and longer-lived refresh
 * tokens upon registration. This test verifies that when refreshing an expired
 * or expiring access token using the refresh token, the response maintains the
 * same authorization structure as the initial registration.
 *
 * Specifically, this test:
 *
 * 1. Registers a new guest account with an optional device identifier
 * 2. Captures the initial authorization response (id, device_identifier,
 *    created_at, token)
 * 3. Calls the token refresh endpoint with the refresh token
 * 4. Validates the refresh response includes all required fields with correct
 *    structure
 * 5. Confirms the guest id and created_at remain unchanged (immutable properties)
 * 6. Confirms device_identifier matches the original (if provided)
 * 7. Confirms the token object structure is complete with all required fields
 * 8. Validates that new access and refresh tokens are provided
 * 9. Ensures response structure is consistent between registration and refresh
 *    cycles
 */
export async function test_api_guest_token_refresh_returns_authorization_structure(
  connection: api.IConnection,
) {
  // Step 1: Register a guest account with optional device identifier
  const deviceIdentifier = RandomGenerator.alphaNumeric(32);
  const joinResponse: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        device_identifier: deviceIdentifier,
      } satisfies IDiscussionBoardGuest.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Verify initial response structure
  TestValidator.equals(
    "initial response device_identifier matches input",
    joinResponse.device_identifier,
    deviceIdentifier,
  );

  // Store initial values for comparison after refresh
  const initialGuestId = joinResponse.id;
  const initialCreatedAt = joinResponse.created_at;
  const initialToken = joinResponse.token;
  typia.assert(initialToken);

  // Step 3: Call refresh endpoint with the refresh token
  const refreshResponse: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: initialToken.refresh,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  typia.assert(refreshResponse);

  // Step 4: Validate refresh response structure is consistent
  const refreshedToken = refreshResponse.token;
  typia.assert(refreshedToken);

  // Step 5: Confirm immutable properties remain unchanged
  TestValidator.equals(
    "guest id unchanged after refresh",
    refreshResponse.id,
    initialGuestId,
  );
  TestValidator.equals(
    "created_at unchanged after refresh",
    refreshResponse.created_at,
    initialCreatedAt,
  );

  // Step 6: Confirm device_identifier consistency
  if (joinResponse.device_identifier !== undefined) {
    TestValidator.equals(
      "device_identifier matches after refresh",
      refreshResponse.device_identifier,
      joinResponse.device_identifier,
    );
  }

  // Step 7: Validate refreshed token has all required fields
  TestValidator.predicate(
    "refreshed token has all required fields",
    refreshedToken.access !== undefined &&
      refreshedToken.refresh !== undefined &&
      refreshedToken.expired_at !== undefined &&
      refreshedToken.refreshable_until !== undefined,
  );

  // Step 8: Confirm new tokens are generated (different from original)
  TestValidator.notEquals(
    "refresh generates new access token",
    refreshedToken.access,
    initialToken.access,
  );
  TestValidator.notEquals(
    "refresh generates new refresh token",
    refreshedToken.refresh,
    initialToken.refresh,
  );

  // Step 9: Validate response structure consistency
  // Both join and refresh responses have the same structural properties
  TestValidator.predicate(
    "refresh response has same structure as join response",
    refreshResponse.id !== undefined &&
      refreshResponse.created_at !== undefined &&
      refreshResponse.token !== undefined &&
      refreshResponse.token.access !== undefined &&
      refreshResponse.token.refresh !== undefined &&
      refreshResponse.token.expired_at !== undefined &&
      refreshResponse.token.refreshable_until !== undefined,
  );
}
