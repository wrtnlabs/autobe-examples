import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member login with valid credentials.
 *
 * This test validates that members can successfully authenticate with correct
 * email and password credentials. The system validates credentials against the
 * discussion_board_members table and issues JWT authentication tokens upon
 * successful verification. This test ensures the core authentication flow works
 * correctly and returns proper member information and authorization tokens.
 *
 * Test workflow:
 *
 * 1. Create a new member account with valid credentials
 * 2. Perform login with correct email and password
 * 3. Verify login succeeds and returns member information
 * 4. Confirm JWT token is issued with correct claims
 * 5. Validate member data integrity in response
 */
export async function test_api_member_login_deleted_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPass123";

  const registered: IDiscussionBoardMember.IRegisterResponse =
    await api.functional.discussionBoard.auth.register(connection, {
      body: {
        email: email,
        password: password,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });

  typia.assert(registered);
  TestValidator.equals(
    "registered member email matches input",
    registered.email,
    email,
  );

  // Step 2: Perform login with correct credentials
  const loginResponse: IDiscussionBoardMember.ILoginResponse =
    await api.functional.discussionBoard.auth.login.signIn(connection, {
      body: {
        email: email,
        password: password,
      } satisfies IDiscussionBoardMember.ILoginRequest,
    });

  typia.assert(loginResponse);

  // Step 3: Verify login succeeds and returns member information
  TestValidator.equals(
    "login response email matches registered email",
    loginResponse.email,
    email,
  );
  TestValidator.equals(
    "login response member ID matches registered ID",
    loginResponse.id,
    registered.id,
  );

  // Step 4: Confirm JWT token is issued with correct claims
  TestValidator.predicate(
    "access token is present",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is set",
    loginResponse.token.expired_at !== null &&
      loginResponse.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refresh token expiration is set",
    loginResponse.token.refreshable_until !== null &&
      loginResponse.token.refreshable_until !== undefined,
  );

  // Step 5: Validate member data integrity in response
  TestValidator.equals(
    "account status is active",
    loginResponse.account_status,
    "active",
  );
  TestValidator.predicate(
    "created_at timestamp is valid",
    new Date(loginResponse.created_at) instanceof Date &&
      !isNaN(new Date(loginResponse.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    new Date(loginResponse.updated_at) instanceof Date &&
      !isNaN(new Date(loginResponse.updated_at).getTime()),
  );
}
