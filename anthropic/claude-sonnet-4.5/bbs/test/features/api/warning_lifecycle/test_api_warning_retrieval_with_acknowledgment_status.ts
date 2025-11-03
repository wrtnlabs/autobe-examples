import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserWarning";

/**
 * Test retrieving warning information including acknowledgment status to verify
 * the complete warning lifecycle.
 *
 * This test validates that warnings are properly created and tracked with their
 * acknowledgment status. The test creates a member account and moderator
 * account, issues a warning to the member with detailed violation explanation,
 * and then retrieves the warning immediately after creation to verify that the
 * acknowledged_at field is null, indicating the member has not yet acknowledged
 * receipt.
 *
 * Steps:
 *
 * 1. Create a member account to receive the warning
 * 2. Create a moderator account to issue the warning
 * 3. Switch to moderator authentication context
 * 4. Issue a warning to the member with violation details
 * 5. Retrieve the warning by its ID
 * 6. Verify acknowledged_at is null (unacknowledged)
 * 7. Validate all warning details are present
 */
export async function test_api_warning_retrieval_with_acknowledgment_status(
  connection: api.IConnection,
) {
  // Step 1: Create member account to receive warning
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create moderator account to issue warning
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderatorEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const moderatorPassword = RandomGenerator.alphaNumeric(10);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/register",
      referrer: "https://example.com/moderator/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Issue warning to member (moderator is already authenticated after join)
  const warningReason = RandomGenerator.pick([
    "spam",
    "harassment",
    "off-topic content",
    "inappropriate language",
  ] as const);
  const warningDetails = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const severity = RandomGenerator.pick([
    "minor",
    "moderate",
    "severe",
  ] as const);

  const issuedWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          warning_reason: warningReason,
          warning_details: warningDetails,
          severity: severity,
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(issuedWarning);

  // Step 4: Retrieve the warning immediately after creation
  const retrievedWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.at(
      connection,
      {
        warningId: issuedWarning.id,
      },
    );
  typia.assert(retrievedWarning);

  // Step 5: Verify acknowledged_at is null (unacknowledged)
  TestValidator.equals(
    "acknowledged_at should be null for newly issued warning",
    retrievedWarning.acknowledged_at,
    null,
  );

  // Step 6: Validate all warning details are present and correct
  TestValidator.equals(
    "warning ID matches",
    retrievedWarning.id,
    issuedWarning.id,
  );
  TestValidator.equals(
    "member ID matches",
    retrievedWarning.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "moderator ID matches",
    retrievedWarning.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "warning reason matches",
    retrievedWarning.warning_reason,
    warningReason,
  );
  TestValidator.equals(
    "warning details match",
    retrievedWarning.warning_details,
    warningDetails,
  );
  TestValidator.equals("severity matches", retrievedWarning.severity, severity);

  // Step 7: Verify warned user summary is populated
  TestValidator.equals(
    "warned user ID matches",
    retrievedWarning.warnedUser.id,
    member.id,
  );
  TestValidator.equals(
    "warned user username matches",
    retrievedWarning.warnedUser.username,
    member.username,
  );

  // Step 8: Verify issuing moderator summary is populated
  TestValidator.equals(
    "issuing moderator ID matches",
    retrievedWarning.issuingModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "issuing moderator username matches",
    retrievedWarning.issuingModerator.username,
    moderator.username,
  );

  // Step 9: Verify related moderation action is null (warning not issued from report)
  TestValidator.equals(
    "related moderation action should be null",
    retrievedWarning.relatedModerationAction,
    null,
  );
}
