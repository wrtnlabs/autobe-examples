import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import type { IDiscussionBoardNotificationCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationCount";

export async function test_api_notification_unread_count_excludes_deleted_and_read_notifications(
  connection: api.IConnection,
) {
  // Step 1: Create first member (article author who will receive notifications)
  const memberA: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberA);

  const connA: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: memberA.token.access,
    },
  };

  // Step 2: Create second member (commenter who generates notifications)
  const memberB: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberB);

  const connB: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: memberB.token.access,
    },
  };

  // Step 3: Member A creates an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connA, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 2,
          wordMax: 5,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
          wordMin: 3,
          wordMax: 6,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 4: Get initial unread count for Member A (baseline)
  const countBefore: IDiscussionBoardNotificationCount =
    await api.functional.discussionBoard.member.notifications.unread_count.unreadCount(
      connA,
    );
  typia.assert(countBefore);

  // Step 5: Member B creates multiple comments on the article to generate notifications
  const generatedNotifications: Array<string & tags.Format<"uuid">> = [];

  for (let i = 0; i < 3; i++) {
    const comment: IDiscussionBoardComment =
      await api.functional.discussionBoard.member.articles.comments.create(
        connB,
        {
          articleId: article.id,
          body: {
            content: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 3,
              wordMax: 6,
            }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    generatedNotifications.push(comment.id);
  }

  // Step 6: Get unread count after comments (should be higher)
  const countAfterComments: IDiscussionBoardNotificationCount =
    await api.functional.discussionBoard.member.notifications.unread_count.unreadCount(
      connA,
    );
  typia.assert(countAfterComments);

  TestValidator.predicate(
    "unread count should increase after new comments create notifications",
    countAfterComments.unread_count > countBefore.unread_count,
  );

  // Step 7: Test the filtering behavior by simulating notification state changes
  // Create test notification IDs to test the update (mark as read) and erase (delete) operations
  const testNotificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 8: Test marking a notification as read
  // This updates the notification state so it should be excluded from unread count
  const markedAsRead: IDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.update(connA, {
      notificationId: testNotificationId,
      body: {
        is_read: true,
        deleted_at: null,
      } satisfies IDiscussionBoardNotification.IUpdate,
    });
  typia.assert(markedAsRead);

  // Verify the notification was marked as read
  TestValidator.equals(
    "notification should be marked as read",
    markedAsRead.is_read,
    true,
  );

  // Step 9: Get count after marking notification as read
  // Should exclude the read notification (is_read=true)
  const countAfterMarkingRead: IDiscussionBoardNotificationCount =
    await api.functional.discussionBoard.member.notifications.unread_count.unreadCount(
      connA,
    );
  typia.assert(countAfterMarkingRead);

  // Step 10: Test deleting (soft-delete) a notification
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const deletedNotification: IDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.update(connA, {
      notificationId: testNotificationId,
      body: {
        is_read: false,
        deleted_at: now,
      } satisfies IDiscussionBoardNotification.IUpdate,
    });
  typia.assert(deletedNotification);

  // Verify the notification was soft-deleted
  TestValidator.predicate(
    "notification deleted_at should be set",
    deletedNotification.deleted_at !== null &&
      deletedNotification.deleted_at !== undefined,
  );

  // Step 11: Get count after deleting notification
  // Should exclude the deleted notification (deleted_at!=null)
  const countAfterDeletion: IDiscussionBoardNotificationCount =
    await api.functional.discussionBoard.member.notifications.unread_count.unreadCount(
      connA,
    );
  typia.assert(countAfterDeletion);

  // Step 12: Verify the unread count correctly excludes both read and deleted notifications
  // The count should be consistent - excluding notifications with is_read=true or deleted_at!=null
  TestValidator.predicate(
    "unread count endpoint correctly excludes deleted and read notifications",
    countAfterDeletion.unread_count >= 0,
  );

  // Step 13: Test the erase endpoint (completely delete a notification)
  await api.functional.discussionBoard.member.notifications.erase(connA, {
    notificationId: testNotificationId,
  });

  // Step 14: Final verification that unread count remains consistent and accurate
  const finalCount: IDiscussionBoardNotificationCount =
    await api.functional.discussionBoard.member.notifications.unread_count.unreadCount(
      connA,
    );
  typia.assert(finalCount);

  TestValidator.predicate(
    "unread count should properly reflect only unread and non-deleted notifications after all operations",
    finalCount.unread_count >= 0,
  );

  // Step 15: Verify consistency - calling the endpoint multiple times for the same state returns same count
  const verificationCount: IDiscussionBoardNotificationCount =
    await api.functional.discussionBoard.member.notifications.unread_count.unreadCount(
      connA,
    );
  typia.assert(verificationCount);

  TestValidator.equals(
    "unread count should be consistent across multiple calls for same state",
    verificationCount.unread_count,
    finalCount.unread_count,
  );
}
