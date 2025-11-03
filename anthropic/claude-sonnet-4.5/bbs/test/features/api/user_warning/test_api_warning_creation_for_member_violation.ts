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
 * Test the complete workflow of a moderator issuing a warning to a member for
 * community guideline violations.
 *
 * This test validates the progressive discipline system by:
 *
 * 1. Creating and authenticating a moderator account
 * 2. Creating a member account who will receive the warning
 * 3. Moderator issuing a warning with severity level, violation reason, and
 *    detailed explanation
 * 4. Validating the warning record contains all required fields including warned
 *    member ID, issuing moderator ID, warning reason, severity, and timestamps
 * 5. Verifying the warning becomes part of the member's violation history for
 *    progressive discipline tracking
 *
 * The test ensures moderators can successfully document policy violations, the
 * system records comprehensive warning details including severity level (minor,
 * moderate, or severe), the warning is properly associated with both the warned
 * member and issuing moderator, and the operation returns the complete warning
 * record with system-generated fields and timestamps.
 */
export async function test_api_warning_creation_for_member_violation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a member account who will receive the warning
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Moderator issues a warning to the member for guideline violations
  const severityLevels = ["minor", "moderate", "severe"] as const;
  const selectedSeverity = RandomGenerator.pick(severityLevels);

  const warningData = {
    discussion_board_member_id: member.id,
    warning_reason: "inappropriate content",
    warning_details:
      "Your comment on the article about economic policy contained personal attacks against the author, calling them incompetent and questioning their intelligence. Our community guidelines require focusing criticism on ideas and arguments rather than attacking individuals personally. Please keep future discussions respectful and focused on substantive policy issues.",
    severity: selectedSeverity,
  } satisfies IDiscussionBoardUserWarning.ICreate;

  const warning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: warningData,
      },
    );
  typia.assert(warning);

  // Step 4: Validate the warning record contains all required fields
  TestValidator.equals(
    "warned member ID matches",
    warning.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "issuing moderator ID matches",
    warning.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "warning reason matches",
    warning.warning_reason,
    warningData.warning_reason,
  );
  TestValidator.equals(
    "warning details match",
    warning.warning_details,
    warningData.warning_details,
  );
  TestValidator.equals("severity matches", warning.severity, selectedSeverity);

  // Step 5: Validate business state fields
  TestValidator.equals(
    "acknowledged_at is null",
    warning.acknowledged_at,
    null,
  );
  TestValidator.equals("deleted_at is null", warning.deleted_at, null);

  // Step 6: Validate relationships
  TestValidator.equals(
    "warnedUser username matches",
    warning.warnedUser.username,
    member.username,
  );
  TestValidator.equals(
    "warnedUser ID matches",
    warning.warnedUser.id,
    member.id,
  );
  TestValidator.equals(
    "issuingModerator username matches",
    warning.issuingModerator.username,
    moderator.username,
  );
  TestValidator.equals(
    "issuingModerator ID matches",
    warning.issuingModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "relatedModerationAction is null",
    warning.relatedModerationAction,
    null,
  );
}
