import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";

/**
 * Test that retrieving a notification automatically marks it as read.
 *
 * This test validates the notification retrieval endpoint and verifies the
 * auto-mark-read behavior where accessing a notification should update its read
 * status. The test creates a member account, retrieves a notification, and
 * validates the response structure including read status fields.
 *
 * Note: Due to API limitations (no notification creation endpoint available),
 * this test uses a generated notification ID and relies on the endpoint's
 * behavior with existing notifications or simulation mode.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Retrieve a notification via GET endpoint (first retrieval)
 * 3. Verify the notification structure and read status
 * 4. Retrieve the same notification again (subsequent retrieval)
 * 5. Verify consistency between retrievals
 */
export async function test_api_notification_retrieval_auto_mark_read(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
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

  // Step 2: Generate a notification ID for retrieval
  // Note: In a real scenario with complete APIs, this would come from creating
  // notification-triggering events (posts, comments, etc.)
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve the notification for the first time
  const firstRetrieval: IRedditCommunityNotification =
    await api.functional.redditCommunity.member.notifications.at(connection, {
      notificationId: notificationId,
    });
  typia.assert(firstRetrieval);

  // Step 4: Verify the notification structure and read status
  TestValidator.predicate(
    "notification should be marked as read after retrieval",
    firstRetrieval.is_read === true,
  );

  TestValidator.predicate(
    "read_at timestamp should be set when notification is read",
    firstRetrieval.read_at !== null && firstRetrieval.read_at !== undefined,
  );

  // Step 5: Retrieve the same notification again (subsequent retrieval)
  const secondRetrieval: IRedditCommunityNotification =
    await api.functional.redditCommunity.member.notifications.at(connection, {
      notificationId: notificationId,
    });
  typia.assert(secondRetrieval);

  // Step 6: Verify read status persists and read_at remains unchanged
  TestValidator.predicate(
    "notification should remain marked as read on subsequent retrieval",
    secondRetrieval.is_read === true,
  );

  TestValidator.equals(
    "read_at timestamp should remain unchanged on subsequent retrieval",
    secondRetrieval.read_at,
    firstRetrieval.read_at,
  );

  TestValidator.equals(
    "notification ID should match across retrievals",
    secondRetrieval.id,
    firstRetrieval.id,
  );
}
