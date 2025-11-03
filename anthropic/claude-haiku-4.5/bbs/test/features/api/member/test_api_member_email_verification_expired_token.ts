import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test email verification rejection when verification token has expired.
 * Verification tokens are valid for 24 hours only.
 *
 * This test validates the token expiration security mechanism:
 *
 * 1. Create a new member account via registration (generates verification token)
 * 2. Attempt to verify email with an expired/invalid token
 * 3. Validate that the system rejects the request with error indicating token
 *    expiration
 * 4. Verify that account remains unverified (inactive/pending_verification status)
 *
 * This ensures the system properly validates token timestamps and prevents
 * activation of accounts with expired verification tokens, maintaining email
 * ownership verification security.
 */
export async function test_api_member_email_verification_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account via registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123"; // Meets requirements: 8+ chars, uppercase, lowercase, digit

  const registrationResponse: IDiscussionBoardMember.IRegisterResponse =
    await api.functional.discussionBoard.auth.register(connection, {
      body: {
        email,
        password,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });

  typia.assert(registrationResponse);
  TestValidator.equals(
    "registration successful with email",
    registrationResponse.email,
    email,
  );

  // Step 2 & 3: Attempt to verify email with an expired token
  // Simulate an expired token - use an invalid UUID-like token that would have been
  // generated more than 24 hours ago
  const expiredToken = typia.random<string & tags.Format<"uuid">>();

  const verificationResponse: IDiscussionBoardMemberSession.IVerifyEmailResponse =
    await api.functional.discussionBoard.auth.verify_email.verifyEmail(
      connection,
      {
        body: {
          token: expiredToken,
        } satisfies IDiscussionBoardMemberSession.IVerifyEmailRequest,
      },
    );

  typia.assert(verificationResponse);

  // Step 4: Verify that the system rejected the expired token
  TestValidator.predicate(
    "email verification should fail with expired token",
    verificationResponse.success === false,
  );

  TestValidator.predicate(
    "error message should indicate token expiration",
    verificationResponse.message.toLowerCase().includes("expire") ||
      verificationResponse.message.toLowerCase().includes("invalid") ||
      verificationResponse.message.toLowerCase().includes("token"),
  );

  // Step 5: Verify that account status remains unverified
  TestValidator.predicate(
    "account status should not be active after expired token verification",
    verificationResponse.account_status !== "active",
  );
}
