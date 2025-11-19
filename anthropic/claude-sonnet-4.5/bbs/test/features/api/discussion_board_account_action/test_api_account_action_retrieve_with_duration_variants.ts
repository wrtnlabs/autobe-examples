import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieving suspensions with different duration values to verify all
 * valid durations are supported.
 *
 * This test validates that the account action retrieval endpoint correctly
 * handles all standard enforcement escalation timeframes (1, 7, 14, 30 days). A
 * moderator creates four separate suspensions with each valid duration_days
 * value, then retrieves each action to verify that duration_days matches the
 * specified value and expires_at is calculated correctly.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as moderator
 * 2. Create four member accounts (one per duration variant)
 * 3. Create suspension for each member with duration: 1, 7, 14, 30 days
 * 4. Retrieve each account action by ID
 * 5. Validate duration_days and expires_at calculation for each suspension
 */
export async function test_api_account_action_retrieve_with_duration_variants(
  connection: api.IConnection,
) {
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      username: typia.random<string>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  const validDurations = [1, 7, 14, 30] as const;
  const suspensions: IDiscussionBoardAccountAction[] = [];

  for (const duration of validDurations) {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<30>
        >(),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);

    const suspension =
      await api.functional.discussionBoard.moderator.accountActions.create(
        connection,
        {
          body: {
            discussion_board_member_id: member.id,
            action_type: "suspension",
            reason: RandomGenerator.paragraph({
              sentences: 5,
              wordMin: 5,
              wordMax: 10,
            }),
            duration_days: duration,
          } satisfies IDiscussionBoardAccountAction.ICreate,
        },
      );
    typia.assert(suspension);
    suspensions.push(suspension);
  }

  for (let i = 0; i < validDurations.length; i++) {
    const expectedDuration = validDurations[i];
    const createdSuspension = suspensions[i];

    const retrievedAction =
      await api.functional.discussionBoard.moderator.accountActions.at(
        connection,
        {
          actionId: createdSuspension.id,
        },
      );
    typia.assert(retrievedAction);

    TestValidator.equals(
      "duration_days matches specified value",
      retrievedAction.duration_days,
      expectedDuration,
    );

    TestValidator.equals(
      "action_type is suspension",
      retrievedAction.action_type,
      "suspension",
    );

    TestValidator.equals("status is active", retrievedAction.status, "active");

    typia.assertGuard(retrievedAction.created_at!);
    typia.assertGuard(retrievedAction.expires_at!);

    const createdDate = new Date(retrievedAction.created_at);
    const expiresDate = new Date(retrievedAction.expires_at);
    const daysDifference = Math.round(
      (expiresDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    TestValidator.equals(
      "expires_at calculated correctly",
      daysDifference,
      expectedDuration,
    );
  }
}
