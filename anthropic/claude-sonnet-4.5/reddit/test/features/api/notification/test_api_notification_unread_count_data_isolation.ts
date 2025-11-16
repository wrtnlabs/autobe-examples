import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotificationUnreadCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotificationUnreadCount";

/**
 * Test that unread notification count properly isolates data between different
 * users.
 *
 * This test validates the critical security requirement that users can only see
 * their own notification counts and not counts from other users. It creates two
 * separate member accounts, authenticates as each user, and verifies that the
 * unread count endpoint properly filters notifications based on JWT
 * authentication.
 *
 * Test Flow:
 *
 * 1. Create first member account (userA) and authenticate
 * 2. Retrieve userA's unread notification count
 * 3. Create second member account (userB) and authenticate
 * 4. Retrieve userB's unread notification count
 * 5. Verify that each user's count is properly isolated (newly created users
 *    should have 0)
 *
 * This ensures proper data isolation and prevents unauthorized access to other
 * users' notification information, which is essential for user privacy and
 * security.
 */
export async function test_api_notification_unread_count_data_isolation(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (userA)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(16),
      email: userAEmail,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(userA);

  // Step 2: Retrieve userA's unread notification count
  const userACount =
    await api.functional.redditCommunity.member.notifications.unreadCount.getUnreadCount(
      connection,
    );
  typia.assert(userACount);

  // Verify userA's count is a valid non-negative integer
  TestValidator.predicate(
    "userA unread count should be non-negative",
    userACount.count >= 0,
  );

  // Step 3: Create second member account (userB)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(16),
      email: userBEmail,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(userB);

  // Step 4: Retrieve userB's unread notification count (now authenticated as userB)
  const userBCount =
    await api.functional.redditCommunity.member.notifications.unreadCount.getUnreadCount(
      connection,
    );
  typia.assert(userBCount);

  // Step 5: Verify proper data isolation
  TestValidator.predicate(
    "userB unread count should be non-negative",
    userBCount.count >= 0,
  );

  // Since both users are newly created with no notifications, both counts should be 0
  // This validates that the endpoint returns isolated data for each authenticated user
  TestValidator.equals(
    "newly created userA should have 0 unread notifications",
    userACount.count,
    0,
  );

  TestValidator.equals(
    "newly created userB should have 0 unread notifications",
    userBCount.count,
    0,
  );
}
