import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Validates guest registration and JWT token structure.
 *
 * Tests that guest registration returns properly structured JWT tokens with all
 * required fields. Validates the authorization token response contains: access
 * token (JWT string), refresh token (JWT string), expired_at (ISO 8601
 * date-time for access token expiration), and refreshable_until (ISO 8601
 * date-time for refresh token expiration). Verifies token expiration times
 * follow expected patterns where expired_at occurs before refreshable_until,
 * and both are in the future relative to created_at.
 *
 * Steps:
 *
 * 1. Register a guest user with optional device identifier
 * 2. Validate response structure and all required fields via typia.assert()
 * 3. Verify access and refresh tokens are valid JWT strings with proper format
 * 4. Confirm expiration logic: created_at < expired_at < refreshable_until
 * 5. Verify token lifetimes align with system defaults (~30 min access, ~7 days
 *    refresh)
 */
export async function test_api_guest_registration_token_structure_validation(
  connection: api.IConnection,
) {
  // Register guest with device identifier
  const deviceIdentifier = RandomGenerator.alphaNumeric(32);
  const guestResponse = await api.functional.auth.guest.join(connection, {
    body: {
      device_identifier: deviceIdentifier,
    } satisfies IDiscussionBoardGuest.ICreate,
  });

  // Validate complete response structure and all field types
  typia.assert(guestResponse);

  // Validate device identifier is preserved in response
  TestValidator.equals(
    "device identifier should match request",
    guestResponse.device_identifier,
    deviceIdentifier,
  );

  // Get token object
  const token = guestResponse.token;

  // Validate access token is a non-empty string
  TestValidator.predicate(
    "access token should be a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );

  // Validate refresh token is a non-empty string
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // Validate access tokens typically have 3 parts separated by dots (JWT format)
  TestValidator.predicate(
    "access token should have JWT format (3 parts separated by dots)",
    (token.access.match(/\./g) || []).length === 2,
  );

  // Validate refresh token has JWT format
  TestValidator.predicate(
    "refresh token should have JWT format (3 parts separated by dots)",
    (token.refresh.match(/\./g) || []).length === 2,
  );

  // Parse timestamps for expiration comparison
  const createdTime = new Date(guestResponse.created_at).getTime();
  const expiredTime = new Date(token.expired_at).getTime();
  const refreshableTime = new Date(token.refreshable_until).getTime();

  // Validate expiration timeline: created_at < expired_at < refreshable_until
  TestValidator.predicate(
    "expired_at should be after created_at",
    expiredTime > createdTime,
  );

  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    refreshableTime > expiredTime,
  );

  // Validate typical token expiration times (access ~30 min, refresh ~7 days)
  const thirtyMinutes = 30 * 60 * 1000;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const accessTokenLifetime = expiredTime - createdTime;
  const refreshTokenLifetime = refreshableTime - createdTime;

  // Access token should be reasonably close to 30 minutes
  TestValidator.predicate(
    "access token lifetime should be approximately 30 minutes (within reasonable range)",
    accessTokenLifetime > thirtyMinutes * 0.5 &&
      accessTokenLifetime < thirtyMinutes * 2,
  );

  // Refresh token should be reasonably close to 7 days
  TestValidator.predicate(
    "refresh token lifetime should be approximately 7 days (within reasonable range)",
    refreshTokenLifetime > sevenDays * 0.5 &&
      refreshTokenLifetime < sevenDays * 2,
  );

  // Test without device identifier
  const guestResponseNoDevice = await api.functional.auth.guest.join(
    connection,
    {
      body: {} satisfies IDiscussionBoardGuest.ICreate,
    },
  );

  typia.assert(guestResponseNoDevice);

  // Verify response still has valid token structure
  TestValidator.predicate(
    "guest without device identifier should still have valid token",
    typeof guestResponseNoDevice.token.access === "string" &&
      typeof guestResponseNoDevice.token.refresh === "string" &&
      guestResponseNoDevice.token.access.length > 0 &&
      guestResponseNoDevice.token.refresh.length > 0,
  );

  // Validate JWT format for guest without device identifier
  TestValidator.predicate(
    "access token should have JWT format (no device id case)",
    (guestResponseNoDevice.token.access.match(/\./g) || []).length === 2,
  );

  TestValidator.predicate(
    "refresh token should have JWT format (no device id case)",
    (guestResponseNoDevice.token.refresh.match(/\./g) || []).length === 2,
  );

  // Validate expiration timeline for guest without device identifier
  const createdTime2 = new Date(guestResponseNoDevice.created_at).getTime();
  const expiredTime2 = new Date(
    guestResponseNoDevice.token.expired_at,
  ).getTime();
  const refreshableTime2 = new Date(
    guestResponseNoDevice.token.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "expired_at should be after created_at (no device id case)",
    expiredTime2 > createdTime2,
  );

  TestValidator.predicate(
    "refreshable_until should be after expired_at (no device id case)",
    refreshableTime2 > expiredTime2,
  );
}
