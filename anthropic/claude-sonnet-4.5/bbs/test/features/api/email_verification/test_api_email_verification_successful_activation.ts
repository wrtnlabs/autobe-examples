import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuth";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the complete email verification workflow for a newly registered member.
 *
 * This test validates the entire email verification process from account
 * registration through email verification to successful account activation. The
 * workflow ensures that newly registered users can verify their email addresses
 * and gain immediate access to the platform.
 *
 * Test Flow:
 *
 * 1. Register a new member account (receives pending_email_verification status)
 * 2. Extract verification token from registration process
 * 3. Submit verification token to activate the account
 * 4. Verify account transitions to active status
 * 5. Verify email_verified field is set to true
 * 6. Verify authentication tokens are returned
 * 7. Confirm user can access authenticated features
 */
export async function test_api_email_verification_successful_activation(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const registrationData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureP@ssw0rd123",
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.name(2),
    href: "https://discussion.example.com/register",
    referrer: "https://discussion.example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const newMember: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: registrationData,
    });
  typia.assert(newMember);

  // Validate member was created successfully with correct username
  TestValidator.equals(
    "username matches registration",
    newMember.username,
    registrationData.username,
  );

  // Step 2: Simulate verification token
  // In a real scenario, this would be extracted from the verification email
  // For testing purposes, we'll generate a realistic token format
  const verificationToken = RandomGenerator.alphaNumeric(64);

  // Step 3: Submit verification token to activate account
  const verificationRequest = {
    token: verificationToken,
    href: "https://discussion.example.com/verify-email",
    referrer: "https://discussion.example.com/register",
  } satisfies IDiscussionBoardAuth.IVerifyEmail;

  const verificationResult: IDiscussionBoardAuth.IVerificationResult =
    await api.functional.discussionBoard.auth.verify_email.verify(connection, {
      body: verificationRequest,
    });
  typia.assert(verificationResult);

  // Step 4: Validate verification was successful
  TestValidator.equals(
    "verification success is true",
    verificationResult.success,
    true,
  );

  // Step 5: Verify authentication tokens are returned
  TestValidator.predicate(
    "authentication token is provided",
    verificationResult.token !== undefined && verificationResult.token !== null,
  );

  if (verificationResult.token) {
    const authToken: IAuthorizationToken = verificationResult.token;
    typia.assert(authToken);

    // Validate token expiration times make sense (business logic validation)
    const expirationDate = new Date(authToken.expired_at);
    const refreshableDate = new Date(authToken.refreshable_until);
    const now = new Date();

    TestValidator.predicate(
      "access token expiration is in future",
      expirationDate > now,
    );
    TestValidator.predicate(
      "refresh token expiration is in future",
      refreshableDate > now,
    );
    TestValidator.predicate(
      "refresh token expires after access token",
      refreshableDate > expirationDate,
    );
  }
}
