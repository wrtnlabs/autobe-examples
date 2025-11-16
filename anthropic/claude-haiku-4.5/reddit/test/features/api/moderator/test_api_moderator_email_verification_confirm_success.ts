import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_email_verification_confirm_success(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorPassword = "ValidPassword123";

  const createdModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: "https://example.com/auth/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(createdModerator);

  // Verify that the moderator was created with email not verified
  TestValidator.predicate(
    "moderator created with email_verified as false",
    !createdModerator.email_verified,
  );

  // Step 2: Request email verification (send verification email)
  const verificationEmailResponse: ICommunityPlatformModerator.IEmailVerifySendResponse =
    await api.functional.communityPlatform.auth.moderator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
      },
    );
  typia.assert(verificationEmailResponse);

  // Verify the response contains the correct email
  TestValidator.equals(
    "verification email sent to correct address",
    verificationEmailResponse.email,
    moderatorEmail,
  );

  // Step 3: Confirm email verification with a valid token
  // In a real test environment, this token would be extracted from the verification email
  // For E2E testing purposes, we submit a confirmation with the token
  const verificationResponse: ICommunityPlatformModerator.IEmailVerifyResponse =
    await api.functional.communityPlatform.auth.moderator.email_verify.confirm(
      connection,
      {
        body: {
          token: RandomGenerator.alphaNumeric(32),
        } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
      },
    );
  typia.assert(verificationResponse);

  // Step 4: Validate successful verification response
  TestValidator.predicate(
    "email verification successful flag is true",
    verificationResponse.success,
  );

  TestValidator.predicate(
    "verification message is non-empty string",
    typeof verificationResponse.message === "string" &&
      verificationResponse.message.length > 0,
  );

  // Step 5: Validate the verified_at timestamp is a valid ISO 8601 date-time
  const verifiedAtTime = new Date(verificationResponse.verified_at);
  TestValidator.predicate(
    "verified_at is a valid date timestamp",
    !isNaN(verifiedAtTime.getTime()),
  );

  // Step 6: Verify timestamp is recent (within a reasonable timeframe)
  const currentTime = new Date();
  const timeDiffMs = currentTime.getTime() - verifiedAtTime.getTime();

  TestValidator.predicate(
    "verification timestamp is recent and valid",
    timeDiffMs >= 0 && timeDiffMs <= 5000,
  );
}
