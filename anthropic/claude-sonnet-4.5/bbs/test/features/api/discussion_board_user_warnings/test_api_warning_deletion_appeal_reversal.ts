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
 * Test soft deletion of a warning following successful member appeal.
 *
 * This test validates the appeal resolution workflow where a moderator
 * determines that a warning was issued inappropriately and should be retracted.
 * The scenario creates moderator and member accounts, issues a warning to the
 * member, then soft deletes the warning to reverse the enforcement action.
 *
 * Workflow:
 *
 * 1. Create moderator account with warning management permissions
 * 2. Create member account to receive warning
 * 3. Issue warning to member for policy violation
 * 4. Soft delete warning to reverse enforcement after appeal
 * 5. Verify warning has deleted_at timestamp and is preserved for audit
 */
export async function test_api_warning_deletion_appeal_reversal(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureMod123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass456!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Issue warning to member
  const severities = ["minor", "moderate", "severe"] as const;
  const warningData = {
    discussion_board_member_id: member.id,
    warning_reason: "off-topic content",
    warning_details: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    severity: RandomGenerator.pick(severities),
  } satisfies IDiscussionBoardUserWarning.ICreate;

  const issuedWarning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      { body: warningData },
    );
  typia.assert(issuedWarning);

  // Validate issued warning structure
  TestValidator.equals(
    "warning member ID matches",
    issuedWarning.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "warning moderator ID matches",
    issuedWarning.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "warning reason preserved",
    issuedWarning.warning_reason,
    warningData.warning_reason,
  );
  TestValidator.equals(
    "warning severity preserved",
    issuedWarning.severity,
    warningData.severity,
  );
  TestValidator.equals(
    "warning initially not deleted",
    issuedWarning.deleted_at,
    null,
  );

  // Step 4: Soft delete warning to reverse enforcement
  const deletedWarning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.erase(
      connection,
      { warningId: issuedWarning.id },
    );
  typia.assert(deletedWarning);

  // Step 5: Verify soft deletion results
  TestValidator.equals(
    "deleted warning ID matches original",
    deletedWarning.id,
    issuedWarning.id,
  );
  TestValidator.equals(
    "deleted warning member ID preserved",
    deletedWarning.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "deleted warning reason preserved",
    deletedWarning.warning_reason,
    warningData.warning_reason,
  );
  TestValidator.equals(
    "deleted warning details preserved",
    deletedWarning.warning_details,
    warningData.warning_details,
  );
  TestValidator.equals(
    "deleted warning severity preserved",
    deletedWarning.severity,
    warningData.severity,
  );

  // Verify deleted_at timestamp is set
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedWarning.deleted_at !== null &&
      deletedWarning.deleted_at !== undefined,
  );

  // Verify all other warning metadata remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    deletedWarning.created_at,
    issuedWarning.created_at,
  );
  TestValidator.equals(
    "issuing moderator preserved",
    deletedWarning.discussion_board_moderator_id,
    issuedWarning.discussion_board_moderator_id,
  );
}
