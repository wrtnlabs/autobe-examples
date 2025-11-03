import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful guest user registration workflow.
 *
 * When an unauthenticated visitor accesses the discussion board, they should be
 * able to register as a guest without providing email or password. The system
 * generates a new guest account record and issues JWT tokens (access token with
 * 15-minute expiration and refresh token with 7-day expiration).
 *
 * This test validates:
 *
 * 1. Guest registration completes successfully without credentials
 * 2. Response includes a valid guest session ID and tokens
 * 3. Access token expires in approximately 15 minutes
 * 4. Refresh token expires in approximately 7 days
 * 5. Access token expiration is before refresh token expiration
 * 6. Token timestamps are in the future
 */
export async function test_api_guest_registration_successful(
  connection: api.IConnection,
) {
  // Step 1: Register as guest without credentials
  const guestAccount: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guestAccount);

  // Step 2: Verify expiration times are valid and in the future
  const now = new Date();
  const accessTokenExpired = new Date(guestAccount.token.expired_at);
  const refreshTokenExpired = new Date(guestAccount.token.refreshable_until);

  TestValidator.predicate(
    "access token expiration is in the future",
    accessTokenExpired > now,
  );

  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshTokenExpired > now,
  );

  // Step 3: Verify access token expires before refresh token
  TestValidator.predicate(
    "access token expires before refresh token",
    accessTokenExpired < refreshTokenExpired,
  );

  // Step 4: Verify access token expires in approximately 15 minutes
  const accessExpireMs = accessTokenExpired.getTime() - now.getTime();
  const fifteenMinutesMs = 15 * 60 * 1000;
  const tolerance = 2 * 60 * 1000; // 2-minute tolerance for execution time
  TestValidator.predicate(
    "access token expiration is approximately 15 minutes from now",
    Math.abs(accessExpireMs - fifteenMinutesMs) < tolerance,
  );

  // Step 5: Verify refresh token expires in approximately 7 days
  const refreshExpireMs = refreshTokenExpired.getTime() - now.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  TestValidator.predicate(
    "refresh token expiration is approximately 7 days from now",
    Math.abs(refreshExpireMs - sevenDaysMs) < tolerance,
  );

  // Step 6: Verify Authorization header is automatically set with access token
  TestValidator.predicate(
    "connection Authorization header is set with guest access token",
    connection.headers?.Authorization === guestAccount.token.access,
  );
}
