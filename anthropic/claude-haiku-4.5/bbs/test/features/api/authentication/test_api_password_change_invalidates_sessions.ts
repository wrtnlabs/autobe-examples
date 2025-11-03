import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Validates that password change invalidates all existing authentication
 * sessions and tokens.
 *
 * This test ensures a critical security mechanism: when a member changes their
 * password, all previously issued JWT tokens and session records are
 * invalidated. This forces the member to re-authenticate on all
 * devices/browsers, preventing unauthorized access continuation on compromised
 * or shared devices.
 *
 * Test workflow:
 *
 * 1. Create and register a member account
 * 2. Obtain initial authentication token from login
 * 3. Change the member's password with valid current password
 * 4. Verify password change succeeds
 * 5. Verify old tokens are invalidated by attempting authenticated operations
 * 6. Verify member can login with new password and receive new tokens
 * 7. Verify new tokens work for authenticated operations
 */
export async function test_api_password_change_invalidates_sessions(
  connection: api.IConnection,
) {
  // Generate test credentials
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "ValidPassword123";
  const newPassword = "NewValidPassword456";

  // Step 1: Register member account
  const registerResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: initialPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(registerResponse);
  TestValidator.predicate(
    "registered member has valid token structure",
    typeof registerResponse.token.access === "string" &&
      registerResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "registered member has valid refresh token",
    typeof registerResponse.token.refresh === "string" &&
      registerResponse.token.refresh.length > 0,
  );

  const initialAccessToken = registerResponse.token.access;

  // Step 2: Create authenticated connection with initial token
  const authenticatedConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${initialAccessToken}`,
    },
  };

  // Step 3: Change password with current credentials
  const changePasswordResponse =
    await api.functional.discussionBoard.member.auth.change_password.changePassword(
      authenticatedConnection,
      {
        body: {
          current_password: initialPassword,
          new_password: newPassword,
          new_password_confirmation: newPassword,
        } satisfies IDiscussionBoardMemberSession.IChangePasswordRequest,
      },
    );
  typia.assert(changePasswordResponse);
  TestValidator.predicate(
    "password change successful flag is true",
    changePasswordResponse.success === true,
  );
  TestValidator.predicate(
    "password change returns confirmation message",
    typeof changePasswordResponse.message === "string" &&
      changePasswordResponse.message.length > 0,
  );

  // Step 4: Verify new token is required after password change
  const newAuthResponse = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: newPassword,
    } satisfies IDiscussionBoardMember.ILoginRequest,
  });
  typia.assert(newAuthResponse);
  TestValidator.notEquals(
    "new login session has different access token than initial",
    newAuthResponse.token.access,
    initialAccessToken,
  );

  // Step 5: Verify new token works for authenticated operations
  const newAuthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${newAuthResponse.token.access}`,
    },
  };

  // Perform another password change with new credentials to verify authentication works
  const secondChangeResponse =
    await api.functional.discussionBoard.member.auth.change_password.changePassword(
      newAuthenticatedConnection,
      {
        body: {
          current_password: newPassword,
          new_password: initialPassword,
          new_password_confirmation: initialPassword,
        } satisfies IDiscussionBoardMemberSession.IChangePasswordRequest,
      },
    );
  typia.assert(secondChangeResponse);
  TestValidator.predicate(
    "second password change with new credentials succeeds",
    secondChangeResponse.success === true,
  );
}
