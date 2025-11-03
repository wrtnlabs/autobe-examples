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
 * Test the warning system's support for different severity levels and
 * progressive discipline tracking.
 *
 * This test validates that moderators can issue warnings with different
 * severity classifications (minor, moderate, severe) and that the system
 * properly tracks multiple warnings for the same member to support progressive
 * discipline enforcement. The test ensures severity levels are correctly
 * recorded and multiple warnings are associated with the same member for
 * violation history tracking.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a member account who will receive warnings
 * 3. Issue a minor severity warning for a first-time violation
 * 4. Validate the minor warning is created with correct severity
 * 5. Issue a moderate severity warning for an escalated violation
 * 6. Validate the moderate warning is created with correct severity
 * 7. Verify both warnings are associated with the same member
 * 8. Validate severity levels are properly recorded for progressive discipline
 */
export async function test_api_warning_creation_with_severity_levels(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
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

  // Step 2: Create a member account who will receive warnings
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

  // Step 3: Issue a minor severity warning for first-time violation
  const minorWarningData = {
    discussion_board_member_id: member.id,
    warning_reason: "off-topic content",
    warning_details:
      "Your comment on the economic policy article was not related to the topic being discussed. Please keep discussions focused on the subject matter to maintain productive conversations.",
    severity: "minor",
  } satisfies IDiscussionBoardUserWarning.ICreate;

  const minorWarning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: minorWarningData,
      },
    );
  typia.assert(minorWarning);

  // Step 4: Validate the minor warning is created correctly
  TestValidator.equals(
    "minor warning member ID matches",
    minorWarning.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "minor warning severity is correct",
    minorWarning.severity,
    "minor",
  );
  TestValidator.equals(
    "minor warning reason is correct",
    minorWarning.warning_reason,
    "off-topic content",
  );

  // Step 5: Issue a moderate severity warning for escalated violation
  const moderateWarningData = {
    discussion_board_member_id: member.id,
    warning_reason: "inappropriate language",
    warning_details:
      "Your recent comment contained disrespectful language toward another member. This is a repeated violation following your previous warning. Please maintain a respectful tone in all discussions or further action will be taken.",
    severity: "moderate",
  } satisfies IDiscussionBoardUserWarning.ICreate;

  const moderateWarning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: moderateWarningData,
      },
    );
  typia.assert(moderateWarning);

  // Step 6: Validate the moderate warning is created correctly
  TestValidator.equals(
    "moderate warning member ID matches",
    moderateWarning.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "moderate warning severity is correct",
    moderateWarning.severity,
    "moderate",
  );
  TestValidator.equals(
    "moderate warning reason is correct",
    moderateWarning.warning_reason,
    "inappropriate language",
  );

  // Step 7: Verify both warnings are associated with the same member for progressive discipline
  TestValidator.equals(
    "both warnings target same member",
    minorWarning.discussion_board_member_id,
    moderateWarning.discussion_board_member_id,
  );
  TestValidator.predicate(
    "warnings have different severity levels",
    minorWarning.severity !== moderateWarning.severity,
  );

  // Step 8: Validate severity levels are properly recorded
  TestValidator.predicate(
    "minor severity is recorded",
    minorWarning.severity === "minor",
  );
  TestValidator.predicate(
    "moderate severity is recorded",
    moderateWarning.severity === "moderate",
  );
}
