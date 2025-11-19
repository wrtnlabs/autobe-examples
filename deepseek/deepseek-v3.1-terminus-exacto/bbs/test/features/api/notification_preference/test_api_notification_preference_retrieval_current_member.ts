import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";

/**
 * Test retrieval of current member's notification preference configuration.
 *
 * This test validates that authenticated members can access their own
 * notification preference settings without requiring a specific preference ID.
 * The test creates a new member account, establishes authentication context,
 * and retrieves the preference configuration to verify all notification
 * settings are properly returned including email preferences, in-app
 * notifications, post interactions, comment replies, moderation updates, system
 * announcements, and frequency settings.
 */
export async function test_api_notification_preference_retrieval_current_member(
  connection: api.IConnection,
) {
  // 1. Create a new member account with realistic test data
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "192.168.1.1",
      href: "https://example.com/discussion-board",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Retrieve notification preferences for the authenticated member
  const preferences =
    await api.functional.discussionBoard.member.notificationPreferences.get(
      connection,
    );
  typia.assert(preferences);

  // 3. Validate business logic relationships only
  TestValidator.equals(
    "discussion board member ID should match created member",
    preferences.discussion_board_member_id,
    member.id,
  );

  // Note: All type validation is handled by typia.assert() above
  // No additional type checking is needed or allowed
}
