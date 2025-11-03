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
 * Test that members can retrieve and view detailed information about warnings
 * issued to their own account.
 *
 * This test validates member access to their violation history for transparency
 * and understanding of guideline violations.
 *
 * Workflow:
 *
 * 1. Create moderator account who will issue the warning
 * 2. Create member account who will receive and view the warning
 * 3. Moderator issues a warning to the member with specific violation details
 * 4. Member retrieves the warning details using their authentication
 * 5. Validate complete warning information is returned
 */
export async function test_api_member_view_own_warning_details(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(8),
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

  // Step 2: Create member account via join
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass456!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Moderator issues warning to the member
  const warningData = {
    discussion_board_member_id: member.id,
    warning_reason: "inappropriate language",
    warning_details:
      "Your comment contained offensive language that violates our community guidelines. Please keep discussions respectful and professional in future posts.",
    severity: "moderate",
  } satisfies IDiscussionBoardUserWarning.ICreate;

  const issuedWarning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: warningData,
      },
    );
  typia.assert(issuedWarning);

  // Step 4: Member retrieves their warning details
  const retrievedWarning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.member.moderation.warnings.at(
      connection,
      {
        warningId: issuedWarning.id,
      },
    );
  typia.assert(retrievedWarning);

  // Step 5: Validate complete warning information
  TestValidator.equals(
    "warning ID matches",
    retrievedWarning.id,
    issuedWarning.id,
  );

  TestValidator.equals(
    "warning reason is correct",
    retrievedWarning.warning_reason,
    warningData.warning_reason,
  );

  TestValidator.equals(
    "warning details are complete",
    retrievedWarning.warning_details,
    warningData.warning_details,
  );

  TestValidator.equals(
    "severity level is correct",
    retrievedWarning.severity,
    warningData.severity,
  );

  TestValidator.equals(
    "warned member ID matches",
    retrievedWarning.discussion_board_member_id,
    member.id,
  );

  TestValidator.equals(
    "issuing moderator ID matches",
    retrievedWarning.discussion_board_moderator_id,
    moderator.id,
  );

  TestValidator.equals(
    "warned user summary ID matches",
    retrievedWarning.warnedUser.id,
    member.id,
  );

  TestValidator.equals(
    "warned user username matches",
    retrievedWarning.warnedUser.username,
    member.username,
  );

  TestValidator.equals(
    "issuing moderator summary ID matches",
    retrievedWarning.issuingModerator.id,
    moderator.id,
  );

  TestValidator.equals(
    "issuing moderator username matches",
    retrievedWarning.issuingModerator.username,
    moderator.username,
  );

  TestValidator.predicate(
    "warning has creation timestamp",
    retrievedWarning.created_at !== null &&
      retrievedWarning.created_at !== undefined,
  );

  TestValidator.predicate(
    "created_at is valid date-time format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]/.test(
      retrievedWarning.created_at,
    ),
  );
}
