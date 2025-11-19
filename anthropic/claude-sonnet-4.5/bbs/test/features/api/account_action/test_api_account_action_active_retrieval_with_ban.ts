import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieving the currently active account action for a member with a
 * permanent ban.
 *
 * This test validates that the endpoint correctly returns ban records which
 * have null expiration timestamps, properly differentiating permanent bans from
 * temporary suspensions.
 *
 * Process:
 *
 * 1. Authenticate as moderator to gain enforcement privileges
 * 2. Create a member account as the target for the ban
 * 3. Apply a permanent ban with documented reason
 * 4. Retrieve the active account action
 * 5. Verify ban details: action_type="ban", status="active", null duration_days,
 *    null expires_at
 */
export async function test_api_account_action_active_retrieval_with_ban(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureModPass123!",
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: "https://discussion-board.example.com/moderator/join",
    referrer: "https://discussion-board.example.com/",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member account that will receive the permanent ban
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass456!",
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    href: "https://discussion-board.example.com/member/join",
    referrer: "https://discussion-board.example.com/",
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Apply permanent ban to the member account
  const banData = {
    discussion_board_member_id: member.id,
    action_type: "ban" as const,
    reason:
      "Severe and repeated violations of community guidelines including harassment and spam. Permanent ban issued after multiple warnings.",
    duration_days: null,
  } satisfies IDiscussionBoardAccountAction.ICreate;

  const createdBan: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: banData,
      },
    );
  typia.assert(createdBan);

  // Step 4: Retrieve the currently active account action for the member
  const activeAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.members.accountActions.active(
      connection,
      {
        memberId: member.id,
      },
    );
  typia.assert(activeAction);

  // Step 5: Validate the active action is the permanent ban with correct attributes
  TestValidator.equals(
    "active action ID matches created ban",
    activeAction.id,
    createdBan.id,
  );
  TestValidator.equals("action type is ban", activeAction.action_type, "ban");
  TestValidator.equals("status is active", activeAction.status, "active");
  TestValidator.equals(
    "member ID matches",
    activeAction.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "moderator ID matches",
    activeAction.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "ban reason matches",
    activeAction.reason,
    banData.reason,
  );
  TestValidator.equals(
    "duration_days is null for permanent ban",
    activeAction.duration_days,
    null,
  );
  TestValidator.equals(
    "expires_at is null for permanent ban",
    activeAction.expires_at,
    null,
  );
  TestValidator.equals(
    "reversed_by_moderator_id is null",
    activeAction.reversed_by_moderator_id,
    null,
  );
  TestValidator.equals(
    "reversal_reason is null",
    activeAction.reversal_reason,
    null,
  );
  TestValidator.equals("reversed_at is null", activeAction.reversed_at, null);
}
