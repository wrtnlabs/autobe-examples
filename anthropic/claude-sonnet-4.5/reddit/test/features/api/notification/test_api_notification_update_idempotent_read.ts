import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";

/**
 * Test idempotent behavior when marking an already-read notification as read
 * again.
 *
 * This test validates that redundant read operations on notifications are
 * handled gracefully without causing errors or unintended side effects. The
 * test simulates the scenario where a notification that is already marked as
 * read (is_read: true) is updated again with is_read: true, ensuring the
 * operation succeeds and behaves correctly.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Perform first update to mark a notification as read
 * 3. Perform second update on the same notification to mark as read again
 * 4. Verify both operations succeed
 * 5. Verify the notification maintains read state throughout
 * 6. Verify idempotent behavior with consistent results
 */
export async function test_api_notification_update_idempotent_read(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 2: Generate a notification ID for testing
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: First update - mark notification as read
  const firstUpdate =
    await api.functional.redditCommunity.member.notifications.update(
      connection,
      {
        notificationId: notificationId,
        body: {
          is_read: true,
        } satisfies IRedditCommunityNotification.IUpdate,
      },
    );
  typia.assert(firstUpdate);

  // Verify the notification is marked as read
  TestValidator.equals(
    "notification is read after first update",
    firstUpdate.is_read,
    true,
  );

  // Store the original read_at timestamp if it exists
  const originalReadAt = firstUpdate.read_at;

  // Step 4: Second update - mark the already-read notification as read again (idempotent operation)
  const secondUpdate =
    await api.functional.redditCommunity.member.notifications.update(
      connection,
      {
        notificationId: notificationId,
        body: {
          is_read: true,
        } satisfies IRedditCommunityNotification.IUpdate,
      },
    );
  typia.assert(secondUpdate);

  // Step 5: Verify idempotent behavior - operation succeeds without error
  TestValidator.equals(
    "notification remains read after second update",
    secondUpdate.is_read,
    true,
  );

  // Step 6: Verify consistency between updates
  TestValidator.equals(
    "notification ID unchanged",
    secondUpdate.id,
    firstUpdate.id,
  );

  // Verify the read_at timestamp behavior (should be consistent for idempotent operations)
  if (originalReadAt !== null && originalReadAt !== undefined) {
    TestValidator.equals(
      "read_at timestamp preserved in idempotent update",
      secondUpdate.read_at,
      originalReadAt,
    );
  }
}
