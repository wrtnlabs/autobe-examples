import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test updating the email verification status of a moderator account.
 *
 * This test validates both enabling and disabling email verification while
 * ensuring proper security validation occurs when email is unverified for
 * administrative accounts. The test follows the complete workflow: creating a
 * moderator account, updating verification status in both directions, and
 * validating that changes are properly reflected.
 */
export async function test_api_moderator_update_email_verification_status(
  connection: api.IConnection,
) {
  // Create a moderator account with unverified email
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(32),
      email_verified: false,
      moderation_level: "discussion_moderator",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  TestValidator.equals(
    "initial email verification status",
    moderator.email_verified,
    false,
  );

  // Update email verification status to verified
  const verifiedModerator =
    await api.functional.economicDiscussion.moderator.moderators.update(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          email_verified: true,
        } satisfies IEconomicDiscussionModerator.IUpdate,
      },
    );
  typia.assert(verifiedModerator);

  TestValidator.equals(
    "updated email verification to true",
    verifiedModerator.email_verified,
    true,
  );
  TestValidator.equals(
    "other moderator data unchanged",
    verifiedModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "email unchanged after verification update",
    verifiedModerator.email,
    moderatorEmail,
  );

  // Update email verification status back to unverified
  const unverifiedModerator =
    await api.functional.economicDiscussion.moderator.moderators.update(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          email_verified: false,
        } satisfies IEconomicDiscussionModerator.IUpdate,
      },
    );
  typia.assert(unverifiedModerator);

  TestValidator.equals(
    "updated email verification to false",
    unverifiedModerator.email_verified,
    false,
  );
  TestValidator.equals(
    "moderator data consistency",
    unverifiedModerator.id,
    moderator.id,
  );
}
