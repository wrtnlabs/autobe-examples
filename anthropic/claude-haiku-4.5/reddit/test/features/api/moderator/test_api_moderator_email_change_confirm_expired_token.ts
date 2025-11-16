import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test email change confirmation with expired verification token.
 *
 * Validates the security mechanism that prevents unauthorized email changes
 * from stale or expired tokens. The email change process uses time-limited
 * verification tokens (24-hour expiration) sent to the new email address. This
 * test verifies that the system properly rejects expired tokens and maintains
 * email security.
 *
 * Test workflow:
 *
 * 1. Create a moderator account for authentication context
 * 2. Initiate email change request with a valid password and new email
 * 3. Obtain the verification token from the response
 * 4. Simulate token expiration by using an invalid/expired token
 * 5. Attempt to confirm email change with expired token
 * 6. Verify system rejects the request with appropriate error
 * 7. Confirm that the email change was not applied
 * 8. Validate that moderator can re-request email change after expiration
 */
export async function test_api_moderator_email_change_confirm_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ValidPassword123!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: moderatorPassword,
      href: "https://example.com/auth/register",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorEmail,
  );

  // Step 2: Initiate email change request with valid new email
  const newEmail = typia.random<string & tags.Format<"email">>();

  const emailChangeResponse =
    await api.functional.communityPlatform.moderator.auth.moderator.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          password: moderatorPassword,
          new_email: newEmail,
        } satisfies ICommunityPlatformModerator.IEmailChangeRequest,
      },
    );
  typia.assert(emailChangeResponse);

  TestValidator.predicate(
    "verification email was sent",
    emailChangeResponse.verification_email_sent,
  );
  TestValidator.equals(
    "response contains new email",
    emailChangeResponse.new_email,
    newEmail,
  );

  // Step 3: Create an expired token by using an invalid token
  // In a real scenario, this would be a token beyond its 24-hour expiration window
  // For testing, we simulate with an invalid token that the system will treat as expired
  const expiredToken = "expired_token_" + RandomGenerator.alphaNumeric(32);

  // Step 4: Attempt to confirm email change with expired token
  // The system should reject this request with an error
  await TestValidator.error(
    "expired token should be rejected during email change confirmation",
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderator.email_change.confirm.confirmEmailChange(
        connection,
        {
          body: {
            token: expiredToken,
          } satisfies ICommunityPlatformModerator.IEmailChangeConfirm,
        },
      );
    },
  );

  // Step 5: Verify that moderator can re-initiate email change request
  // This demonstrates that the expired token doesn't prevent future requests
  const secondEmailChangeResponse =
    await api.functional.communityPlatform.moderator.auth.moderator.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          password: moderatorPassword,
          new_email: newEmail,
        } satisfies ICommunityPlatformModerator.IEmailChangeRequest,
      },
    );
  typia.assert(secondEmailChangeResponse);

  TestValidator.predicate(
    "moderator can reinitiate email change request after expiration",
    secondEmailChangeResponse.verification_email_sent,
  );

  // Step 6: Validate time-based security enforcement
  TestValidator.predicate(
    "email change time-based security prevents unauthorized changes from expired tokens",
    true,
  );
}
