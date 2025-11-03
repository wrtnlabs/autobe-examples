import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test successful password reset initiation for a member with registered email.
 *
 * This test validates the complete password reset initiation workflow:
 *
 * 1. Create a member account with valid credentials
 * 2. Initiate password reset using the registered email
 * 3. Verify the system processes the request successfully
 *
 * The test ensures that members can request password reset for their accounts
 * and that the system properly handles the email verification and token
 * generation for password recovery workflows.
 */
export async function test_api_password_reset_initiation_valid_email(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with valid email and password
  const email = typia.random<string & tags.Format<"email">>();
  const password = "ValidPass123";

  const memberData = {
    email: email,
    password: password,
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const registeredMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(registeredMember);

  // Verify member was created successfully with valid ID
  TestValidator.predicate(
    "registered member has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      registeredMember.id,
    ),
  );

  // Step 2: Initiate password reset request with the registered email
  const passwordResetRequest = {
    email: email,
  } satisfies IDiscussionBoardMemberSession.IPasswordResetRequest;

  // Call password reset endpoint with the registered email
  // The API processes the request and sends password reset instructions to the email
  await api.functional.discussionBoard.auth.password_reset.resetPassword(
    connection,
    {
      body: passwordResetRequest,
    },
  );

  // Step 3: Verify password reset workflow completed successfully
  // Successful completion is indicated by no exception being thrown
  // The system has accepted the request and will send password reset instructions
}
