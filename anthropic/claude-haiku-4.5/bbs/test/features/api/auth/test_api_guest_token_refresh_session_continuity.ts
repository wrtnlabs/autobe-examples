import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Validates guest token refresh maintains session continuity across multiple
 * refresh cycles.
 *
 * This test verifies that guest users can seamlessly maintain their session
 * through multiple token refresh operations. The test workflow:
 *
 * 1. Register a guest user with optional device identifier for session tracking
 * 2. Perform initial token refresh using the refresh token from registration
 * 3. Perform a second token refresh using the newly obtained refresh token
 * 4. Verify guest ID consistency across all three operations (registration, first
 *    refresh, second refresh)
 * 5. Verify device identifier consistency across all operations
 * 6. Confirm each refresh operation returns unique access tokens while maintaining
 *    session identity
 * 7. Validate token expiration times are properly set on all token responses
 *
 * This test ensures that guest sessions are properly maintained without
 * requiring re-registration, and that the refresh token mechanism enables
 * seamless session continuity for extended browsing periods.
 */
export async function test_api_guest_token_refresh_session_continuity(
  connection: api.IConnection,
) {
  // Step 1: Register a guest user with a device identifier
  const deviceIdentifier = RandomGenerator.alphaNumeric(32);
  const initialGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        device_identifier: deviceIdentifier,
      } satisfies IDiscussionBoardGuest.ICreate,
    });
  typia.assert(initialGuest);

  // Verify initial guest registration
  TestValidator.predicate(
    "initial guest should have valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      initialGuest.id,
    ),
  );
  TestValidator.equals(
    "device identifier should match input",
    initialGuest.device_identifier,
    deviceIdentifier,
  );
  TestValidator.predicate(
    "initial guest should have access token",
    initialGuest.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial guest should have refresh token",
    initialGuest.token.refresh.length > 0,
  );

  // Step 2: Perform first token refresh using the refresh token from registration
  const firstRefreshResponse: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: initialGuest.token.refresh,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  typia.assert(firstRefreshResponse);

  // Verify first refresh maintains guest session continuity
  TestValidator.equals(
    "first refresh should return same guest id",
    firstRefreshResponse.id,
    initialGuest.id,
  );
  TestValidator.equals(
    "first refresh should preserve device identifier",
    firstRefreshResponse.device_identifier,
    deviceIdentifier,
  );
  TestValidator.notEquals(
    "first refresh should return different access token",
    firstRefreshResponse.token.access,
    initialGuest.token.access,
  );
  TestValidator.predicate(
    "first refresh should return valid new access token",
    firstRefreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "first refresh should return valid refresh token",
    firstRefreshResponse.token.refresh.length > 0,
  );

  // Step 3: Perform second token refresh using the refresh token from first refresh
  const secondRefreshResponse: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: firstRefreshResponse.token.refresh,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  typia.assert(secondRefreshResponse);

  // Verify second refresh maintains guest session continuity
  TestValidator.equals(
    "second refresh should return same guest id",
    secondRefreshResponse.id,
    initialGuest.id,
  );
  TestValidator.equals(
    "second refresh should preserve device identifier",
    secondRefreshResponse.device_identifier,
    deviceIdentifier,
  );
  TestValidator.notEquals(
    "second refresh should return different access token from first refresh",
    secondRefreshResponse.token.access,
    firstRefreshResponse.token.access,
  );
  TestValidator.notEquals(
    "second refresh should return different access token from registration",
    secondRefreshResponse.token.access,
    initialGuest.token.access,
  );
  TestValidator.predicate(
    "second refresh should return valid new access token",
    secondRefreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "second refresh should return valid refresh token",
    secondRefreshResponse.token.refresh.length > 0,
  );

  // Step 4: Verify token expiration times are properly managed across refreshes
  TestValidator.predicate(
    "initial token should have future expiration",
    new Date(initialGuest.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "first refresh token should have future expiration",
    new Date(firstRefreshResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "second refresh token should have future expiration",
    new Date(secondRefreshResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token should remain valid beyond access token expiration",
    new Date(initialGuest.token.refreshable_until) >
      new Date(initialGuest.token.expired_at),
  );
}
