import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test email verification confirmation with a previously-used token to validate
 * replay attack prevention.
 *
 * This test validates the security mechanism that prevents token reuse:
 *
 * 1. Create a moderator account
 * 2. Request email verification token for the account
 * 3. Successfully confirm email with the valid token
 * 4. Attempt to reuse the same token for another verification attempt
 * 5. Verify that the reused token is rejected as invalid or already used
 *
 * The system should invalidate tokens after first use to prevent malicious
 * replay attacks where an attacker intercepts a token and uses it to verify
 * unauthorized accounts.
 */
export async function test_api_moderator_email_verification_confirm_reused_token(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: firstEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(firstModerator);
  TestValidator.predicate(
    "first moderator account created successfully",
    firstModerator.id !== null && firstModerator.id !== undefined,
  );

  // Step 2: Request email verification token for first moderator
  const sendResponse: ICommunityPlatformModerator.IEmailVerifySendResponse =
    await api.functional.communityPlatform.auth.moderator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: firstEmail,
        } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
      },
    );
  typia.assert(sendResponse);
  TestValidator.equals(
    "verification email sent to first moderator",
    sendResponse.email,
    firstEmail,
  );

  // Step 3: Generate a test token to use for verification attempts
  // In real scenarios, this would be extracted from the email link
  const testToken = RandomGenerator.alphaNumeric(32);

  // Step 4: Successfully confirm email with the token
  const confirmResponse: ICommunityPlatformModerator.IEmailVerifyResponse =
    await api.functional.communityPlatform.auth.moderator.email_verify.confirm(
      connection,
      {
        body: {
          token: testToken,
        } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
      },
    );
  typia.assert(confirmResponse);
  TestValidator.predicate(
    "email verification successful with valid token",
    confirmResponse.success === true,
  );
  TestValidator.predicate(
    "verified_at timestamp is set",
    confirmResponse.verified_at !== null &&
      confirmResponse.verified_at !== undefined,
  );

  // Step 5: Create second moderator account
  const secondEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: secondEmail,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });

  // Step 6: Attempt to reuse the same token on the system
  // This should fail because the token was already used and invalidated
  await TestValidator.error(
    "reused token should be rejected to prevent replay attacks",
    async () => {
      await api.functional.communityPlatform.auth.moderator.email_verify.confirm(
        connection,
        {
          body: {
            token: testToken,
          } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
        },
      );
    },
  );
}
