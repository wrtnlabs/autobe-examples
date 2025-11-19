import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardDeliveryMethodFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDeliveryMethodFilter";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotificationSortField } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationSortField";
import type { IDiscussionBoardNotificationStatusFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationStatusFilter";
import type { IDiscussionBoardNotificationTypeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationTypeFilter";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSortOrder";
import type { IDiscussionBoardUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserNotification";

/**
 * Test notification filtering by status including unread, read, and dismissed
 * notifications.
 *
 * This test validates that members can effectively manage their notification
 * workflow by filtering based on interaction status. It ensures that status
 * filtering correctly distinguishes between unread notifications requiring
 * attention, read notifications that have been viewed, and dismissed
 * notifications that have been explicitly closed by the user.
 *
 * Test Flow:
 *
 * 1. Create member account and authenticate
 * 2. Test notification filtering with different status parameters
 * 3. Verify that each status filter returns appropriate results
 * 4. Validate that filtering logic works correctly
 */
export async function test_api_member_notifications_status_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.paragraph({ sentences: 1 }),
        password: "password123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Test filtering with unread status
  const unreadNotifications: IPageIDiscussionBoardUserNotification.ISummary =
    await api.functional.discussionBoard.member.notifications.index(
      connection,
      {
        body: {
          status: "unread" satisfies IDiscussionBoardNotificationStatusFilter,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserNotification.IRequest,
      },
    );
  typia.assert(unreadNotifications);

  // Verify all returned notifications have unread status
  TestValidator.predicate(
    "all unread filter results should have unread status",
    unreadNotifications.data.every(
      (notification) => notification.status === "unread",
    ),
  );

  // Step 3: Test filtering with read status
  const readNotifications: IPageIDiscussionBoardUserNotification.ISummary =
    await api.functional.discussionBoard.member.notifications.index(
      connection,
      {
        body: {
          status: "read" satisfies IDiscussionBoardNotificationStatusFilter,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserNotification.IRequest,
      },
    );
  typia.assert(readNotifications);

  // Verify all returned notifications have read status
  TestValidator.predicate(
    "all read filter results should have read status",
    readNotifications.data.every(
      (notification) => notification.status === "read",
    ),
  );

  // Step 4: Test filtering with dismissed status
  const dismissedNotifications: IPageIDiscussionBoardUserNotification.ISummary =
    await api.functional.discussionBoard.member.notifications.index(
      connection,
      {
        body: {
          status:
            "dismissed" satisfies IDiscussionBoardNotificationStatusFilter,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserNotification.IRequest,
      },
    );
  typia.assert(dismissedNotifications);

  // Verify all returned notifications have dismissed status
  TestValidator.predicate(
    "all dismissed filter results should have dismissed status",
    dismissedNotifications.data.every(
      (notification) => notification.status === "dismissed",
    ),
  );

  // Step 5: Test without status filter to get all notifications
  const allNotifications: IPageIDiscussionBoardUserNotification.ISummary =
    await api.functional.discussionBoard.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardUserNotification.IRequest,
      },
    );
  typia.assert(allNotifications);

  // Verify that status filtering works correctly
  TestValidator.equals(
    "total notifications should equal sum of unread, read and dismissed",
    allNotifications.data.length,
    unreadNotifications.data.length +
      readNotifications.data.length +
      dismissedNotifications.data.length,
  );
}
