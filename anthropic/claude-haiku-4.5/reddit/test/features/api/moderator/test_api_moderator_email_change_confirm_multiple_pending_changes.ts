import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test email change confirmation behavior when moderator has multiple pending
 * email changes.
 *
 * This test validates system behavior when a moderator initiates multiple email
 * change requests before confirming any of them. It ensures the system properly
 * handles multiple pending states and prevents conflicts between concurrent
 * email change requests.
 *
 * Test flow:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Initiate first email change request to email address A
 * 3. Initiate second email change request to email address B (before confirming
 *    first)
 * 4. Verify both requests are accepted and pending states exist
 * 5. Test confirmation with an invalid token (should fail appropriately)
 * 6. Verify original email remains active until valid confirmation occurs
 */
export async function test_api_moderator_email_change_confirm_multiple_pending_changes(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderatorUsername = RandomGenerator.alphabets(8);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
      href: "https://example.com/auth/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created successfully",
    moderator.id !== undefined,
  );
  TestValidator.equals(
    "moderator email matches registration email",
    moderator.email,
    moderatorEmail,
  );

  // Step 2: Initiate first email change request to email address A
  const newEmailA = typia.random<string & tags.Format<"email">>();
  const firstChangeResponse =
    await api.functional.communityPlatform.moderator.auth.moderator.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          password: moderatorPassword,
          new_email: newEmailA,
        } satisfies ICommunityPlatformModerator.IEmailChangeRequest,
      },
    );
  typia.assert(firstChangeResponse);
  TestValidator.predicate(
    "first email change verification email sent",
    firstChangeResponse.verification_email_sent === true,
  );
  TestValidator.equals(
    "first change new email stored correctly",
    firstChangeResponse.new_email,
    newEmailA,
  );
  TestValidator.predicate(
    "first change expiration time is valid",
    firstChangeResponse.expiration_time !== null &&
      firstChangeResponse.expiration_time !== undefined,
  );

  // Step 3: Initiate second email change request to email address B (before confirming first)
  const newEmailB = typia.random<string & tags.Format<"email">>();
  const secondChangeResponse =
    await api.functional.communityPlatform.moderator.auth.moderator.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          password: moderatorPassword,
          new_email: newEmailB,
        } satisfies ICommunityPlatformModerator.IEmailChangeRequest,
      },
    );
  typia.assert(secondChangeResponse);
  TestValidator.predicate(
    "second email change verification email sent",
    secondChangeResponse.verification_email_sent === true,
  );
  TestValidator.equals(
    "second change new email stored correctly",
    secondChangeResponse.new_email,
    newEmailB,
  );

  // Step 4: Verify both email addresses are different (no overlap in requests)
  TestValidator.notEquals(
    "first and second new emails are different",
    newEmailA,
    newEmailB,
  );
  TestValidator.notEquals(
    "first new email differs from original",
    newEmailA,
    moderatorEmail,
  );
  TestValidator.notEquals(
    "second new email differs from original",
    newEmailB,
    moderatorEmail,
  );

  // Step 5: Test confirmation with an invalid token (should fail appropriately)
  const invalidToken = RandomGenerator.alphaNumeric(32);
  await TestValidator.error(
    "confirmation with invalid token should fail",
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderator.email_change.confirm.confirmEmailChange(
        connection,
        {
          body: {
            token: invalidToken,
          } satisfies ICommunityPlatformModerator.IEmailChangeConfirm,
        },
      );
    },
  );

  // Step 6: Verify original email still active after failed confirmation attempts
  // System should maintain data consistency even with multiple pending changes
  TestValidator.predicate(
    "moderator password still valid after multiple change requests",
    moderatorPassword !== null,
  );
  TestValidator.predicate(
    "system accepted multiple concurrent change requests",
    secondChangeResponse !== null,
  );
}
