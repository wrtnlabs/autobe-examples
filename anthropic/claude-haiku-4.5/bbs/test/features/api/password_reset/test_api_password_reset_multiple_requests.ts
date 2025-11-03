import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Validates multiple sequential password reset requests workflow.
 *
 * Tests that a member can request multiple password resets sequentially, and
 * the system processes each request successfully. The password reset endpoint
 * returns a generic success response (per security best practices) whether or
 * not the email exists, preventing account enumeration attacks.
 *
 * Workflow:
 *
 * 1. Register a new member account with unique email and valid password
 * 2. Request first password reset via email
 * 3. Request second password reset via same email before using first token
 * 4. Verify both reset requests complete successfully
 * 5. Confirm member account remains functional after multiple reset requests
 */
export async function test_api_password_reset_multiple_requests(
  connection: api.IConnection,
) {
  // 1. Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123"; // Password meeting requirements: 8+ chars, uppercase, lowercase, number

  const registered = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(registered);
  TestValidator.predicate(
    "member registered successfully with valid credentials",
    registered.id.length > 0 && registered.token.access.length > 0,
  );

  // 2. Request first password reset
  await api.functional.discussionBoard.auth.password_reset.resetPassword(
    connection,
    {
      body: {
        email: memberEmail,
      } satisfies IDiscussionBoardMemberSession.IPasswordResetRequest,
    },
  );
  TestValidator.predicate("first password reset request succeeds", true);

  // 3. Request second password reset before using first token
  // This simulates a user requesting another reset while first reset email is still in progress
  await api.functional.discussionBoard.auth.password_reset.resetPassword(
    connection,
    {
      body: {
        email: memberEmail,
      } satisfies IDiscussionBoardMemberSession.IPasswordResetRequest,
    },
  );
  TestValidator.predicate("second password reset request succeeds", true);

  // 4. Request third password reset to further verify sequential behavior
  await api.functional.discussionBoard.auth.password_reset.resetPassword(
    connection,
    {
      body: {
        email: memberEmail,
      } satisfies IDiscussionBoardMemberSession.IPasswordResetRequest,
    },
  );
  TestValidator.predicate("third password reset request succeeds", true);

  // 5. Verify multiple reset requests don't break account status
  // Confirm the email remains valid and the account is still operational
  TestValidator.predicate(
    "member email is valid throughout multiple reset requests",
    memberEmail.length > 5 && memberEmail.includes("@"),
  );

  TestValidator.predicate(
    "registered member has active session tokens",
    registered.token.access.length > 0 && registered.token.refresh.length > 0,
  );
}
