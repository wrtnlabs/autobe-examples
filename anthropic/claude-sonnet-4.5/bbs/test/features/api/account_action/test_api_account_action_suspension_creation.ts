import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the complete workflow of a moderator creating a temporary suspension
 * against a member account.
 *
 * This test validates that moderators can successfully apply disciplinary
 * actions for policy violations with proper documentation. The workflow creates
 * a moderator account, creates a second account to act as the target member,
 * then applies a 7-day suspension with documented reason.
 *
 * Verification includes:
 *
 * 1. Suspension is created with status 'active'
 * 2. Duration is correctly set to 7 days
 * 3. The expires_at timestamp is calculated as created_at + 7 days
 * 4. All required fields (moderator_id, member_id, action_type, reason) are
 *    populated
 * 5. Complete account action record with UUID and timestamps is returned
 */
export async function test_api_account_action_suspension_creation(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account (who will apply the suspension)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePassword123!",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/login" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create second moderator account (to act as the "member" being suspended)
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: targetEmail,
      password: "TargetPassword123!",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(targetModerator);

  // Step 3: Create a 7-day suspension against the target member
  const suspensionReason =
    "Repeated violations of community guidelines: posting spam content in multiple discussion threads after two prior warnings.";
  const accountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: targetModerator.id,
          action_type: "suspension" satisfies "suspension" | "ban",
          reason: suspensionReason,
          duration_days: 7,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(accountAction);

  // Step 4: Validate the suspension record
  TestValidator.equals(
    "action type is suspension",
    accountAction.action_type,
    "suspension",
  );
  TestValidator.equals("status is active", accountAction.status, "active");
  TestValidator.equals("duration is 7 days", accountAction.duration_days, 7);
  TestValidator.equals(
    "reason matches",
    accountAction.reason,
    suspensionReason,
  );
  TestValidator.equals(
    "member ID matches",
    accountAction.discussion_board_member_id,
    targetModerator.id,
  );
  TestValidator.equals(
    "moderator ID matches",
    accountAction.discussion_board_moderator_id,
    moderator.id,
  );

  // Step 5: Verify expires_at is correctly calculated as created_at + 7 days
  typia.assertGuard(accountAction.expires_at!);
  const createdDate = new Date(accountAction.created_at);
  const expiresDate = new Date(accountAction.expires_at);
  const expectedExpiresDate = new Date(createdDate);
  expectedExpiresDate.setDate(expectedExpiresDate.getDate() + 7);

  // Allow 1 second tolerance for timestamp comparison
  const timeDifference = Math.abs(
    expiresDate.getTime() - expectedExpiresDate.getTime(),
  );
  TestValidator.predicate(
    "expires_at is created_at + 7 days",
    timeDifference < 1000,
  );
}
