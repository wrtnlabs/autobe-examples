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
 * Test that soft deletion of warnings maintains complete audit trail.
 *
 * This test validates that when moderators delete warnings, the records are
 * soft-deleted rather than permanently removed, preserving complete audit
 * trails for accountability, appeals processes, and moderation review. The test
 * ensures that deleted warnings remain accessible with all original information
 * intact and the deleted_at timestamp properly set.
 *
 * Test flow:
 *
 * 1. Create moderator account with audit trail access
 * 2. Create member account for warning issuance
 * 3. Issue warning to member for guideline violation
 * 4. Soft delete the warning
 * 5. Verify warning persists with deleted_at timestamp
 * 6. Confirm all original warning data remains intact
 * 7. Validate no cascade deletion of related moderation actions
 */
export async function test_api_warning_deletion_maintains_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with audit trail access
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member account for warning issuance
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Issue warning to member for guideline violation
  const warningData = {
    discussion_board_member_id: member.id,
    warning_reason: "spam",
    warning_details:
      "Posted repetitive promotional content in multiple discussion threads without adding substantive value to the conversation. This violates our community guidelines section 3.2 regarding spam and self-promotion.",
    severity: "moderate",
  } satisfies IDiscussionBoardUserWarning.ICreate;

  const createdWarning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: warningData,
      },
    );
  typia.assert(createdWarning);

  // Verify the warning was created properly
  TestValidator.equals(
    "warning member ID matches",
    createdWarning.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "warning reason matches",
    createdWarning.warning_reason,
    warningData.warning_reason,
  );
  TestValidator.equals(
    "warning details match",
    createdWarning.warning_details,
    warningData.warning_details,
  );
  TestValidator.equals(
    "warning severity matches",
    createdWarning.severity,
    warningData.severity,
  );
  TestValidator.equals(
    "initial deleted_at is null",
    createdWarning.deleted_at,
    null,
  );

  // Store original warning data for comparison after deletion
  const originalWarningReason = createdWarning.warning_reason;
  const originalWarningDetails = createdWarning.warning_details;
  const originalSeverity = createdWarning.severity;
  const originalMemberId = createdWarning.discussion_board_member_id;
  const originalModeratorId = createdWarning.discussion_board_moderator_id;
  const originalCreatedAt = createdWarning.created_at;

  // Step 4: Soft delete the warning
  const deletedWarning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.erase(
      connection,
      {
        warningId: createdWarning.id,
      },
    );
  typia.assert(deletedWarning);

  // Step 5: Verify warning persists with deleted_at timestamp
  TestValidator.predicate(
    "deleted_at timestamp is set after deletion",
    deletedWarning.deleted_at !== null &&
      deletedWarning.deleted_at !== undefined,
  );

  // Use typia.assert for safe null handling
  const deletedAt = typia.assert(deletedWarning.deleted_at!);

  // Verify deleted_at is after or equal to created_at
  const deletedAtDate = new Date(deletedAt);
  const createdAtDate = new Date(originalCreatedAt);
  TestValidator.predicate(
    "deleted_at timestamp is after created_at",
    deletedAtDate >= createdAtDate,
  );

  // Step 6: Confirm all original warning data remains intact after deletion
  TestValidator.equals(
    "warning ID unchanged",
    deletedWarning.id,
    createdWarning.id,
  );
  TestValidator.equals(
    "warning member ID preserved",
    deletedWarning.discussion_board_member_id,
    originalMemberId,
  );
  TestValidator.equals(
    "warning moderator ID preserved",
    deletedWarning.discussion_board_moderator_id,
    originalModeratorId,
  );
  TestValidator.equals(
    "warning reason preserved",
    deletedWarning.warning_reason,
    originalWarningReason,
  );
  TestValidator.equals(
    "warning details preserved",
    deletedWarning.warning_details,
    originalWarningDetails,
  );
  TestValidator.equals(
    "warning severity preserved",
    deletedWarning.severity,
    originalSeverity,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    deletedWarning.created_at,
    originalCreatedAt,
  );

  // Verify the warned member summary is still intact
  TestValidator.equals(
    "warned member ID preserved",
    deletedWarning.warnedUser.id,
    member.id,
  );
  TestValidator.equals(
    "warned member username preserved",
    deletedWarning.warnedUser.username,
    member.username,
  );

  // Verify the issuing moderator summary is still intact
  TestValidator.equals(
    "issuing moderator ID preserved",
    deletedWarning.issuingModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "issuing moderator username preserved",
    deletedWarning.issuingModerator.username,
    moderator.username,
  );

  // Step 7: Validate that related moderation action reference is preserved
  TestValidator.equals(
    "related moderation action preserved",
    deletedWarning.related_moderation_action_id,
    createdWarning.related_moderation_action_id,
  );

  TestValidator.equals(
    "related moderation action object preserved",
    deletedWarning.relatedModerationAction,
    createdWarning.relatedModerationAction,
  );
}
