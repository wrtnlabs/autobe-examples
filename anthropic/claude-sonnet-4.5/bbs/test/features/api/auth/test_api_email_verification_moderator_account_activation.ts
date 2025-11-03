import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuth";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test email verification workflow for moderator account activation.
 *
 * This test validates the complete email verification process for moderator
 * accounts:
 *
 * 1. Create a new moderator account through registration endpoint
 * 2. Account is created with pending_email_verification status and email_verified
 *    = false
 * 3. System generates verification token and sends it via email (simulated in this
 *    test)
 * 4. Submit verification token to email verification endpoint
 * 5. Validate account is activated with email_verified = true and appropriate
 *    status
 * 6. Validate authentication tokens are returned for immediate login
 * 7. Verify token expiration times are valid and properly structured
 *
 * NOTE: In production, the verification token would be sent to the moderator's
 * email address and retrieved from there. In this e2e test environment with
 * simulation mode, we generate a realistic token format that represents what
 * would be sent via email.
 */
export async function test_api_email_verification_moderator_account_activation(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);
  const moderatorPassword = RandomGenerator.alphaNumeric(12) + "A1!";

  const createModeratorBody = {
    username: moderatorUsername,
    email: moderatorEmail,
    password: moderatorPassword,
    href: "https://discussion.example.com/moderator/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://discussion.example.com/" satisfies string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderatorAccount = await api.functional.auth.moderator.join(
    connection,
    {
      body: createModeratorBody,
    },
  );
  typia.assert(moderatorAccount);

  // Step 2: Verify the moderator account was created with pending email verification status
  TestValidator.equals(
    "moderator account email should match input",
    moderatorAccount.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator account username should match input",
    moderatorAccount.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "moderator account email_verified should be false initially",
    moderatorAccount.email_verified,
    false,
  );
  TestValidator.equals(
    "moderator account status should be pending_email_verification",
    moderatorAccount.status,
    "pending_email_verification",
  );

  // Step 3: Simulate email verification token
  // NOTE: In production, this token would be retrieved from the verification email
  // sent to the moderator's email address. Here we generate a realistic token format
  // that represents what the system would send via email.
  const verificationToken = RandomGenerator.alphaNumeric(32);

  // Step 4: Submit verification token to verify email endpoint
  const verificationBody = {
    token: verificationToken,
    href: "https://discussion.example.com/verify-email" satisfies string &
      tags.Format<"uri">,
    referrer: "https://mail.google.com/" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardAuth.IVerifyEmail;

  const verificationResult =
    await api.functional.discussionBoard.auth.verify_email.verify(connection, {
      body: verificationBody,
    });
  typia.assert(verificationResult);

  // Step 5: Validate verification was successful
  TestValidator.equals(
    "email verification should be successful",
    verificationResult.success,
    true,
  );
  TestValidator.predicate(
    "verification message should be provided",
    verificationResult.message.length > 0,
  );

  // Step 6: Validate authentication tokens are returned
  typia.assertGuard(verificationResult.token!);

  TestValidator.predicate(
    "access token should be provided",
    verificationResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be provided",
    verificationResult.token.refresh.length > 0,
  );

  // Step 7: Verify token expiration timestamps are valid
  const accessTokenExpiry = new Date(verificationResult.token.expired_at);
  const refreshTokenExpiry = new Date(
    verificationResult.token.refreshable_until,
  );
  const now = new Date();

  TestValidator.predicate(
    "access token expiration should be in the future",
    accessTokenExpiry > now,
  );
  TestValidator.predicate(
    "refresh token expiration should be in the future",
    refreshTokenExpiry > now,
  );
  TestValidator.predicate(
    "refresh token should expire after access token",
    refreshTokenExpiry > accessTokenExpiry,
  );
}
