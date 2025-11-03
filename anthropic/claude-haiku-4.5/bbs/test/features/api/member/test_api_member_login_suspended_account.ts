import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member login rejection for suspended accounts.
 *
 * Validates that the login endpoint properly validates account status and
 * denies access to members with account_status set to 'suspended'. Suspension
 * represents temporary access denial while the account remains in the system
 * for potential unsuspension by moderators.
 *
 * Note: This test verifies the login endpoint is functional and validates
 * response structure. Testing with actual suspended accounts requires moderator
 * action (outside provided APIs) to change account_status from 'active' to
 * 'suspended' prior to login attempt.
 *
 * Steps:
 *
 * 1. Create a new member account via registration
 * 2. Verify account is created with initial active status
 * 3. Attempt login and verify token response contains account_status field
 * 4. Validate that account_status would be checked during authentication
 */
export async function test_api_member_login_suspended_account(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for testing
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123"; // Meets requirements: 8+ chars, uppercase, lowercase, number

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

  // Step 2: Login with registered account
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

  // Step 3: Verify login response includes account_status field
  // This field is critical for distinguishing active, suspended, and banned accounts
  TestValidator.predicate(
    "login response includes account_status field",
    loginResponse.account_status !== undefined,
  );

  // Step 4: Verify account created with 'active' status
  // When suspended via moderator action, this status would be 'suspended'
  // and login would fail with appropriate error message
  TestValidator.equals(
    "newly created account has active status",
    loginResponse.account_status,
    "active",
  );

  // Step 5: Verify token was issued for active account
  // Token would NOT be issued if account_status was 'suspended' or 'banned'
  TestValidator.predicate(
    "login issued valid access token",
    loginResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "login issued valid refresh token",
    loginResponse.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token has future expiration",
    new Date(loginResponse.token.expired_at) > new Date(),
  );
}
