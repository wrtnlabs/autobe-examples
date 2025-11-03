import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test email verification resend for members who have not verified their email.
 *
 * This test validates the complete email verification resend workflow:
 *
 * 1. Create a new member account with email and password
 * 2. Request verification email resend for the registered email address
 * 3. Verify success response with correct email and token expiration time
 * 4. Confirm the verification token expires in 24 hours
 *
 * This ensures members can request new verification tokens when the original
 * email is lost, expired, or not received, allowing them to complete email
 * verification at any point in their authentication journey.
 */
export async function test_api_email_verification_resend_valid_request(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with email and password
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword =
    RandomGenerator.alphabets(8).toUpperCase() +
    RandomGenerator.alphabets(8).toLowerCase() +
    RandomGenerator.alphaNumeric(1);

  const registerRequest = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const registeredMember = await api.functional.auth.member.join(connection, {
    body: registerRequest,
  });
  typia.assert(registeredMember);

  // Step 2: Request verification email resend for the member's email
  const resendRequest = {
    email: memberEmail,
  } satisfies IDiscussionBoardMemberSession.IResendVerificationRequest;

  const resendResponse =
    await api.functional.discussionBoard.auth.resend_verification.resendVerification(
      connection,
      {
        body: resendRequest,
      },
    );
  typia.assert(resendResponse);

  // Step 3: Verify the resend response contains correct information
  TestValidator.equals(
    "resend success flag is true",
    resendResponse.success,
    true,
  );
  TestValidator.equals(
    "resend email matches request",
    resendResponse.email,
    memberEmail,
  );
  TestValidator.predicate(
    "resend message is provided",
    resendResponse.message.length > 0,
  );

  // Step 4: Verify token expiration is set correctly (24 hours from now)
  const expirationTime = new Date(resendResponse.verification_token_expires_at);
  const currentTime = new Date();
  const timeDifferenceMs = expirationTime.getTime() - currentTime.getTime();
  const hoursUntilExpiration = timeDifferenceMs / (1000 * 60 * 60);

  TestValidator.predicate(
    "verification token expires in approximately 24 hours",
    hoursUntilExpiration >= 23 && hoursUntilExpiration <= 25,
  );
}
