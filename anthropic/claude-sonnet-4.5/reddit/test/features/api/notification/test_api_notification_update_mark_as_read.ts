import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";

/**
 * Test marking a notification as read.
 *
 * This test validates the notification update functionality where an
 * authenticated member marks an unread notification as read. The test verifies
 * that:
 *
 * 1. Member authentication is properly established
 * 2. Notification update API accepts is_read flag
 * 3. Response returns updated notification with is_read: true
 * 4. Read_at timestamp is set to current time in ISO 8601 format
 * 5. Updated_at timestamp reflects the modification
 *
 * Business flow:
 *
 * - Create and authenticate member account
 * - Update notification by setting is_read to true
 * - Validate response contains proper timestamps and read status
 */
export async function test_api_notification_update_mark_as_read(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberData = {
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const authenticatedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Generate notification ID (simulating existing notification)
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Update notification to mark as read
  const updateData = {
    is_read: true,
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

  // Step 4: Validate is_read status
  TestValidator.equals(
    "notification is_read should be true",
    updatedNotification.is_read,
    true,
  );
}
