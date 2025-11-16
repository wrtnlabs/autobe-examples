import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful guest account creation that grants temporary read-only
 * access.
 *
 * Validates that the guest account creation endpoint:
 *
 * - Accepts a join request without requiring credentials
 * - Returns a valid guest account with unique UUID identifier
 * - Issues both access and refresh JWT tokens
 * - Provides proper ISO 8601 formatted expiration timestamps
 * - Generates tokens suitable for authenticated API requests
 * - Maintains proper token structure for session management
 *
 * This test verifies the complete guest onboarding flow and token generation.
 */
export async function test_api_guest_account_creation_successful(
  connection: api.IConnection,
) {
  // Create a guest account
  const guestAccount: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guestAccount);

  // Validate guest account ID is present
  TestValidator.predicate(
    "guest account has valid ID",
    guestAccount.id.length > 0,
  );

  // Validate token structure
  TestValidator.predicate(
    "access token is not empty",
    guestAccount.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    guestAccount.token.refresh.length > 0,
  );

  // Validate expiration timestamps exist and are properly formatted
  TestValidator.predicate(
    "access token expiration timestamp is present",
    guestAccount.token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refresh token expiration timestamp is present",
    guestAccount.token.refreshable_until.length > 0,
  );

  // Validate expiration logic
  const now = new Date();
  const accessExpiry = new Date(guestAccount.token.expired_at);
  const refreshExpiry = new Date(guestAccount.token.refreshable_until);

  TestValidator.predicate(
    "access token expiration is in the future",
    accessExpiry.getTime() > now.getTime(),
  );

  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshExpiry.getTime() > now.getTime(),
  );

  TestValidator.predicate(
    "refresh token expiration is after access token expiration",
    refreshExpiry.getTime() > accessExpiry.getTime(),
  );

  // Verify that the connection headers were updated with the access token
  TestValidator.predicate(
    "connection headers contain authorization token",
    connection.headers?.Authorization ===
      `Bearer ${guestAccount.token.access}` ||
      connection.headers?.Authorization === guestAccount.token.access,
  );
}
