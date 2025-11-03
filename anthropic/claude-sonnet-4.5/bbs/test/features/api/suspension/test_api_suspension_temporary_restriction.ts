import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Test creating a temporary suspension with specific duration.
 *
 * This test validates the temporary suspension enforcement workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a member account to be suspended
 * 3. Create a temporary suspension with 7-day duration
 * 4. Verify suspension record contains correct timestamps
 * 5. Verify suspension duration is accurately reflected
 * 6. Verify suspension is marked as active and not expired
 */
export async function test_api_suspension_temporary_restriction(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account to be suspended
  const memberEmail = typia.random<string & tags.Format<"email">>();

  const member: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: "MemberPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create temporary suspension with 7-day duration
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const suspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.moderation.suspensions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          suspension_reason: "Repeated policy violations",
          suspension_details:
            "Member has violated community guidelines multiple times regarding respectful discourse. This is a temporary 7-day suspension to allow reflection on community standards.",
          suspended_at: now.toISOString(),
          expires_at: sevenDaysLater.toISOString(),
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 4: Verify suspension record contains correct timestamps
  TestValidator.predicate(
    "suspension has valid suspended_at timestamp",
    suspension.suspended_at !== null && suspension.suspended_at !== undefined,
  );

  TestValidator.predicate(
    "suspension has valid expires_at timestamp",
    suspension.expires_at !== null && suspension.expires_at !== undefined,
  );

  // Step 5: Verify suspension duration is accurately reflected (7 days)
  const suspendedAtDate = new Date(suspension.suspended_at);
  const expiresAtDate = new Date(suspension.expires_at!);
  const durationMs = expiresAtDate.getTime() - suspendedAtDate.getTime();
  const durationDays = durationMs / (24 * 60 * 60 * 1000);

  TestValidator.predicate(
    "suspension duration is 7 days",
    Math.abs(durationDays - 7) < 0.01,
  );

  // Step 6: Verify suspension is marked as active and not expired
  TestValidator.predicate(
    "suspension expires_at is in the future",
    expiresAtDate.getTime() > Date.now(),
  );

  TestValidator.predicate(
    "suspension has not been lifted",
    suspension.lifted_at === null || suspension.lifted_at === undefined,
  );

  TestValidator.equals(
    "suspended member ID matches",
    suspension.discussion_board_member_id,
    member.id,
  );

  TestValidator.equals(
    "suspending moderator ID matches",
    suspension.suspending_moderator_id,
    moderator.id,
  );
}
