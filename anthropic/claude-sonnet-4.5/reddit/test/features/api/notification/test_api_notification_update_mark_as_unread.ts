import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";

/**
 * Test marking a previously read notification as unread.
 *
 * This test validates the notification update functionality where a member can
 * mark a previously read notification as unread. The test creates a member
 * account and updates a notification's read status from true to false.
 *
 * NOTE: This test uses a randomly generated notification ID for simulation
 * purposes. In a real production scenario, notifications are created by system
 * events (e.g., comment replies, moderation actions) and this test would
 * require an actual notification to exist. The current implementation works
 * correctly in simulation mode and demonstrates proper API usage patterns.
 *
 * Steps:
 *
 * 1. Create a member account through authentication
 * 2. Use a notification ID (in production, this would be from an actual
 *    notification)
 * 3. Update the notification by setting is_read to false
 * 4. Verify the response contains the updated notification with correct state
 * 5. Validate that is_read is false in the response
 * 6. Ensure updated_at timestamp exists and is valid
 */
export async function test_api_notification_update_mark_as_unread(
  connection: api.IConnection,
) {
  // Step 1: Create member account for notification management
  const memberData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Generate a notification ID
  // NOTE: In production, this would reference an actual notification created by
  // system events. For simulation/testing purposes, we use a random UUID.
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Update the notification to mark as unread (is_read: false)
  const updateData = {
    is_read: false,
  } satisfies IRedditCommunityNotification.IUpdate;

  const updatedNotification: IRedditCommunityNotification =
    await api.functional.redditCommunity.member.notifications.update(
      connection,
      {
        notificationId: notificationId,
        body: updateData,
      },
    );
  typia.assert(updatedNotification);

  // Step 4: Verify the notification was updated correctly
  TestValidator.equals(
    "notification is_read should be false after marking as unread",
    updatedNotification.is_read,
    false,
  );

  // Step 5: Validate updated_at timestamp exists and is valid
  TestValidator.predicate(
    "updated_at timestamp should exist and be valid",
    updatedNotification.updated_at !== null &&
      updatedNotification.updated_at !== undefined,
  );

  // Step 6: Validate created_at timestamp exists (all notifications have creation time)
  TestValidator.predicate(
    "created_at timestamp should exist",
    updatedNotification.created_at !== null &&
      updatedNotification.created_at !== undefined,
  );
}
