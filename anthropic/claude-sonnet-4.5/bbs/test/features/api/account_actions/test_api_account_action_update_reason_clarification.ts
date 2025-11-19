import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_account_action_update_reason_clarification(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: typia.random<string>(),
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account that will receive the suspension
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create initial suspension action with brief reason
  const initialReason = "Policy violation detected";
  const suspensionDuration = 7 as const;

  const accountAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          action_type: "suspension",
          reason: initialReason,
          duration_days: suspensionDuration,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(accountAction);

  // Validate initial state
  TestValidator.equals(
    "initial reason matches",
    accountAction.reason,
    initialReason,
  );
  TestValidator.equals(
    "duration is 7 days",
    accountAction.duration_days,
    suspensionDuration,
  );
  TestValidator.equals("status is active", accountAction.status, "active");

  // Step 4: Update the action with expanded and clarified reason
  const clarifiedReason =
    "Policy violation detected: Member posted spam content in multiple discussion threads violating community guideline 3.2. This is a first offense, resulting in a 7-day suspension to allow time for review of community standards.";

  const updatedAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.update(
      connection,
      {
        actionId: accountAction.id,
        body: {
          reason: clarifiedReason,
        } satisfies IDiscussionBoardAccountAction.IUpdate,
      },
    );
  typia.assert(updatedAction);

  // Step 5: Verify that reason was updated while other fields remain unchanged
  TestValidator.equals(
    "action ID remains the same",
    updatedAction.id,
    accountAction.id,
  );
  TestValidator.equals(
    "reason was updated with clarification",
    updatedAction.reason,
    clarifiedReason,
  );
  TestValidator.notEquals(
    "reason changed from original",
    updatedAction.reason,
    initialReason,
  );
  TestValidator.equals(
    "duration unchanged",
    updatedAction.duration_days,
    accountAction.duration_days,
  );
  TestValidator.equals(
    "status unchanged",
    updatedAction.status,
    accountAction.status,
  );
  TestValidator.equals(
    "member ID unchanged",
    updatedAction.discussion_board_member_id,
    accountAction.discussion_board_member_id,
  );
  TestValidator.equals(
    "moderator ID unchanged",
    updatedAction.discussion_board_moderator_id,
    accountAction.discussion_board_moderator_id,
  );
  TestValidator.equals(
    "created timestamp unchanged",
    updatedAction.created_at,
    accountAction.created_at,
  );
  TestValidator.equals(
    "expires_at timestamp unchanged",
    updatedAction.expires_at,
    accountAction.expires_at,
  );
}
