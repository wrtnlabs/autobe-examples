import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieving active account action after reversal by moderator.
 *
 * This test validates the complete lifecycle of an account enforcement action
 * from creation through reversal. It ensures that when a moderator reverses a
 * suspension or ban (due to error or successful appeal), the active account
 * action query correctly returns null, confirming the member's access is
 * restored.
 *
 * Test workflow:
 *
 * 1. First moderator registers and authenticates
 * 2. Target member account is created
 * 3. First moderator applies suspension to member
 * 4. Second moderator registers and authenticates
 * 5. Second moderator reverses the account action
 * 6. Verify active account action query returns null
 */
export async function test_api_account_action_active_retrieval_after_reversal(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator who will apply the initial enforcement action
  const firstModeratorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
    username: typia.random<string>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const firstModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: firstModeratorData,
    });
  typia.assert(firstModerator);

  // Step 2: Create target member account that will receive enforcement action
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: First moderator applies a suspension to the member
  const accountActionData = {
    discussion_board_member_id: member.id,
    action_type: RandomGenerator.pick(["suspension", "ban"] as const),
    reason: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    duration_days: 7 as 7,
  } satisfies IDiscussionBoardAccountAction.ICreate;

  const accountAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: accountActionData,
      },
    );
  typia.assert(accountAction);

  // Verify the action was created with active status
  TestValidator.equals(
    "account action status should be active",
    accountAction.status,
    "active",
  );

  // Step 4: Create second moderator who will reverse the action
  const secondModeratorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
    username: typia.random<string>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const secondModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: secondModeratorData,
    });
  typia.assert(secondModerator);

  // Step 5: Second moderator reverses the account action
  const reversalData = {
    status: "reversed" as "reversed",
    reversal_reason: "Action applied in error after review of the case",
  } satisfies IDiscussionBoardAccountAction.IUpdate;

  const reversedAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.update(
      connection,
      {
        actionId: accountAction.id,
        body: reversalData,
      },
    );
  typia.assert(reversedAction);

  // Verify the action was reversed
  TestValidator.equals(
    "account action status should be reversed",
    reversedAction.status,
    "reversed",
  );
  TestValidator.predicate(
    "reversal reason should be present",
    reversedAction.reversal_reason !== null &&
      reversedAction.reversal_reason !== undefined,
  );

  // Step 6: Retrieve active account action for the member
  const activeAction =
    await api.functional.discussionBoard.moderator.members.accountActions.active(
      connection,
      {
        memberId: member.id,
      },
    );

  // Verify that no active action exists (null response expected)
  TestValidator.equals(
    "active account action should be null after reversal",
    activeAction,
    null,
  );
}
