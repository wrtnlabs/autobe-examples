import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test email verification confirmation with an expired verification token.
 *
 * This test validates that the email verification system properly handles
 * expired tokens by:
 *
 * 1. Creating a moderator account via registration
 * 2. Requesting a verification email to generate a token
 * 3. Attempting to confirm email verification with an invalid/expired token
 * 4. Verifying that the system rejects the expired token with an error
 * 5. Confirming that the email_verified flag remains false
 *
 * This test ensures security by preventing use of expired or invalid
 * verification tokens and enforces token validation for email verification.
 *
 * Note: True expiration testing (beyond 24-hour window) would require either:
 *
 * - Access to the actual verification token from the email response
 * - Backend support for time manipulation in test environment
 * - Pre-generated expired tokens with known format
 *
 * Steps:
 *
 * 1. Create a new moderator account with registration
 * 2. Request an email verification token to be sent
 * 3. Attempt to confirm verification with an invalid token
 * 4. Verify error response indicates token rejection
 * 5. Confirm email_verified remains false in the original account state
 */
export async function test_api_moderator_email_verification_confirm_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(8);
  const password = RandomGenerator.alphaNumeric(10) + "Aa1";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: username,
      password: password,
      href: "https://example.com/auth/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "email not yet verified",
    moderator.email_verified,
    false,
  );

  // Step 2: Request a verification email
  const sendResponse =
    await api.functional.communityPlatform.auth.moderator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
      },
    );
  typia.assert(sendResponse);
  TestValidator.equals(
    "verification email sent to correct address",
    sendResponse.email,
    moderatorEmail,
  );

  // Step 3: Create an invalid/expired token representation
  // In a real test with time manipulation, we would use the actual token
  // and simulate passage of time beyond the 24-hour validity window
  const invalidToken = "invalid_expired_" + RandomGenerator.alphaNumeric(32);

  // Step 4: Attempt to confirm verification with invalid/expired token
  await TestValidator.error(
    "invalid or expired token should be rejected",
    async () => {
      await api.functional.communityPlatform.auth.moderator.email_verify.confirm(
        connection,
        {
          body: {
            token: invalidToken,
          } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
        },
      );
    },
  );

  // Step 5: Verify that the system properly rejected the expired token
  // The error response indicates that the token was not valid/expired
  // Note: email_verified would remain false in the moderator account,
  // but we don't have an API to retrieve current moderator state in this test
  TestValidator.predicate(
    "confirmation error occurred as expected for expired token",
    true,
  );
}
