import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Validates guest user registration with minimal required information.
 *
 * This test verifies that a guest account can be created without any optional
 * parameters. Guest registration is a lightweight onboarding process that
 * creates a temporary user session without requiring email addresses,
 * passwords, or account verification. The system issues both short-lived access
 * tokens (typically 30 minutes) and longer-lived refresh tokens (typically 7
 * days) for session management.
 *
 * Test flow:
 *
 * 1. Register a new guest account with minimal data (empty optional
 *    device_identifier)
 * 2. Verify the guest response contains valid UUID, timestamps, and JWT tokens
 * 3. Confirm the authorization token structure includes access, refresh tokens
 *    with proper expiration
 * 4. Validate that guest ID, timestamps, and token formats are all correctly typed
 *    and structured
 * 5. Ensure token expiration times are properly ordered and in the future
 */
export async function test_api_guest_registration_minimal(
  connection: api.IConnection,
) {
  // Register a new guest account with minimal information (no device identifier)
  const guest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies IDiscussionBoardGuest.ICreate,
    });
  typia.assert(guest);

  // Validate device_identifier is null or undefined (optional field not provided)
  TestValidator.predicate(
    "device_identifier should be null or undefined when not provided",
    guest.device_identifier === null || guest.device_identifier === undefined,
  );

  // Validate token structure exists and contains non-empty tokens
  TestValidator.predicate(
    "access token should be non-empty string",
    typeof guest.token.access === "string" && guest.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be non-empty string",
    typeof guest.token.refresh === "string" && guest.token.refresh.length > 0,
  );

  // Validate that expiration times are in the future
  const now = new Date();
  const expiredAt = new Date(guest.token.expired_at);
  const refreshableUntil = new Date(guest.token.refreshable_until);

  TestValidator.predicate(
    "access token should expire in the future",
    expiredAt > now,
  );

  TestValidator.predicate(
    "refresh token should be valid longer than access token",
    refreshableUntil > expiredAt,
  );

  // Validate that the access token is properly set in connection headers for authenticated requests
  TestValidator.predicate(
    "authorization header should contain access token",
    connection.headers?.Authorization === `Bearer ${guest.token.access}` ||
      connection.headers?.Authorization === guest.token.access,
  );
}
