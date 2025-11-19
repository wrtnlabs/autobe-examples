import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieving the currently active account action for a suspended member.
 *
 * This test validates the moderator workflow for checking enforcement status by
 * querying for active suspensions. The scenario follows these steps:
 *
 * 1. Authenticate as a moderator to gain moderation privileges
 * 2. Create a member account that will be the target of enforcement action
 * 3. Create an account suspension against that member to establish active
 *    enforcement
 * 4. Retrieve the active account action and verify all details are correct
 *
 * The response should contain the complete IDiscussionBoardAccountAction with
 * all relevant fields populated including action type, reason, status,
 * duration, expiration timestamp, and the moderator who applied it.
 */
export async function test_api_account_action_active_retrieval_with_suspension(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "moderator123!",
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: "https://example.com/moderator/join",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a member account to be suspended
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "member123!",
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: "https://example.com/member/join",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Create an active suspension against the member
  const suspensionReason = "Repeated spam violations after two warnings";
  const suspensionDuration = 7 as const;

  const suspensionData = {
    discussion_board_member_id: member.id,
    action_type: "suspension" as const,
    reason: suspensionReason,
    duration_days: suspensionDuration,
  } satisfies IDiscussionBoardAccountAction.ICreate;

  const createdAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: suspensionData,
      },
    );
  typia.assert(createdAction);

  // Step 4: Retrieve the active account action for the member
  const activeAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.members.accountActions.active(
      connection,
      {
        memberId: member.id,
      },
    );
  typia.assert(activeAction);

  // Validate the retrieved active action matches the created suspension
  TestValidator.equals(
    "active action ID matches created suspension",
    activeAction.id,
    createdAction.id,
  );
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
    "action type is suspension",
    activeAction.action_type,
    "suspension",
  );
  TestValidator.equals(
    "suspension reason matches",
    activeAction.reason,
    suspensionReason,
  );
  TestValidator.equals(
    "duration days matches",
    activeAction.duration_days,
    suspensionDuration,
  );
  TestValidator.equals("status is active", activeAction.status, "active");

  // Verify suspension has expiration timestamp (not null/undefined for temporary suspensions)
  TestValidator.predicate(
    "expiration timestamp exists",
    activeAction.expires_at !== null && activeAction.expires_at !== undefined,
  );

  // Verify reversal fields are null or undefined (not reversed)
  TestValidator.predicate(
    "not reversed by moderator",
    activeAction.reversed_by_moderator_id === null ||
      activeAction.reversed_by_moderator_id === undefined,
  );
  TestValidator.predicate(
    "no reversal reason",
    activeAction.reversal_reason === null ||
      activeAction.reversal_reason === undefined,
  );
  TestValidator.predicate(
    "no reversal timestamp",
    activeAction.reversed_at === null || activeAction.reversed_at === undefined,
  );
}
