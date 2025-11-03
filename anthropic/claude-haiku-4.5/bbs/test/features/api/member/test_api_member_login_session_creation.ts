import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that successful login creates proper session and returns JWT
 * authentication token.
 *
 * Validates the login workflow and session initialization:
 *
 * 1. Register a new member account with valid email and password credentials
 * 2. Login with the registered member's credentials
 * 3. Verify login response contains correct member information
 * 4. Verify JWT token is properly generated with appropriate expiration
 * 5. Verify refresh token expiration aligns with 7-day session duration policy
 *
 * This test ensures authentication flow works correctly, member identity is
 * properly returned, and tokens are issued with appropriate expiration times
 * for session security enforcement.
 */
export async function test_api_member_login_session_creation(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const registerEmail = typia.random<string & tags.Format<"email">>();
  const password = "TestPass123"; // Meeting requirements: 8+ chars, uppercase, lowercase, number

  const registerResponse: IDiscussionBoardMember.IRegisterResponse =
    await api.functional.discussionBoard.auth.register(connection, {
      body: {
        email: registerEmail,
        password: password,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(registerResponse);

  TestValidator.predicate(
    "registered member has valid ID",
    registerResponse.id !== null && registerResponse.id !== undefined,
  );

  TestValidator.equals(
    "registered member email matches request",
    registerResponse.email,
    registerEmail,
  );

  // Step 2: Login with the registered member's credentials
  const loginResponse: IDiscussionBoardMember.ILoginResponse =
    await api.functional.discussionBoard.auth.login.signIn(connection, {
      body: {
        email: registerEmail,
        password: password,
      } satisfies IDiscussionBoardMember.ILoginRequest,
    });
  typia.assert(loginResponse);

  // Step 3: Verify login response contains correct member information
  TestValidator.equals(
    "login response member ID matches registered member",
    loginResponse.id,
    registerResponse.id,
  );

  TestValidator.equals(
    "login response email matches registered email",
    loginResponse.email,
    registerEmail,
  );

  TestValidator.predicate(
    "member account is active after login",
    loginResponse.account_status === "active",
  );

  TestValidator.predicate(
    "login response has created_at timestamp",
    loginResponse.created_at !== null && loginResponse.created_at !== undefined,
  );

  TestValidator.predicate(
    "login response has updated_at timestamp",
    loginResponse.updated_at !== null && loginResponse.updated_at !== undefined,
  );

  // Step 4: Verify JWT token is provided with proper structure
  TestValidator.predicate(
    "JWT token object is present",
    loginResponse.token !== null && loginResponse.token !== undefined,
  );

  TestValidator.predicate(
    "JWT token has access property",
    loginResponse.token.access !== null &&
      loginResponse.token.access !== undefined,
  );

  TestValidator.predicate(
    "JWT token has refresh property",
    loginResponse.token.refresh !== null &&
      loginResponse.token.refresh !== undefined,
  );

  TestValidator.predicate(
    "JWT token has expired_at timestamp",
    loginResponse.token.expired_at !== null &&
      loginResponse.token.expired_at !== undefined,
  );

  TestValidator.predicate(
    "JWT token has refreshable_until timestamp",
    loginResponse.token.refreshable_until !== null &&
      loginResponse.token.refreshable_until !== undefined,
  );

  TestValidator.predicate(
    "access token is not empty string",
    loginResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is not empty string",
    loginResponse.token.refresh.length > 0,
  );

  // Step 5: Verify token expiration times are properly set for 7-day session
  const tokenExpiryDate = new Date(loginResponse.token.expired_at);
  const refreshExpiryDate = new Date(loginResponse.token.refreshable_until);
  const now = new Date();

  TestValidator.predicate(
    "access token expiration is in the future",
    tokenExpiryDate > now,
  );

  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshExpiryDate > now,
  );

  TestValidator.predicate(
    "refresh token expires later than access token",
    refreshExpiryDate > tokenExpiryDate,
  );

  // Verify refresh token expires approximately 7 days from now
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;
  const refreshExpiryDiffMs = refreshExpiryDate.getTime() - now.getTime();
  TestValidator.predicate(
    "refresh token expires in approximately 7 days",
    refreshExpiryDiffMs > sevenDaysMs - oneDayMs &&
      refreshExpiryDiffMs < sevenDaysMs + oneDayMs,
  );
}
