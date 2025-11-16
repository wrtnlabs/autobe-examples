import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test rate limiting enforcement on email verification requests.
 *
 * This test validates that the email verification send endpoint properly
 * enforces rate limiting to prevent abuse of the email verification feature.
 * After creating a moderator account, multiple consecutive verification email
 * requests are sent for the same email address. The system should allow up to 3
 * requests within an hour and reject subsequent requests with a rate-limit
 * error.
 *
 * Test flow:
 *
 * 1. Create a new moderator account with registration credentials
 * 2. Send the first verification email request (should succeed - within limit)
 * 3. Send the second verification email request (should succeed - within limit)
 * 4. Send the third verification email request (should succeed - within limit)
 * 5. Send the fourth verification email request (should fail - exceeds rate limit)
 * 6. Verify that the error response indicates rate limiting enforcement
 */
export async function test_api_moderator_email_verification_send_rate_limiting(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorPassword = RandomGenerator.alphabets(8) + "Pass123";
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: "https://example.com/auth/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches registration",
    moderator.email,
    moderatorEmail,
  );

  // Step 2: Send first verification email request (should succeed)
  const firstResponse: ICommunityPlatformModerator.IEmailVerifySendResponse =
    await api.functional.communityPlatform.auth.moderator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
      },
    );
  typia.assert(firstResponse);
  TestValidator.equals(
    "first verification email sent to correct address",
    firstResponse.email,
    moderatorEmail,
  );

  // Step 3: Send second verification email request (should succeed)
  const secondResponse: ICommunityPlatformModerator.IEmailVerifySendResponse =
    await api.functional.communityPlatform.auth.moderator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
      },
    );
  typia.assert(secondResponse);
  TestValidator.equals(
    "second verification email sent to correct address",
    secondResponse.email,
    moderatorEmail,
  );

  // Step 4: Send third verification email request (should succeed)
  const thirdResponse: ICommunityPlatformModerator.IEmailVerifySendResponse =
    await api.functional.communityPlatform.auth.moderator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
      },
    );
  typia.assert(thirdResponse);
  TestValidator.equals(
    "third verification email sent to correct address",
    thirdResponse.email,
    moderatorEmail,
  );

  // Step 5: Send fourth verification email request (should fail - exceeds rate limit)
  await TestValidator.error(
    "fourth verification email request should be rate limited",
    async () => {
      await api.functional.communityPlatform.auth.moderator.email_verify.send.sendEmailVerification(
        connection,
        {
          body: {
            email: moderatorEmail,
          } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
        },
      );
    },
  );
}
