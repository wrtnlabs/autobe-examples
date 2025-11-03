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

export async function test_api_suspension_detail_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account through registration
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account that will be suspended
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create moderation action record documenting the enforcement decision
  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: {
          action_type: "suspend_user",
          target_type: "user",
          target_id: member.id,
          reason: "Repeated violation of community guidelines",
          details:
            "User has been warned multiple times for posting spam content and harassment. This suspension is warranted due to continued violations after previous warnings.",
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 4: Create suspension for the member with violation details and duration
  const suspensionStartTime = new Date();
  const suspensionEndTime = new Date(
    suspensionStartTime.getTime() + 7 * 24 * 60 * 60 * 1000,
  );

  const suspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.moderation.suspensions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          related_moderation_action_id: moderationAction.id,
          suspension_reason: "Spam and harassment violations",
          suspension_details:
            "This member has repeatedly posted spam content promoting commercial services and engaged in harassment of other community members despite multiple warnings. The 7-day suspension is issued to enforce community standards and provide time for reflection on behavior.",
          suspended_at: suspensionStartTime.toISOString(),
          expires_at: suspensionEndTime.toISOString(),
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 5: Retrieve the suspension details to verify all information is correctly returned
  const retrievedSuspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.moderation.suspensions.at(
      connection,
      {
        suspensionId: suspension.id,
      },
    );
  typia.assert(retrievedSuspension);

  // Validate key business logic and data integrity
  TestValidator.equals(
    "retrieved suspension ID matches created suspension",
    retrievedSuspension.id,
    suspension.id,
  );

  TestValidator.equals(
    "suspended member information is correctly referenced",
    retrievedSuspension.suspendedUser.id,
    member.id,
  );

  TestValidator.equals(
    "suspending moderator information is correctly referenced",
    retrievedSuspension.suspendingModerator.id,
    moderator.id,
  );

  TestValidator.equals(
    "suspension reason matches",
    retrievedSuspension.suspension_reason,
    "Spam and harassment violations",
  );

  TestValidator.equals(
    "related moderation action is linked",
    retrievedSuspension.related_moderation_action_id,
    moderationAction.id,
  );

  TestValidator.predicate(
    "suspension start time is before expiration time",
    new Date(retrievedSuspension.suspended_at).getTime() <
      new Date(typia.assert(retrievedSuspension.expires_at!)).getTime(),
  );

  TestValidator.predicate(
    "suspension has not been lifted yet",
    retrievedSuspension.lifted_at === null ||
      retrievedSuspension.lifted_at === undefined,
  );
}
