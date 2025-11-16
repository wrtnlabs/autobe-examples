import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_email_change_confirm_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account with initial authentication
  const newModeratorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";

  const createdModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: newModeratorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(createdModerator);
  TestValidator.equals(
    "initial moderator email matches",
    createdModerator.email,
    newModeratorEmail,
  );
  TestValidator.predicate(
    "moderator account is active",
    createdModerator.account_status === "active",
  );

  // Step 2: Initiate email change request with new email address
  const changeRequestEmail = typia.random<string & tags.Format<"email">>();

  const emailChangeResponse: ICommunityPlatformModerator.IEmailChangeResponse =
    await api.functional.communityPlatform.moderator.auth.moderator.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          password: moderatorPassword,
          new_email: changeRequestEmail,
        } satisfies ICommunityPlatformModerator.IEmailChangeRequest,
      },
    );
  typia.assert(emailChangeResponse);
  TestValidator.equals(
    "email change request verification email sent",
    emailChangeResponse.verification_email_sent,
    true,
  );
  TestValidator.equals(
    "new email in response matches requested",
    emailChangeResponse.new_email,
    changeRequestEmail,
  );
  TestValidator.predicate(
    "expiration time is in future",
    new Date(emailChangeResponse.expiration_time) > new Date(),
  );

  // Step 3: Simulate token extraction from verification email
  // In production, the verification token would be extracted from the verification email
  // sent to the new email address. For testing, we use a realistic token format.
  const verificationToken = RandomGenerator.alphaNumeric(32);

  // Step 4: Confirm email change with verification token
  const confirmedModerator: ICommunityPlatformModerator =
    await api.functional.communityPlatform.moderator.auth.moderator.email_change.confirm.confirmEmailChange(
      connection,
      {
        body: {
          token: verificationToken,
        } satisfies ICommunityPlatformModerator.IEmailChangeConfirm,
      },
    );
  typia.assert(confirmedModerator);

  // Step 5: Validate that email has been permanently updated
  TestValidator.equals(
    "moderator email updated to new address",
    confirmedModerator.email,
    changeRequestEmail,
  );
  TestValidator.notEquals(
    "moderator email changed from original",
    confirmedModerator.email,
    newModeratorEmail,
  );

  // Step 6: Verify moderator profile reflects the changes
  TestValidator.equals(
    "moderator ID remains unchanged",
    confirmedModerator.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "moderator username unchanged",
    confirmedModerator.username,
    createdModerator.username,
  );
  TestValidator.equals(
    "moderator karma score preserved",
    confirmedModerator.karma_score,
    createdModerator.karma_score,
  );

  // Step 7: Confirm account status and email verification after change
  TestValidator.predicate(
    "moderator account remains active",
    confirmedModerator.account_status === "active",
  );
  TestValidator.predicate(
    "email is marked as verified after confirmation",
    confirmedModerator.email_verified === true,
  );
}
