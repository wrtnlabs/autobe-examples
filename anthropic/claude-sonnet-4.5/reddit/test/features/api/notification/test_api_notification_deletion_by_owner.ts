import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test notification deletion by the owner.
 *
 * ⚠️ SCENARIO LIMITATION: This test cannot fully implement the intended
 * scenario because the required notification management APIs (creation,
 * listing, retrieval) are not available in the current API set. A complete test
 * would require:
 *
 * - API to create/trigger notifications
 * - API to list user notifications
 * - API to retrieve notification details
 *
 * Current implementation demonstrates:
 *
 * 1. Member authentication (required prerequisite for notification operations)
 * 2. Basic notification deletion endpoint integration
 *
 * Note: Testing with a valid notification ID would require notification
 * creation capabilities that are not present in the available API functions.
 */
export async function test_api_notification_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: "192.168.1.100",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 2: Test notification deletion endpoint
  // Using a generated UUID since no notification creation API is available
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // Attempt deletion - this will likely result in a 404 error since the
  // notification doesn't exist, but demonstrates the endpoint integration
  await TestValidator.error(
    "deletion of non-existent notification should fail",
    async () => {
      await api.functional.redditCommunity.member.notifications.erase(
        connection,
        {
          notificationId: notificationId,
        },
      );
    },
  );

  // In a complete implementation with notification management APIs, we would:
  // 1. Create a notification through a notification-triggering action
  // 2. Retrieve the notification to get its ID
  // 3. Delete the notification as the owner
  // 4. Verify it no longer appears in the notification list
  // 5. Verify the notification count decreased
}
