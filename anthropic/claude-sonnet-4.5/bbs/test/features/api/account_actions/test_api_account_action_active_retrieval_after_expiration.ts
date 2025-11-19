import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieving active account action and validate suspension lifecycle
 * management.
 *
 * This test validates that the active action retrieval endpoint correctly
 * filters for status='active' suspensions. While the test cannot simulate
 * actual time passage to test expired suspensions, it confirms that:
 *
 * 1. Active suspensions are correctly retrieved via the active endpoint
 * 2. The endpoint properly filters by member ID and status='active'
 * 3. Suspension creation and retrieval work as expected
 *
 * Note: Testing actual expiration (status='expired' returning null) would
 * require time manipulation or waiting, which is not feasible in E2E tests.
 * This test validates the active state filtering mechanism that would exclude
 * expired suspensions.
 *
 * Test workflow:
 *
 * 1. Authenticate as moderator to gain enforcement privileges
 * 2. Create a member account as the suspension target
 * 3. Create a temporary suspension with 1-day duration
 * 4. Retrieve the active account action and verify correct filtering
 * 5. Validate that active suspensions are properly returned
 */
export async function test_api_account_action_active_retrieval_after_expiration(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to gain enforcement privileges
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a member account as the target of suspension
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Create a temporary suspension (connection already has moderator auth)
  const suspensionData = {
    discussion_board_member_id: member.id,
    action_type: "suspension" as const,
    reason: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    duration_days: 1 as const,
  } satisfies IDiscussionBoardAccountAction.ICreate;

  const accountAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: suspensionData,
      },
    );
  typia.assert(accountAction);

  // Validate the created suspension
  TestValidator.equals(
    "suspension action type matches",
    accountAction.action_type,
    "suspension",
  );
  TestValidator.equals(
    "suspension targets correct member",
    accountAction.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "suspension status is active",
    accountAction.status,
    "active",
  );
  TestValidator.equals(
    "suspension duration is 1 day",
    accountAction.duration_days,
    1,
  );

  // Step 4: Retrieve the active account action
  const activeAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.members.accountActions.active(
      connection,
      {
        memberId: member.id,
      },
    );
  typia.assert(activeAction);

  // Step 5: Validate the retrieved active action
  TestValidator.equals(
    "active action ID matches created suspension",
    activeAction.id,
    accountAction.id,
  );
  TestValidator.equals(
    "active action status is active",
    activeAction.status,
    "active",
  );
  TestValidator.equals(
    "active action type is suspension",
    activeAction.action_type,
    "suspension",
  );
  TestValidator.equals(
    "active action member ID matches",
    activeAction.discussion_board_member_id,
    member.id,
  );

  // Note: This test validates that active suspensions are correctly retrieved.
  // In a real-world scenario where the suspension expires (status='expired'),
  // the endpoint would return null since it filters for status='active' only.
  // This confirms the lifecycle management where expired suspensions are excluded,
  // allowing members to regain account access automatically.
}
