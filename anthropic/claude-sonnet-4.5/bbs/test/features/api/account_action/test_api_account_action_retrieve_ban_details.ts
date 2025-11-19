import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieving complete details of a permanent ban action by ID.
 *
 * This test validates the GET
 * /discussionBoard/moderator/accountActions/:actionId endpoint for permanent
 * ban records. The scenario follows this workflow:
 *
 * 1. Moderator Authentication - Create and authenticate a moderator account
 * 2. Member Creation - Create a regular member account to be banned
 * 3. Apply Permanent Ban - Create a permanent ban action with no expiration
 * 4. Retrieve Ban Details - Fetch the ban action record by ID
 * 5. Validate Ban Record - Verify all fields including action_type='ban',
 *    duration_days=null, expires_at=null, status='active', and documented
 *    reason
 *
 * The test ensures permanent bans are distinguishable from temporary
 * suspensions by confirming the absence of temporal constraints.
 */
export async function test_api_account_action_retrieve_ban_details(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account to be banned
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Apply permanent ban to the member account
  const banReason =
    "Severe policy violation - posting illegal content and harassing other members repeatedly";
  const createdBan =
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
  typia.assert(createdBan);

  // Step 4: Retrieve the ban action details by ID
  const retrievedBan =
    await api.functional.discussionBoard.moderator.accountActions.at(
      connection,
      {
        actionId: createdBan.id,
      },
    );
  typia.assert(retrievedBan);

  // Step 5: Validate ban record structure and properties
  TestValidator.equals(
    "retrieved ban ID matches created ban",
    retrievedBan.id,
    createdBan.id,
  );
  TestValidator.equals("action type is ban", retrievedBan.action_type, "ban");
  TestValidator.equals(
    "duration_days is null for permanent ban",
    retrievedBan.duration_days,
    null,
  );
  TestValidator.equals(
    "expires_at is null for permanent ban",
    retrievedBan.expires_at,
    null,
  );
  TestValidator.equals("status is active", retrievedBan.status, "active");
  TestValidator.equals(
    "reason matches documented violation",
    retrievedBan.reason,
    banReason,
  );
  TestValidator.equals(
    "banned member ID matches",
    retrievedBan.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "moderator ID matches",
    retrievedBan.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "reversal moderator ID is null",
    retrievedBan.reversed_by_moderator_id,
    null,
  );
  TestValidator.equals(
    "reversal reason is null",
    retrievedBan.reversal_reason,
    null,
  );
  TestValidator.equals("reversed_at is null", retrievedBan.reversed_at, null);
}
