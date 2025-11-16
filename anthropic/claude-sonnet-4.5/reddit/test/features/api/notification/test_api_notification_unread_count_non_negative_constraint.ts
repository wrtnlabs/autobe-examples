import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotificationUnreadCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotificationUnreadCount";

/**
 * Test that unread notification count always returns a non-negative integer
 * value.
 *
 * This test validates the minimum value constraint (>= 0) on the notification
 * count field. The test authenticates as a new member and retrieves their
 * unread notification count, then verifies that the count is a valid
 * non-negative integer as specified by the
 * IRedditCommunityNotificationUnreadCount schema.
 *
 * Steps:
 *
 * 1. Register and authenticate as a new member
 * 2. Retrieve the unread notification count
 * 3. Validate the response structure
 * 4. Verify count is non-negative (>= 0)
 */
export async function test_api_notification_unread_count_non_negative_constraint(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a new member
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const authenticatedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Retrieve the unread notification count
  const unreadCount: IRedditCommunityNotificationUnreadCount =
    await api.functional.redditCommunity.member.notifications.unreadCount.getUnreadCount(
      connection,
    );

  // Step 3: Validate the response structure
  typia.assert(unreadCount);

  // Step 4: Verify count is non-negative (>= 0) - testing the minimum constraint
  TestValidator.predicate(
    "unread count must be non-negative",
    unreadCount.count >= 0,
  );

  // Additional validation: for a new member, count should be 0
  TestValidator.equals(
    "new member should have zero unread notifications",
    unreadCount.count,
    0,
  );
}
