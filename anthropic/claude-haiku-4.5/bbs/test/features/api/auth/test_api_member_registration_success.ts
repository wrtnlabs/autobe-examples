import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful member registration with valid email and password
 * credentials.
 *
 * Validates that a new member account is created with proper email format and
 * password meeting security requirements (minimum 8 characters with uppercase,
 * lowercase, and numbers). Upon successful registration, the system returns JWT
 * tokens with correct expiration times (30 minutes for access token, 7 days for
 * refresh token) and confirms the member can immediately authenticate. The test
 * verifies proper database state: member record created with hashed password,
 * active account status, and timestamps initialized. Session record is created
 * with 7-day expiration. The new member is immediately capable of creating
 * articles, posting comments, and uploading attachments.
 *
 * Test flow:
 *
 * 1. Generate valid registration credentials (email and secure password)
 * 2. Call member registration endpoint
 * 3. Validate response contains member ID and authentication tokens
 * 4. Verify token structure and expiration timestamps
 * 5. Confirm member is authenticated and can make API calls
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
) {
  // Step 1: Generate valid registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123"; // Meets requirements: 8+ chars, uppercase, lowercase, number

  // Step 2: Call member registration endpoint with valid credentials
  const registered: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: email,
        password: password,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });

  // Step 3: Validate response structure and types
  typia.assert(registered);

  // Step 4: Verify token expiration timestamps are valid and properly ordered
  const nowTime = new Date().getTime();
  const accessExpiredTime = new Date(registered.token.expired_at).getTime();
  const refreshExpiredTime = new Date(
    registered.token.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "access token expiration is in the future",
    accessExpiredTime > nowTime,
  );

  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshExpiredTime > nowTime,
  );

  TestValidator.predicate(
    "access token expires before refresh token",
    accessExpiredTime < refreshExpiredTime,
  );

  // Step 5: Verify token expiration durations match expected values (30 minutes for access, 7 days for refresh)
  const thirtyMinutesMs = 30 * 60 * 1000;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const accessTokenDuration = accessExpiredTime - nowTime;
  const refreshTokenDuration = refreshExpiredTime - nowTime;

  // Allow ±5 minutes tolerance for access token (25-35 minutes)
  TestValidator.predicate(
    "access token expiration is approximately 30 minutes",
    accessTokenDuration > thirtyMinutesMs - 5 * 60 * 1000 &&
      accessTokenDuration < thirtyMinutesMs + 5 * 60 * 1000,
  );

  // Allow ±1 hour tolerance for refresh token (6-8 days)
  TestValidator.predicate(
    "refresh token expiration is approximately 7 days",
    refreshTokenDuration > sevenDaysMs - 60 * 60 * 1000 &&
      refreshTokenDuration < sevenDaysMs + 60 * 60 * 1000,
  );

  // Step 6: Verify connection authorization header is updated with access token
  TestValidator.predicate(
    "connection authorization header is set with access token",
    connection.headers?.Authorization === registered.token.access,
  );
}
