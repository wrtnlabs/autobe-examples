import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_account_action_update_reversal(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for performing moderation operations
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123!",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account using fresh connection to avoid token pollution
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConnection, {
      body: {
        email: memberEmail,
        password: "MemberPass123!",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Apply a permanent ban to the member account (using moderator-authenticated connection)
  const banReason =
    "Repeated violations of community guidelines - spam and harassment";
  const banAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          action_type: "ban",
          reason: banReason,
          duration_days: null,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(banAction);

  // Validate ban was created with active status
  TestValidator.equals("ban status is active", banAction.status, "active");
  TestValidator.equals("ban action type is ban", banAction.action_type, "ban");
  TestValidator.equals("ban reason matches", banAction.reason, banReason);
  TestValidator.equals(
    "ban duration is null for permanent ban",
    banAction.duration_days,
    null,
  );

  // Step 4: Reverse the ban by updating the action with status='reversed' and reversal_reason
  const reversalReason =
    "Ban applied in error - user was impersonated by malicious actor";
  const reversedAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.update(
      connection,
      {
        actionId: banAction.id,
        body: {
          status: "reversed",
          reversal_reason: reversalReason,
        } satisfies IDiscussionBoardAccountAction.IUpdate,
      },
    );
  typia.assert(reversedAction);

  // Step 5: Validate the reversal was successful
  TestValidator.equals(
    "status changed to reversed",
    reversedAction.status,
    "reversed",
  );
  TestValidator.equals(
    "reversal reason is recorded",
    reversedAction.reversal_reason,
    reversalReason,
  );
  TestValidator.equals(
    "reversed by moderator ID is set",
    reversedAction.reversed_by_moderator_id,
    moderator.id,
  );
  TestValidator.predicate(
    "reversed at timestamp is set",
    reversedAction.reversed_at !== null &&
      reversedAction.reversed_at !== undefined,
  );

  // Validate that original action data is preserved
  TestValidator.equals(
    "original action ID preserved",
    reversedAction.id,
    banAction.id,
  );
  TestValidator.equals(
    "original member ID preserved",
    reversedAction.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "original moderator ID preserved",
    reversedAction.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "original action type preserved",
    reversedAction.action_type,
    "ban",
  );
  TestValidator.equals(
    "original reason preserved",
    reversedAction.reason,
    banReason,
  );
  TestValidator.equals(
    "created at timestamp preserved",
    reversedAction.created_at,
    banAction.created_at,
  );
}
