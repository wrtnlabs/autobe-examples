import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserWarning";

/**
 * Test suspension as part of progressive discipline system.
 *
 * This test validates the progressive discipline workflow where a member
 * receives multiple warnings for various violations before a suspension is
 * issued. The test demonstrates how the moderation system tracks violation
 * history and supports graduated enforcement escalation from minor warnings
 * through severe warnings to account suspension.
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create member account to receive progressive discipline
 * 3. Issue first warning (minor severity) for off-topic content
 * 4. Issue second warning (moderate severity) for inappropriate language
 * 5. Issue third warning (severe severity) for harassment
 * 6. Create suspension with detailed justification referencing all prior warnings
 * 7. Validate suspension record captures complete enforcement history
 */
export async function test_api_suspension_progressive_discipline(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const moderatorPassword = "SecureMod123!@#";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://example.com/moderator/join",
        referrer: "https://example.com/moderator/signup",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account to receive progressive discipline
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const memberPassword = "MemberPass456!";

  const member: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        href: "https://example.com/members/join",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Issue first warning - minor severity for off-topic content
  const warning1: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          warning_reason: "off-topic content",
          warning_details:
            "Your recent post about movie reviews in the economics forum is off-topic. Please keep discussions focused on economic and political issues relevant to this community.",
          severity: "minor",
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(warning1);

  // Step 4: Issue second warning - moderate severity for inappropriate language
  const warning2: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          warning_reason: "inappropriate language",
          warning_details:
            "Your comment contained profanity and disrespectful language toward other members. This is your second warning. Please maintain civil discourse and avoid offensive language in future posts.",
          severity: "moderate",
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(warning2);

  // Step 5: Issue third warning - severe severity for harassment
  const warning3: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          warning_reason: "harassment",
          warning_details:
            "You have repeatedly targeted another member with personal attacks and intimidating messages across multiple threads. This behavior constitutes harassment and is a serious violation of our community guidelines. This is your third and final warning before suspension.",
          severity: "severe",
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(warning3);

  // Step 6: Create suspension with detailed justification referencing prior warnings
  const suspensionStartTime = new Date().toISOString();
  const suspensionEndTime = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const suspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.moderation.suspensions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          suspension_reason:
            "repeated violations following progressive discipline",
          suspension_details: `Account suspended for 7 days following progressive discipline escalation. Violation history: 1) Warning issued for off-topic content (minor severity) - member posted movie reviews in economics forum. 2) Warning issued for inappropriate language (moderate severity) - member used profanity and disrespectful language toward other members. 3) Warning issued for harassment (severe severity) - member engaged in repeated personal attacks and intimidating messages targeting another member across multiple threads. Despite three prior warnings of escalating severity, member continued to violate community guidelines. This 7-day suspension is necessary to enforce community standards and provide time for the member to review guidelines before returning.`,
          suspended_at: suspensionStartTime,
          expires_at: suspensionEndTime,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 7: Validate suspension record captures enforcement history appropriately
  TestValidator.equals(
    "suspension targets correct member",
    suspension.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "suspension issued by correct moderator",
    suspension.suspending_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "suspension reason reflects progressive discipline",
    suspension.suspension_reason,
    "repeated violations following progressive discipline",
  );
  TestValidator.predicate(
    "suspension details reference off-topic warning",
    suspension.suspension_details.includes(
      "Warning issued for off-topic content",
    ),
  );
  TestValidator.predicate(
    "suspension details reference language warning",
    suspension.suspension_details.includes(
      "Warning issued for inappropriate language",
    ),
  );
  TestValidator.predicate(
    "suspension details reference harassment warning",
    suspension.suspension_details.includes("Warning issued for harassment"),
  );
  TestValidator.predicate(
    "suspension details mention progressive discipline",
    suspension.suspension_details.includes("progressive discipline"),
  );
  TestValidator.predicate(
    "suspension details mention escalation pattern",
    suspension.suspension_details.includes("escalating severity"),
  );
  TestValidator.equals(
    "suspended user summary matches member",
    suspension.suspendedUser.id,
    member.id,
  );
  TestValidator.equals(
    "suspending moderator summary matches moderator",
    suspension.suspendingModerator.id,
    moderator.id,
  );
}
