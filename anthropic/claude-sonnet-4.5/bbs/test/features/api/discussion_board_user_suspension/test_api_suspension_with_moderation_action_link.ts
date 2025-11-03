import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

export async function test_api_suspension_with_moderation_action_link(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate moderator account
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderatorEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const moderatorPassword = RandomGenerator.alphaNumeric(12) + "A1!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://discussion.example.com/moderator/join",
      referrer: "https://discussion.example.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account to be suspended
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberPassword = RandomGenerator.alphaNumeric(12) + "A1!";

  const member = await api.functional.discussionBoard.members.create(
    connection,
    {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        href: "https://discussion.example.com/join",
        referrer: "https://discussion.example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // Step 3: Create moderation action documenting policy violation
  const violationTypes = [
    "spam",
    "harassment",
    "misinformation",
    "hate_speech",
    "off_topic",
  ] as const;
  const selectedViolation = RandomGenerator.pick(violationTypes);

  const moderationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: {
          action_type: "warn_user",
          target_type: "user",
          target_id: member.id,
          reason: `Policy violation: ${selectedViolation}`,
          details: `Member ${memberUsername} violated community guidelines by posting ${selectedViolation} content. This is the first documented violation requiring formal action. Further violations may result in suspension or permanent ban.`,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 4: Create suspension linked to the moderation action
  const suspensionStartTime = new Date();
  const suspensionEndTime = new Date(
    suspensionStartTime.getTime() + 7 * 24 * 60 * 60 * 1000,
  );

  const suspension =
    await api.functional.discussionBoard.moderator.moderation.suspensions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          related_moderation_action_id: moderationAction.id,
          suspension_reason: `Repeated ${selectedViolation} violations`,
          suspension_details: `Following documented moderation action ${moderationAction.id}, member ${memberUsername} is suspended for 7 days due to ${selectedViolation}. This suspension is linked to the formal moderation action documenting the violation. The member may appeal this decision through the standard appeals process.`,
          suspended_at: suspensionStartTime.toISOString(),
          expires_at: suspensionEndTime.toISOString(),
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 5: Validate the suspension is correctly linked to the moderation action
  TestValidator.equals(
    "suspension member ID matches target member",
    suspension.discussion_board_member_id,
    member.id,
  );

  TestValidator.equals(
    "suspension linked to moderation action",
    suspension.related_moderation_action_id,
    moderationAction.id,
  );

  TestValidator.equals(
    "suspended user matches created member",
    suspension.suspendedUser.id,
    member.id,
  );

  TestValidator.equals(
    "suspending moderator matches authenticated moderator",
    suspension.suspendingModerator.id,
    moderator.id,
  );
}
