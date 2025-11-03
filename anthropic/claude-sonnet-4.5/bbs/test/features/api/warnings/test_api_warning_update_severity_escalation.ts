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
 * Test warning severity escalation workflow.
 *
 * This test validates that moderators can update a user warning's severity
 * level from minor to severe when additional violations are discovered or when
 * initial assessment was incorrect. The test creates a moderator account,
 * creates a member account, issues an initial warning with minor severity, then
 * updates the warning to severe severity with updated reason and details.
 *
 * Verification ensures that the updated warning record reflects the new
 * severity level, updated reason, updated details, and maintains the original
 * issuing moderator and warned member references. The warning ID remains the
 * same and the update preserves audit trail integrity.
 */
export async function test_api_warning_update_severity_escalation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
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

  // Step 2: Create member account to receive warning
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

  // Step 3: Issue initial warning with minor severity
  const initialWarningData = {
    discussion_board_member_id: member.id,
    warning_reason: "off-topic content",
    warning_details:
      "Posted an article that was not related to economics or politics. Please ensure future posts are on-topic.",
    severity: "minor",
  } satisfies IDiscussionBoardUserWarning.ICreate;

  const initialWarning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: initialWarningData,
      },
    );
  typia.assert(initialWarning);

  // Verify initial warning properties
  TestValidator.equals(
    "initial warning severity is minor",
    initialWarning.severity,
    "minor",
  );
  TestValidator.equals(
    "initial warning reason",
    initialWarning.warning_reason,
    "off-topic content",
  );
  TestValidator.equals(
    "warned member ID matches",
    initialWarning.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "issuing moderator ID matches",
    initialWarning.discussion_board_moderator_id,
    moderator.id,
  );

  // Step 4: Update warning to escalate severity to severe
  const updateData = {
    warning_reason: "repeated off-topic content with spam",
    warning_details:
      "Upon further review, discovered multiple instances of off-topic posting combined with promotional spam links. Escalating severity due to pattern of violations and commercial intent.",
    severity: "severe",
  } satisfies IDiscussionBoardUserWarning.IUpdate;

  const updatedWarning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.update(
      connection,
      {
        warningId: initialWarning.id,
        body: updateData,
      },
    );
  typia.assert(updatedWarning);

  // Step 5: Verify updated warning properties
  TestValidator.equals(
    "warning ID remains unchanged",
    updatedWarning.id,
    initialWarning.id,
  );
  TestValidator.equals(
    "severity escalated to severe",
    updatedWarning.severity,
    "severe",
  );
  TestValidator.equals(
    "warning reason updated",
    updatedWarning.warning_reason,
    "repeated off-topic content with spam",
  );
  TestValidator.predicate(
    "warning details updated with escalation context",
    updatedWarning.warning_details.includes("Escalating severity"),
  );
  TestValidator.equals(
    "warned member reference preserved",
    updatedWarning.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "issuing moderator reference preserved",
    updatedWarning.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedWarning.created_at,
    initialWarning.created_at,
  );
  TestValidator.notEquals(
    "updated_at timestamp modified",
    updatedWarning.updated_at,
    initialWarning.updated_at,
  );
}
