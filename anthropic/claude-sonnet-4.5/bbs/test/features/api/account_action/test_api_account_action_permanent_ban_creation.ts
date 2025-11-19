import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the workflow of applying a permanent ban to a member account for severe
 * policy violations.
 *
 * This test validates the permanent enforcement action workflow:
 *
 * 1. Create a moderator account with authentication
 * 2. Create a second moderator account to simulate a member to be banned
 * 3. Moderator applies a permanent ban with documented reason
 * 4. Verify ban record has correct properties (status 'active', null duration,
 *    null expiration)
 * 5. Confirm accountability fields are properly populated
 *
 * Permanent bans are distinguished from temporary suspensions through null
 * duration_days and null expires_at fields, ensuring the account is blocked
 * indefinitely.
 */
export async function test_api_account_action_permanent_ban_creation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a second account to serve as the target member for banning
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(member);

  // Step 3: Apply permanent ban to the member account
  const banReason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  const accountAction: IDiscussionBoardAccountAction =
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
  typia.assert(accountAction);

  // Step 4: Verify permanent ban properties
  TestValidator.equals(
    "action type should be ban",
    accountAction.action_type,
    "ban",
  );

  TestValidator.equals(
    "ban status should be active",
    accountAction.status,
    "active",
  );

  TestValidator.equals(
    "permanent ban should have null duration_days",
    accountAction.duration_days,
    null,
  );

  TestValidator.equals(
    "permanent ban should have null expires_at",
    accountAction.expires_at,
    null,
  );

  TestValidator.equals(
    "ban reason should match input",
    accountAction.reason,
    banReason,
  );

  // Step 5: Verify accountability fields
  TestValidator.equals(
    "banned member ID should match",
    accountAction.discussion_board_member_id,
    member.id,
  );

  TestValidator.equals(
    "moderator ID should match authenticated moderator",
    accountAction.discussion_board_moderator_id,
    moderator.id,
  );

  TestValidator.equals(
    "reversed_by_moderator_id should be null for new ban",
    accountAction.reversed_by_moderator_id,
    null,
  );

  TestValidator.equals(
    "reversal_reason should be null for new ban",
    accountAction.reversal_reason,
    null,
  );

  TestValidator.equals(
    "reversed_at should be null for new ban",
    accountAction.reversed_at,
    null,
  );

  // Verify created_at timestamp is present
  TestValidator.predicate(
    "created_at should be set",
    accountAction.created_at !== null && accountAction.created_at !== undefined,
  );
}
