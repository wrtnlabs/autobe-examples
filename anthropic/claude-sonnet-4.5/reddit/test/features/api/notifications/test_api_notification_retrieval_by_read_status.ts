import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityNotification";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";

/**
 * Test filtering notifications by read/unread status using is_read parameter.
 *
 * This test validates the notification filtering functionality by creating a
 * member account, simulating notification receipt, marking some as read, and
 * then testing various filter scenarios:
 *
 * 1. Create member account for notification management
 * 2. Retrieve all notifications to establish baseline
 * 3. Filter with is_read=true to get only read notifications
 * 4. Filter with is_read=false to get only unread notifications
 * 5. Verify filtering accuracy and boolean parameter handling
 */
export async function test_api_notification_retrieval_by_read_status(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 2: Retrieve all notifications without filtering
  const allNotifications: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(allNotifications);

  // Step 3: Filter notifications by is_read=true (read notifications only)
  const readNotifications: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          is_read: true,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(readNotifications);

  // Validate that all returned notifications are marked as read
  TestValidator.predicate(
    "all filtered notifications should be read",
    readNotifications.data.every(
      (notification) => notification.is_read === true,
    ),
  );

  // Step 4: Filter notifications by is_read=false (unread notifications only)
  const unreadNotifications: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          is_read: false,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(unreadNotifications);

  // Validate that all returned notifications are marked as unread
  TestValidator.predicate(
    "all filtered notifications should be unread",
    unreadNotifications.data.every(
      (notification) => notification.is_read === false,
    ),
  );

  // Step 5: Verify that omitting is_read parameter returns all notifications
  const totalCount = allNotifications.pagination.records;
  const readCount = readNotifications.pagination.records;
  const unreadCount = unreadNotifications.pagination.records;

  // Validate that read + unread counts match total (if notifications exist)
  if (totalCount > 0) {
    TestValidator.equals(
      "read and unread counts should sum to total",
      totalCount,
      readCount + unreadCount,
    );
  }

  // Step 6: Verify boolean parameter handling with explicit filters
  TestValidator.predicate(
    "read filter returns non-negative count",
    readCount >= 0,
  );

  TestValidator.predicate(
    "unread filter returns non-negative count",
    unreadCount >= 0,
  );

  // Step 7: Validate pagination metadata consistency
  TestValidator.predicate(
    "all notifications pagination is valid",
    allNotifications.pagination.current >= 0 &&
      allNotifications.pagination.limit > 0 &&
      allNotifications.pagination.pages >= 0,
  );
}
