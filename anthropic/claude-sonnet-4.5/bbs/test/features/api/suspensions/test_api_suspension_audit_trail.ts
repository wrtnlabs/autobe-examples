import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Test that suspension creation maintains comprehensive audit trail.
 *
 * This test validates that when a moderator creates a suspension, the system
 * captures and stores complete audit trail information including the suspending
 * moderator's identity, precise timestamps, violation category, detailed
 * justification, and all metadata required for accountability and transparency.
 * This ensures that suspension records provide a complete, immutable historical
 * record of enforcement actions.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a member account to be suspended
 * 3. Create a suspension with detailed violation reason and justification
 * 4. Verify the suspension record includes complete audit information
 * 5. Verify all required audit fields are present and correctly populated
 */
export async function test_api_suspension_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member account to be suspended
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Create suspension with detailed violation information
  const suspensionReason = "Repeated harassment and hate speech";
  const suspensionDetails =
    "Member has violated community guidelines multiple times by posting hateful content targeting other users based on their political views. Previous warnings were issued on multiple occasions but the behavior continued. This suspension is necessary to maintain a respectful discussion environment.";
  const suspendedAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const suspensionData = {
    discussion_board_member_id: member.id,
    suspension_reason: suspensionReason,
    suspension_details: suspensionDetails,
    suspended_at: suspendedAt,
    expires_at: expiresAt,
  } satisfies IDiscussionBoardUserSuspension.ICreate;

  const suspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.moderation.suspensions.create(
      connection,
      {
        body: suspensionData,
      },
    );
  typia.assert(suspension);

  // Step 4: Verify complete audit trail information is present
  TestValidator.predicate(
    "suspension ID is present",
    suspension.id !== undefined && suspension.id !== null,
  );
  TestValidator.equals(
    "suspended member ID matches",
    suspension.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "suspending moderator ID is recorded",
    suspension.suspending_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "suspension reason is recorded",
    suspension.suspension_reason,
    suspensionReason,
  );
  TestValidator.equals(
    "suspension details are recorded",
    suspension.suspension_details,
    suspensionDetails,
  );

  // Step 5: Verify precise timestamps are recorded
  TestValidator.predicate(
    "suspended_at timestamp is present",
    suspension.suspended_at !== undefined && suspension.suspended_at !== null,
  );
  TestValidator.predicate(
    "expires_at timestamp is present",
    suspension.expires_at !== undefined && suspension.expires_at !== null,
  );
  TestValidator.predicate(
    "created_at timestamp is present",
    suspension.created_at !== undefined && suspension.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp is present",
    suspension.updated_at !== undefined && suspension.updated_at !== null,
  );

  // Verify moderator information is included in the audit trail
  TestValidator.predicate(
    "suspending moderator summary is present",
    suspension.suspendingModerator !== undefined &&
      suspension.suspendingModerator !== null,
  );
  TestValidator.equals(
    "suspending moderator ID matches in summary",
    suspension.suspendingModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "suspending moderator username matches",
    suspension.suspendingModerator.username,
    moderator.username,
  );

  // Verify suspended user information is included
  TestValidator.predicate(
    "suspended user summary is present",
    suspension.suspendedUser !== undefined && suspension.suspendedUser !== null,
  );
  TestValidator.equals(
    "suspended user ID matches in summary",
    suspension.suspendedUser.id,
    member.id,
  );
  TestValidator.equals(
    "suspended user username matches",
    suspension.suspendedUser.username,
    member.username,
  );

  // Verify that lifting moderator fields are null (suspension not lifted)
  TestValidator.equals(
    "lifted_by_moderator_id is null",
    suspension.lifted_by_moderator_id,
    null,
  );
  TestValidator.equals("lifted_at is null", suspension.lifted_at, null);
  TestValidator.equals(
    "liftingModerator is null",
    suspension.liftingModerator,
    null,
  );
}
