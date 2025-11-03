import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserWarning";

export async function test_api_warning_update_add_context_details(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to manage warnings
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account to be warned
  const memberEmail = typia.random<string & tags.Format<"email">>();

  const member: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: "MemberPass456!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Issue initial warning with basic details
  const initialWarningReason = "inappropriate language";
  const initialWarningDetails = "Used profanity in comment thread.";
  const warningSeverity = "moderate";

  const initialWarning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          warning_reason: initialWarningReason,
          warning_details: initialWarningDetails,
          severity: warningSeverity,
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(initialWarning);

  // Verify initial warning was created correctly
  TestValidator.equals(
    "initial warning member ID matches",
    initialWarning.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "initial warning moderator ID matches",
    initialWarning.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "initial warning reason",
    initialWarning.warning_reason,
    initialWarningReason,
  );
  TestValidator.equals(
    "initial warning details",
    initialWarning.warning_details,
    initialWarningDetails,
  );
  TestValidator.equals(
    "initial warning severity",
    initialWarning.severity,
    warningSeverity,
  );

  // Step 4: Update warning with comprehensive additional context discovered during investigation
  const enhancedWarningDetails =
    "Used profanity in comment thread. Further investigation revealed this was part of a pattern of disrespectful behavior spanning multiple discussions over the past week. The member posted aggressive language in at least 3 different threads, targeting other members who disagreed with their economic policy views. This behavior violates our community guidelines section 2.3 regarding respectful discourse. Previous informal reminders were sent but ignored. This formal warning serves as notice that continued violations will result in temporary suspension.";

  const updatedWarning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.update(
      connection,
      {
        warningId: initialWarning.id,
        body: {
          warning_details: enhancedWarningDetails,
        } satisfies IDiscussionBoardUserWarning.IUpdate,
      },
    );
  typia.assert(updatedWarning);

  // Step 5: Verify updated warning includes new detailed explanation while preserving original data
  TestValidator.equals(
    "updated warning ID unchanged",
    updatedWarning.id,
    initialWarning.id,
  );
  TestValidator.equals(
    "updated warning member ID preserved",
    updatedWarning.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "updated warning moderator ID preserved",
    updatedWarning.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "updated warning reason preserved",
    updatedWarning.warning_reason,
    initialWarningReason,
  );
  TestValidator.equals(
    "updated warning severity preserved",
    updatedWarning.severity,
    warningSeverity,
  );
  TestValidator.equals(
    "updated warning details enhanced",
    updatedWarning.warning_details,
    enhancedWarningDetails,
  );

  // Verify that the warning details were actually updated (not same as initial)
  TestValidator.notEquals(
    "warning details were enhanced",
    updatedWarning.warning_details,
    initialWarningDetails,
  );

  // Verify audit timestamps reflect the update
  TestValidator.equals(
    "created timestamp unchanged",
    updatedWarning.created_at,
    initialWarning.created_at,
  );
  TestValidator.predicate(
    "updated timestamp is after creation",
    new Date(updatedWarning.updated_at).getTime() >=
      new Date(initialWarning.updated_at).getTime(),
  );

  // Verify member and moderator summary references are intact
  TestValidator.equals(
    "warned user ID matches",
    updatedWarning.warnedUser.id,
    member.id,
  );
  TestValidator.equals(
    "issuing moderator ID matches",
    updatedWarning.issuingModerator.id,
    moderator.id,
  );
}
