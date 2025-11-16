import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotificationUnreadCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotificationUnreadCount";

/**
 * Test retrieving unread notification count for a newly registered member.
 *
 * Validates the initial state behavior for new user accounts. Creates a fresh
 * member account and immediately queries the unread notification count to
 * ensure it starts at zero. This confirms that new accounts have no
 * notifications and the system properly initializes notification tracking.
 *
 * Test Flow:
 *
 * 1. Generate random member registration data with proper constraints
 * 2. Create new member account via join API
 * 3. Immediately fetch unread notification count
 * 4. Validate response structure and verify count is exactly 0
 */
export async function test_api_notification_unread_count_initial_state(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const registerData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const newMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registerData,
    });

  typia.assert(newMember);

  // Step 2: Immediately fetch unread notification count for the new member
  const unreadCount: IRedditCommunityNotificationUnreadCount =
    await api.functional.redditCommunity.member.notifications.unreadCount.getUnreadCount(
      connection,
    );

  typia.assert(unreadCount);

  // Step 3: Validate that the count is exactly 0 for a brand new account
  TestValidator.equals(
    "new member should have zero unread notifications",
    unreadCount.count,
    0,
  );
}
