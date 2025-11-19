import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieving complete details of a temporary suspension action.
 *
 * This test validates that moderators can retrieve full suspension details
 * including all metadata fields, timestamps, and foreign key relationships.
 *
 * Steps:
 *
 * 1. Create and authenticate as moderator
 * 2. Create a member account to be suspended
 * 3. Re-authenticate as moderator (member join changes auth context)
 * 4. Apply a 7-day temporary suspension with documented reason
 * 5. Retrieve the suspension action by ID
 * 6. Validate all suspension fields: action_type, duration_days, expires_at
 *    calculation, status, reason, and foreign key relationships
 */
export async function test_api_account_action_retrieve_suspension_details(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureModPass123!",
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: "https://example.com/moderator/join",
    referrer: "https://example.com/admin/panel",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a member account to be suspended
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass456!",
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    href: "https://example.com/member/join",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Re-authenticate as moderator to perform moderation actions
  const moderatorReauth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AnotherModPass789!",
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(2),
        href: "https://example.com/moderator/reauth",
        referrer: "https://example.com/admin/panel",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorReauth);

  const suspensionReason =
    "Repeated violation of community guidelines regarding respectful discourse. Multiple warnings issued for inflammatory comments in political discussions.";

  const suspensionData = {
    discussion_board_member_id: member.id,
    action_type: "suspension" as const,
    reason: suspensionReason,
    duration_days: 7,
  } satisfies IDiscussionBoardAccountAction.ICreate;

  const createdSuspension: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: suspensionData,
      },
    );
  typia.assert(createdSuspension);

  // Step 4: Retrieve the suspension action by ID
  const retrievedAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.at(
      connection,
      {
        actionId: createdSuspension.id,
      },
    );
  typia.assert(retrievedAction);

  // Step 5: Validate all suspension fields
  TestValidator.equals(
    "action ID matches",
    retrievedAction.id,
    createdSuspension.id,
  );
  TestValidator.equals(
    "action type is suspension",
    retrievedAction.action_type,
    "suspension",
  );
  TestValidator.equals(
    "member ID matches",
    retrievedAction.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "moderator ID matches",
    retrievedAction.discussion_board_moderator_id,
    moderatorReauth.id,
  );
  TestValidator.equals(
    "suspension reason matches",
    retrievedAction.reason,
    suspensionReason,
  );
  TestValidator.equals("duration is 7 days", retrievedAction.duration_days, 7);
  TestValidator.equals("status is active", retrievedAction.status, "active");

  // Validate expires_at is correctly calculated (created_at + 7 days)
  const createdAtDate = new Date(retrievedAction.created_at);
  const expiresAtDate = new Date(retrievedAction.expires_at!);
  const expectedExpiresAt = new Date(
    createdAtDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  );

  const timeDifference = Math.abs(
    expiresAtDate.getTime() - expectedExpiresAt.getTime(),
  );
  TestValidator.predicate(
    "expires_at calculated correctly as created_at + 7 days",
    timeDifference < 1000,
  );

  // Validate reversal fields are null for active suspension
  TestValidator.equals(
    "reversed_by_moderator_id is null",
    retrievedAction.reversed_by_moderator_id,
    null,
  );
  TestValidator.equals(
    "reversal_reason is null",
    retrievedAction.reversal_reason,
    null,
  );
  TestValidator.equals(
    "reversed_at is null",
    retrievedAction.reversed_at,
    null,
  );
}
