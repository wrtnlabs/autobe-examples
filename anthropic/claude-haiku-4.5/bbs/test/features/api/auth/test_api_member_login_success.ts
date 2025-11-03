import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate successful member login workflow with valid registered email and
 * password credentials.
 *
 * This test verifies the complete login flow for an authenticated member:
 *
 * 1. First, a new member account is registered via POST /auth/member/join with
 *    unique email and secure password
 * 2. The registered member then logs in via POST /auth/member/login using the same
 *    credentials
 * 3. Upon successful authentication, the system returns JWT tokens (access with
 *    30-min expiration, refresh with 7-day expiration)
 * 4. Member profile information is included in the response (ID, email, account
 *    status)
 * 5. A session record is created in the database with proper timestamps
 * 6. The member transitions from unauthenticated to authenticated state with full
 *    content permissions
 *
 * Steps:
 *
 * 1. Generate valid test credentials (email and password meeting security
 *    requirements)
 * 2. Register new member account and receive initial authorization tokens
 * 3. Verify registration response contains valid JWT tokens and member ID
 * 4. Perform login with registered credentials
 * 5. Validate login response contains properly formatted authorization tokens
 * 6. Verify token structure includes access, refresh, expired_at, and
 *    refreshable_until fields
 * 7. Confirm member profile data is present in response
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
) {
  // Step 1: Generate valid test credentials
  // Password must be 8+ chars with uppercase, lowercase, and number
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "TestPass123"; // Meets security: 8 chars, uppercase, lowercase, number

  // Step 2: Register a new member account
  const registerResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: testEmail,
        password: testPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });

  typia.assert(registerResponse);

  // Validate registration response contains required fields
  TestValidator.predicate(
    "registration response contains member ID",
    registerResponse.id.length > 0,
  );
  TestValidator.predicate(
    "registration response contains valid access token",
    registerResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "registration response contains valid refresh token",
    registerResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "registration response has token expiration timestamp",
    registerResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "registration response has refreshable_until timestamp",
    registerResponse.token.refreshable_until.length > 0,
  );

  // Step 3: Perform login with the registered credentials
  const loginResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: testEmail,
        password: testPassword,
      } satisfies IDiscussionBoardMember.ILoginRequest,
    });

  typia.assert(loginResponse);

  // Step 4: Verify login response matches registration member ID
  TestValidator.equals(
    "login response member ID matches registered member ID",
    loginResponse.id,
    registerResponse.id,
  );

  // Step 5: Validate login returned valid JWT tokens
  TestValidator.predicate(
    "login response contains valid access token",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response contains valid refresh token",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login response has token expiration timestamp",
    loginResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "login response has refreshable_until timestamp",
    loginResponse.token.refreshable_until.length > 0,
  );

  // Step 6: Validate token timestamps are properly formatted and in future
  const now = new Date();
  const expiredAt = new Date(loginResponse.token.expired_at);
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);

  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntil > expiredAt,
  );

  // Step 7: Validate member has successfully transitioned to authenticated state
  TestValidator.predicate(
    "authenticated member has valid authorization tokens",
    loginResponse.token.access.length > 0 &&
      loginResponse.token.refresh.length > 0,
  );
}
