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

/**
 * Test the complete workflow of lifting an active user suspension before its
 * scheduled expiration.
 *
 * This test validates the suspension lifting functionality by:
 *
 * 1. Creating a moderator account for authentication
 * 2. Creating a member account that will be suspended
 * 3. Creating a moderation action to document the initial enforcement
 * 4. Creating an active suspension with a future expiration date
 * 5. Lifting the suspension early with optional notes
 * 6. Validating that the suspension is properly updated with lifted_at timestamp
 * 7. Verifying that the lifting moderator is recorded
 * 8. Confirming that the original suspension record is preserved for audit
 *    purposes
 */
export async function test_api_suspension_early_lift_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorData = {
    username: RandomGenerator.name(1),
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

  // Step 2: Create member account that will be suspended
  const memberData = {
    username: RandomGenerator.name(1),
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

  // Step 3: Create moderation action documenting the enforcement decision
  const moderationActionData = {
    action_type: "suspend_user",
    target_type: "user",
    target_id: member.id,
    reason: "Repeated violations of community guidelines",
    details:
      "User has violated posting guidelines multiple times despite warnings",
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: moderationActionData,
      },
    );
  typia.assert(moderationAction);

  // Step 4: Create active suspension with future expiration date
  const now = new Date();
  const futureExpiration = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const suspensionData = {
    discussion_board_member_id: member.id,
    related_moderation_action_id: moderationAction.id,
    suspension_reason: "Multiple guideline violations",
    suspension_details:
      "User has repeatedly posted off-topic content and engaged in harassment after receiving warnings",
    suspended_at: now.toISOString(),
    expires_at: futureExpiration.toISOString(),
  } satisfies IDiscussionBoardUserSuspension.ICreate;

  const suspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.moderation.suspensions.create(
      connection,
      {
        body: suspensionData,
      },
    );
  typia.assert(suspension);

  // Validate suspension was created correctly
  TestValidator.equals(
    "suspension member ID matches",
    suspension.discussion_board_member_id,
    member.id,
  );
  TestValidator.predicate(
    "suspension has no lifted_at initially",
    suspension.lifted_at === null || suspension.lifted_at === undefined,
  );
  TestValidator.predicate(
    "suspension has no lifting moderator initially",
    suspension.liftingModerator === null ||
      suspension.liftingModerator === undefined,
  );

  // Step 5: Lift the suspension early with notes explaining the reason
  const liftData = {
    lifting_reason:
      "Appeal granted - original enforcement was based on incomplete information",
  } satisfies IDiscussionBoardUserSuspension.ILift;

  const liftedSuspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.moderation.suspensions.lift(
      connection,
      {
        suspensionId: suspension.id,
        body: liftData,
      },
    );
  typia.assert(liftedSuspension);

  // Step 6: Validate that the suspension was properly updated
  TestValidator.predicate(
    "suspension has lifted_at timestamp",
    liftedSuspension.lifted_at !== null &&
      liftedSuspension.lifted_at !== undefined,
  );

  // Step 7: Verify that the lifting moderator is recorded
  typia.assertGuard(liftedSuspension.liftingModerator!);
  TestValidator.equals(
    "lifting moderator ID matches authenticated moderator",
    liftedSuspension.liftingModerator.id,
    moderator.id,
  );

  // Step 8: Confirm original suspension record is preserved
  TestValidator.equals(
    "original suspension ID preserved",
    liftedSuspension.id,
    suspension.id,
  );
  TestValidator.equals(
    "original member ID preserved",
    liftedSuspension.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "original suspension reason preserved",
    liftedSuspension.suspension_reason,
    suspension.suspension_reason,
  );
  TestValidator.equals(
    "original suspended_at timestamp preserved",
    liftedSuspension.suspended_at,
    suspension.suspended_at,
  );
}
