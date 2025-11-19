import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAccountAction";

/**
 * Test retrieving paginated history of account actions performed by a
 * moderator.
 *
 * This test validates the accountability and transparency features that enable
 * tracking moderator enforcement patterns. It verifies that moderators can
 * review their complete enforcement activity including suspensions and bans
 * they have applied.
 *
 * Test workflow:
 *
 * 1. Authenticate as the target moderator
 * 2. Create multiple member accounts as enforcement targets
 * 3. Apply diverse account actions (suspensions with various durations, bans)
 * 4. Query the moderator's action history with pagination
 * 5. Validate all actions are present with correct details
 * 6. Verify pagination metadata accuracy
 */
export async function test_api_moderator_account_actions_history_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as the moderator whose action history will be reviewed
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    email: moderatorEmail,
    password: typia.random<string>(),
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create multiple member accounts to serve as enforcement targets
  const memberCount = 5;
  const members: IDiscussionBoardMember.IAuthorized[] =
    await ArrayUtil.asyncRepeat(memberCount, async (index) => {
      const memberEmail = typia.random<string & tags.Format<"email">>();
      const memberData = {
        email: memberEmail,
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(8) + index.toString(),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate;

      const member: IDiscussionBoardMember.IAuthorized =
        await api.functional.auth.member.join(connection, {
          body: memberData,
        });
      typia.assert(member);
      return member;
    });

  // Step 3: Apply diverse account actions with various types, durations, and reasons
  const actionTypes: Array<"suspension" | "ban"> = [
    "suspension",
    "suspension",
    "suspension",
    "suspension",
    "ban",
  ];
  const durations: Array<1 | 7 | 14 | 30 | null> = [1, 7, 14, 30, null];
  const reasons = [
    "Spam violation - first offense",
    "Harassment of other members - 7 day suspension",
    "Repeated policy violations - 14 day suspension",
    "Severe misconduct - 30 day suspension",
    "Permanent ban for illegal content posting",
  ];

  const createdActions: IDiscussionBoardAccountAction[] =
    await ArrayUtil.asyncRepeat(memberCount, async (index) => {
      const actionData = {
        discussion_board_member_id: members[index].id,
        action_type: actionTypes[index],
        reason: reasons[index],
        duration_days: durations[index],
      } satisfies IDiscussionBoardAccountAction.ICreate;

      const action: IDiscussionBoardAccountAction =
        await api.functional.discussionBoard.moderator.accountActions.create(
          connection,
          {
            body: actionData,
          },
        );
      typia.assert(action);
      return action;
    });

  // Step 4: Query the moderator's account action history with pagination
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardAccountAction.IRequest;

  const actionHistory: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.moderators.accountActions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: requestBody,
      },
    );
  typia.assert(actionHistory);

  // Step 5: Validate response contains all actions performed by this moderator
  TestValidator.equals(
    "action history should contain all created actions",
    actionHistory.data.length,
    memberCount,
  );

  // Step 6: Verify pagination metadata reflects correct total count
  TestValidator.equals(
    "pagination total records should match created actions count",
    actionHistory.pagination.records,
    memberCount,
  );

  TestValidator.equals(
    "pagination current page should be 1",
    actionHistory.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should be 10",
    actionHistory.pagination.limit,
    10,
  );

  // Step 7: Validate each action's details match what was created
  createdActions.forEach((createdAction, index) => {
    const foundAction = actionHistory.data.find(
      (a) => a.id === createdAction.id,
    );
    typia.assertGuard(foundAction!);

    TestValidator.equals(
      `action ${index} type should match`,
      foundAction.action_type,
      createdAction.action_type,
    );

    TestValidator.equals(
      `action ${index} reason should match`,
      foundAction.reason,
      createdAction.reason,
    );

    TestValidator.equals(
      `action ${index} status should be active`,
      foundAction.status,
      "active",
    );

    TestValidator.equals(
      `action ${index} duration_days should match`,
      foundAction.duration_days,
      createdAction.duration_days,
    );
  });
}
