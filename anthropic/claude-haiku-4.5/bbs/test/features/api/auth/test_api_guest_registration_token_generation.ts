import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test guest token generation and validation during registration.
 *
 * Verify that upon successful guest registration, the system generates properly
 * formatted JWT tokens containing valid claims. The access token should have
 * 15-minute expiration from current time, and the refresh token should have
 * 7-day expiration. Confirm token structure and that tokens can be used in
 * Authorization header for subsequent authenticated requests. Test that tokens
 * contain appropriate minimized claims for guest accounts.
 *
 * Test flow:
 *
 * 1. Call guest registration endpoint to create temporary guest account
 * 2. Validate response contains valid session ID and token information
 * 3. Verify access token expiration is approximately 15 minutes from current time
 * 4. Verify refresh token expiration is approximately 7 days from current time
 * 5. Ensure access token expiration is before refresh token expiration
 * 6. Confirm access token is set in Authorization header for authenticated
 *    requests
 */
export async function test_api_guest_registration_token_generation(
  connection: api.IConnection,
) {
  // Get current time for expiration calculations
  const now = new Date();

  // Call guest registration endpoint
  const guestAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.join(connection);

  // Validate complete response structure with type assertion
  // This ensures all type requirements including UUID format, ISO 8601 dates, etc.
  typia.assert(guestAuth);

  // Parse expiration timestamps for business logic validation
  const accessExpiredAt = new Date(guestAuth.token.expired_at);
  const refreshExpiredAt = new Date(guestAuth.token.refreshable_until);

  // Validate access token expiration is approximately 15 minutes (900 seconds)
  const accessExpirationMs = accessExpiredAt.getTime() - now.getTime();
  const expectedAccessExpiration = 15 * 60 * 1000; // 15 minutes in milliseconds
  const accessExpirationDifference = Math.abs(
    accessExpirationMs - expectedAccessExpiration,
  );

  TestValidator.predicate(
    "access token should expire in approximately 15 minutes",
    accessExpirationDifference < 60000, // Allow 1 minute tolerance
  );

  // Validate refresh token expiration is approximately 7 days
  const refreshExpirationMs = refreshExpiredAt.getTime() - now.getTime();
  const expectedRefreshExpiration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const refreshExpirationDifference = Math.abs(
    refreshExpirationMs - expectedRefreshExpiration,
  );

  TestValidator.predicate(
    "refresh token should expire in approximately 7 days",
    refreshExpirationDifference < 60000, // Allow 1 minute tolerance
  );

  // Validate access token expiration is before refresh token expiration
  TestValidator.predicate(
    "access token should expire before refresh token",
    accessExpiredAt.getTime() < refreshExpiredAt.getTime(),
  );

  // Validate Authorization header was set with access token
  TestValidator.predicate(
    "Authorization header should be set with access token",
    connection.headers?.Authorization === guestAuth.token.access,
  );
}
