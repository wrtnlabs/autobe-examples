import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test successful email verification request submission for a moderator
 * account.
 *
 * This test validates the email verification workflow by:
 *
 * 1. Creating a new moderator account with a valid email address
 * 2. Requesting to send a verification email to that moderator's registered email
 * 3. Verifying that the system returns a successful response confirming email
 *    dispatch
 * 4. Validating that the response includes the correct email address and
 *    confirmation message
 *
 * This workflow is essential for moderator account security and recovery,
 * ensuring that moderators can verify their email addresses and enable account
 * recovery options.
 */
export async function test_api_moderator_email_verification_send_success(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account with valid registration data
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator created with correct email",
    moderator.email,
    moderatorEmail,
  );

  // Step 2: Request to send verification email to the moderator's email address
  const verificationResponse: ICommunityPlatformModerator.IEmailVerifySendResponse =
    await api.functional.communityPlatform.auth.moderator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: moderator.email,
        } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
      },
    );
  typia.assert(verificationResponse);

  // Step 3: Validate the response confirms successful email dispatch
  TestValidator.predicate(
    "verification response contains confirmation message",
    verificationResponse.message.length > 0,
  );

  // Step 4: Validate that the response includes the correct email address
  TestValidator.equals(
    "verification email matches moderator email",
    verificationResponse.email,
    moderator.email,
  );
}
