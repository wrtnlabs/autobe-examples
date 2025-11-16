import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotificationUnreadCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotificationUnreadCount";

/**
 * Test that unread notification count accurately reflects real-time
 * notification status.
 *
 * Validates that a newly registered member can retrieve their unread
 * notification count and that the initial count is 0 for a member with no
 * notifications. Verifies proper response structure and type constraints.
 */
export async function test_api_notification_unread_count_real_time_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Retrieve initial unread notification count
  const unreadCount: IRedditCommunityNotificationUnreadCount =
    await api.functional.redditCommunity.member.notifications.unreadCount.getUnreadCount(
      connection,
    );
  typia.assert(unreadCount);

  // Step 3: Validate the count is 0 for a newly registered member
  TestValidator.equals(
    "initial unread count should be 0 for new member",
    unreadCount.count,
    0,
  );
}
