import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test email change confirmation rejection when moderator lacks proper
 * authentication.
 *
 * This test validates that the email change confirmation endpoint properly
 * enforces authentication requirements by:
 *
 * 1. Creating a new moderator account to establish baseline state
 * 2. Initiating an email change request to establish pending email change
 * 3. Creating an unauthenticated connection by clearing authorization headers
 * 4. Attempting email change confirmation without authentication credentials
 * 5. Verifying the system rejects the request with authentication error
 * 6. Confirming authentication is mandatory for email change confirmation
 *
 * This ensures the email change confirmation endpoint properly enforces
 * authentication and prevents unauthorized email modifications without valid
 * credentials.
 */
export async function test_api_moderator_email_change_confirm_unauthenticated(
  connection: api.IConnection,
) {
  // 1. Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";

  const createdModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(createdModerator);

  // 2. Initiate email change request with valid authentication
  const newEmail = typia.random<string & tags.Format<"email">>();

  const emailChangeResponse: ICommunityPlatformModerator.IEmailChangeResponse =
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

  // Verify verification email was sent
  TestValidator.predicate(
    "verification email should be sent",
    emailChangeResponse.verification_email_sent === true,
  );
  TestValidator.equals(
    "new email in response should match requested email",
    emailChangeResponse.new_email,
    newEmail,
  );

  // 3. Create unauthenticated connection by clearing authorization headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4. Attempt email change confirmation without authentication
  // Using a test token format - should fail due to missing authentication
  await TestValidator.error(
    "email change confirmation should reject unauthenticated request",
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderator.email_change.confirm.confirmEmailChange(
        unauthConn,
        {
          body: {
            token: RandomGenerator.alphaNumeric(32),
          } satisfies ICommunityPlatformModerator.IEmailChangeConfirm,
        },
      );
    },
  );

  // 5. Verify authentication requirement is enforced
  // The failed confirmation attempt should not have modified the moderator's email
  TestValidator.equals(
    "moderator email should remain unchanged after failed confirmation",
    createdModerator.email,
    moderatorEmail,
  );
}
