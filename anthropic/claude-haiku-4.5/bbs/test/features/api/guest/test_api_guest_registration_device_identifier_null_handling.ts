import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test guest registration with explicit null device_identifier handling.
 *
 * Validates that guest registration correctly handles explicit null values for
 * the optional device_identifier parameter. The test confirms that:
 *
 * 1. Guest registration succeeds when device_identifier is explicitly null
 * 2. The response correctly reflects device_identifier as null in the result
 * 3. Explicit null handling is equivalent to omitting the parameter entirely
 * 4. The system generates proper JWT tokens for authenticated guest sessions
 *
 * This ensures flexible parameter handling in the registration process where
 * optional parameters can be explicitly set to null or omitted without causing
 * failures.
 */
export async function test_api_guest_registration_device_identifier_null_handling(
  connection: api.IConnection,
) {
  // Test 1: Register guest with explicit null device_identifier
  const guestWithNullDeviceId: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        device_identifier: null,
      } satisfies IDiscussionBoardGuest.ICreate,
    });
  typia.assert(guestWithNullDeviceId);

  // Validate device_identifier is null in response
  TestValidator.equals(
    "device_identifier should be null when explicitly set to null",
    guestWithNullDeviceId.device_identifier,
    null,
  );

  // Test 2: Register guest without device_identifier parameter
  const guestWithoutDeviceId: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies IDiscussionBoardGuest.ICreate,
    });
  typia.assert(guestWithoutDeviceId);

  // Validate equivalence: omitting parameter should behave same as explicit null
  TestValidator.predicate(
    "device_identifier should be null or undefined when omitted",
    guestWithoutDeviceId.device_identifier === null ||
      guestWithoutDeviceId.device_identifier === undefined,
  );

  // Validate both guests are different
  TestValidator.notEquals(
    "different registrations should create different guest IDs",
    guestWithNullDeviceId.id,
    guestWithoutDeviceId.id,
  );

  // Test 3: Register guest with actual device_identifier value
  const deviceId = RandomGenerator.alphaNumeric(16);
  const guestWithDeviceId: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        device_identifier: deviceId,
      } satisfies IDiscussionBoardGuest.ICreate,
    });
  typia.assert(guestWithDeviceId);

  // Validate device_identifier is preserved when provided
  TestValidator.equals(
    "device_identifier should be preserved when provided",
    guestWithDeviceId.device_identifier,
    deviceId,
  );

  // Validate all three guests have different IDs
  TestValidator.notEquals(
    "guest with device_identifier should have different ID",
    guestWithNullDeviceId.id,
    guestWithDeviceId.id,
  );
  TestValidator.notEquals(
    "guests without and with device_identifier should have different IDs",
    guestWithoutDeviceId.id,
    guestWithDeviceId.id,
  );

  // Validate token expiration times are in the future
  const now = new Date();
  TestValidator.predicate(
    "access token expiration should be in the future",
    new Date(guestWithNullDeviceId.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refresh token expiration should be in the future",
    new Date(guestWithNullDeviceId.token.refreshable_until) > now,
  );
}
