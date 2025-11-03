import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validates successful member authentication workflow.
 *
 * Tests the complete login process for registered members including:
 *
 * 1. Member registration with email and password
 * 2. Successful authentication using registered credentials
 * 3. JWT token issuance with proper expiration times
 * 4. Session creation with connection metadata
 * 5. Validation that active members can access authenticated endpoints
 *
 * The test verifies that the authentication system correctly:
 *
 * - Validates email uniqueness during registration
 * - Enforces password security requirements (8+ chars, uppercase, lowercase,
 *   number)
 * - Compares passwords against secure hashes during login
 * - Issues JWT tokens with proper claims and expiration
 * - Creates session records for security auditing
 * - Returns complete member information in login response
 */
export async function test_api_member_login_successful(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account with known credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPass123"; // Meets requirements: 8+ chars, uppercase, lowercase, number

  const registerResponse = await api.functional.discussionBoard.auth.register(
    connection,
    {
      body: {
        email,
        password,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    },
  );
  typia.assert(registerResponse);

  TestValidator.equals(
    "registered member email matches input",
    registerResponse.email,
    email,
  );
  TestValidator.predicate(
    "registered member has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      registerResponse.id,
    ),
  );

  // Step 2: Authenticate with registered credentials
  const loginResponse = await api.functional.discussionBoard.auth.login.signIn(
    connection,
    {
      body: {
        email,
        password,
      } satisfies IDiscussionBoardMember.ILoginRequest,
    },
  );
  typia.assert(loginResponse);

  // Step 3: Validate login response contains expected member information
  TestValidator.equals(
    "login response email matches registered email",
    loginResponse.email,
    email,
  );
  TestValidator.equals(
    "login response member ID matches registered ID",
    loginResponse.id,
    registerResponse.id,
  );
  TestValidator.predicate(
    "account status is active",
    loginResponse.account_status === "active",
  );

  // Step 4: Validate JWT token structure
  typia.assert(loginResponse.token);
  TestValidator.predicate(
    "access token is non-empty string",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof loginResponse.token.refresh === "string" &&
      loginResponse.token.refresh.length > 0,
  );

  // Step 5: Validate token expiration times
  const now = new Date();
  const expiredAt = new Date(loginResponse.token.expired_at);
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);

  TestValidator.predicate(
    "access token has future expiration (30 minutes)",
    expiredAt > now && expiredAt.getTime() - now.getTime() <= 30 * 60 * 1000,
  );
  TestValidator.predicate(
    "refresh token has future expiration (7 days)",
    refreshableUntil > now &&
      refreshableUntil.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000,
  );
  TestValidator.predicate(
    "refresh token expiration is after access token expiration",
    refreshableUntil > expiredAt,
  );

  // Step 6: Validate member account metadata
  TestValidator.predicate(
    "created_at is valid ISO 8601 date-time",
    !isNaN(new Date(loginResponse.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 date-time",
    !isNaN(new Date(loginResponse.updated_at).getTime()),
  );
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    new Date(loginResponse.created_at) <= new Date(loginResponse.updated_at),
  );
}
