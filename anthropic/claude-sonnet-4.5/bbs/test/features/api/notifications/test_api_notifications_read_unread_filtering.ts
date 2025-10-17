import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotification";

/**
 * Test notification filtering by read status to help users identify unread
 * notifications requiring attention.
 *
 * This test validates the notification read/unread filtering functionality
 * which is essential for efficient notification center management. Users need
 * to quickly identify which notifications require their attention versus those
 * they've already reviewed.
 *
 * Workflow:
 *
 * 1. Create a member account to generate notifications
 * 2. Create a topic to trigger notification generation
 * 3. Retrieve all notifications to verify notification creation
 * 4. Mark some notifications as read using the update endpoint
 * 5. Filter by unread (is_read: false) and verify only unread notifications
 *    returned
 * 6. Filter by read (is_read: true) and verify only read notifications returned
 * 7. Filter by all (is_read: null) and verify complete notification set returned
 */
export async function test_api_notifications_read_unread_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  const memberId = authorizedMember.id;

  // Step 2: Create a topic to generate notifications
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    category_id: categoryId,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(topic);

  // Step 3: Retrieve all notifications to verify creation
  const allNotificationsRequest = {
    page: 1,
    limit: 50,
    is_read: null,
  } satisfies IDiscussionBoardNotification.IRequest;

  const allNotificationsPage: IPageIDiscussionBoardNotification.ISummary =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: memberId,
        body: allNotificationsRequest,
      },
    );
  typia.assert(allNotificationsPage);

  TestValidator.predicate(
    "notifications should be created",
    allNotificationsPage.data.length > 0,
  );

  // Step 4: Mark some notifications as read (mark half of them as read)
  const notificationsToMarkAsRead = allNotificationsPage.data.slice(
    0,
    Math.ceil(allNotificationsPage.data.length / 2),
  );

  await ArrayUtil.asyncForEach(
    notificationsToMarkAsRead,
    async (notification) => {
      const updateData = {
        is_read: true,
      } satisfies IDiscussionBoardNotification.IUpdate;

      const updatedNotification: IDiscussionBoardNotification =
        await api.functional.discussionBoard.member.users.notifications.update(
          connection,
          {
            userId: memberId,
            notificationId: notification.id,
            body: updateData,
          },
        );
      typia.assert(updatedNotification);
    },
  );

  // Step 5: Filter by unread (is_read: false) and verify only unread notifications returned
  const unreadRequest = {
    page: 1,
    limit: 50,
    is_read: false,
  } satisfies IDiscussionBoardNotification.IRequest;

  const unreadPage: IPageIDiscussionBoardNotification.ISummary =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: memberId,
        body: unreadRequest,
      },
    );
  typia.assert(unreadPage);

  TestValidator.predicate(
    "all unread notifications should have is_read as false",
    unreadPage.data.every((n) => n.is_read === false),
  );

  const expectedUnreadCount =
    allNotificationsPage.data.length - notificationsToMarkAsRead.length;
  TestValidator.equals(
    "unread notification count should match",
    unreadPage.data.length,
    expectedUnreadCount,
  );

  // Step 6: Filter by read (is_read: true) and verify only read notifications returned
  const readRequest = {
    page: 1,
    limit: 50,
    is_read: true,
  } satisfies IDiscussionBoardNotification.IRequest;

  const readPage: IPageIDiscussionBoardNotification.ISummary =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: memberId,
        body: readRequest,
      },
    );
  typia.assert(readPage);

  TestValidator.predicate(
    "all read notifications should have is_read as true",
    readPage.data.every((n) => n.is_read === true),
  );

  TestValidator.equals(
    "read notification count should match marked as read count",
    readPage.data.length,
    notificationsToMarkAsRead.length,
  );

  // Step 7: Filter by all (is_read: null) and verify complete notification set returned
  const allAgainRequest = {
    page: 1,
    limit: 50,
    is_read: null,
  } satisfies IDiscussionBoardNotification.IRequest;

  const allAgainPage: IPageIDiscussionBoardNotification.ISummary =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: memberId,
        body: allAgainRequest,
      },
    );
  typia.assert(allAgainPage);

  TestValidator.equals(
    "all filter should return complete notification set",
    allAgainPage.data.length,
    allNotificationsPage.data.length,
  );

  const totalCountCheck = readPage.data.length + unreadPage.data.length;
  TestValidator.equals(
    "read plus unread should equal total notifications",
    totalCountCheck,
    allAgainPage.data.length,
  );
}
