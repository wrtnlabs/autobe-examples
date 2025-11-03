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
 * Test soft deletion of a warning issued to the wrong member account.
 *
 * This scenario validates the error correction workflow where a moderator
 * discovers they issued a warning to the incorrect user and needs to retract
 * it. The test creates two member accounts and one moderator account, issues a
 * warning to the first member by mistake, then soft deletes the warning to
 * correct the error.
 *
 * The test verifies that:
 *
 * 1. The warning is successfully created for the mistaken member
 * 2. The soft deletion marks the warning with a deleted_at timestamp
 * 3. The warning is removed from the member's visible warning history
 * 4. The warning record is retained in the system for accountability
 * 5. The complete audit trail is maintained showing when the warning was issued
 *    and when it was retracted
 *
 * This ensures the system supports error correction while maintaining data
 * integrity and audit trail completeness for moderation accountability.
 */
export async function test_api_warning_deletion_error_correction(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create first member account (will receive warning in error)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: member1Email,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member1);

  // Step 3: Create second member account (not involved in this test)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: member2Email,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member2);

  // Step 4: Issue warning to first member by mistake
  const warning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: member1.id,
          related_moderation_action_id: null,
          warning_reason: "spam",
          warning_details:
            "Posted promotional content in discussion thread. This is a violation of community guidelines regarding commercial spam.",
          severity: RandomGenerator.pick([
            "minor",
            "moderate",
            "severe",
          ] as const),
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(warning);

  // Verify warning was created successfully
  TestValidator.equals(
    "warning member ID matches",
    warning.discussion_board_member_id,
    member1.id,
  );
  TestValidator.equals(
    "warning has no deleted timestamp initially",
    warning.deleted_at,
    null,
  );
  TestValidator.predicate(
    "warning has valid creation timestamp",
    warning.created_at !== null && warning.created_at.length > 0,
  );

  // Step 5: Soft delete the warning to correct the error
  const deletedWarning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.erase(
      connection,
      {
        warningId: warning.id,
      },
    );
  typia.assert(deletedWarning);

  // Step 6: Validate soft deletion results
  TestValidator.equals(
    "deleted warning ID matches original",
    deletedWarning.id,
    warning.id,
  );
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedWarning.deleted_at !== null,
  );

  // Step 7: Verify warning details are preserved for audit trail
  TestValidator.equals(
    "warning reason preserved",
    deletedWarning.warning_reason,
    warning.warning_reason,
  );
  TestValidator.equals(
    "warning details preserved",
    deletedWarning.warning_details,
    warning.warning_details,
  );
  TestValidator.equals(
    "severity preserved",
    deletedWarning.severity,
    warning.severity,
  );
  TestValidator.equals(
    "member reference preserved",
    deletedWarning.discussion_board_member_id,
    member1.id,
  );
  TestValidator.equals(
    "moderator reference preserved",
    deletedWarning.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "creation timestamp preserved",
    deletedWarning.created_at,
    warning.created_at,
  );

  // Step 8: Verify audit trail completeness
  TestValidator.predicate(
    "audit trail shows issuance time",
    deletedWarning.created_at !== null,
  );
  TestValidator.predicate(
    "audit trail shows retraction time",
    deletedWarning.deleted_at !== null,
  );
  TestValidator.predicate(
    "retraction after issuance",
    deletedWarning.deleted_at !== null &&
      new Date(deletedWarning.deleted_at).getTime() >=
        new Date(deletedWarning.created_at).getTime(),
  );
}
