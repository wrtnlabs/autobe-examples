import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test successful email verification for newly registered members.
 *
 * This test validates the complete email verification workflow:
 *
 * 1. A new member account is created through the registration endpoint
 * 2. A verification token (that would be sent to email) is simulated
 * 3. The token is submitted to the verify-email endpoint
 * 4. The response confirms successful email verification
 * 5. The member's account status is updated to 'active'
 *
 * This workflow ensures newly registered members can confirm email ownership
 * and activate their accounts for immediate participation.
 */
export async function test_api_member_email_verification_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account via registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123"; // Meets security requirements: 8+ chars, uppercase, lowercase, number

  const registerResponse: IDiscussionBoardMember.IRegisterResponse =
    await api.functional.discussionBoard.auth.register(connection, {
      body: {
        email,
        password,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(registerResponse);

  TestValidator.equals(
    "registered member email matches input email",
    registerResponse.email,
    email,
  );

  TestValidator.predicate(
    "registered member has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      registerResponse.id,
    ),
  );

  // Step 2: Simulate receiving a verification token from email
  // In a real application, this token would be sent to the member's registered email address
  // The token is typically a unique, time-limited string generated during registration
  // For testing purposes, we simulate a realistic token format (alphanumeric string)
  const verificationToken = RandomGenerator.alphaNumeric(32);

  // Step 3: Submit the verification token to the verify-email endpoint
  const verifyResponse: IDiscussionBoardMemberSession.IVerifyEmailResponse =
    await api.functional.discussionBoard.auth.verify_email.verifyEmail(
      connection,
      {
        body: {
          token: verificationToken,
        } satisfies IDiscussionBoardMemberSession.IVerifyEmailRequest,
      },
    );
  typia.assert(verifyResponse);

  // Step 4: Validate the response confirms successful email verification
  TestValidator.equals(
    "email verification response indicates success",
    verifyResponse.success,
    true,
  );

  TestValidator.predicate(
    "verification response contains informative message",
    verifyResponse.message.length > 0,
  );

  // Step 5: Verify the account status is now 'active'
  TestValidator.equals(
    "member account status is active after verification",
    verifyResponse.account_status,
    "active",
  );
}
