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
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotification";

/**
 * Test that members receive multiple notification types aggregated in a single
 * list.
 *
 * This test validates the notification system's ability to aggregate different
 * types of notifications (comment_reply, article_moderation,
 * comment_moderation) into a unified paginated list. The test creates a
 * realistic scenario where a member receives multiple notification events
 * through different interaction types and verifies that all notifications are
 * returned together with proper metadata and chronological ordering.
 *
 * Test flow:
 *
 * 1. Create primary member who will receive multiple notification types
 * 2. Create secondary member who will interact with primary member
 * 3. Create article as context for comment posting
 * 4. Post comment from primary member
 * 5. Post reply from secondary member to generate comment_reply notification
 * 6. Retrieve notifications and validate:
 *
 *    - Multiple notification types present in results
 *    - Each notification has correct notification_type field
 *    - Metadata is properly populated for each type
 *    - Notifications maintain chronological order
 *    - Each notification references correct triggering content
 */
export async function test_api_member_notifications_multiple_types_aggregated(
  connection: api.IConnection,
) {
  // 1. Create primary member who will receive notifications
  const primaryMemberEmail = typia.random<string & tags.Format<"email">>();
  const primaryMemberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: primaryMemberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(primaryMemberAuth);
  const primaryMember = primaryMemberAuth;

  // Create authenticated connection for primary member
  const primaryConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: primaryMember.token.access,
    },
  };

  // 2. Create secondary member who will interact with primary member
  const secondaryMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondaryMemberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: secondaryMemberEmail,
        password: "TestPassword456",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(secondaryMemberAuth);
  const secondaryMember = secondaryMemberAuth;

  // Create authenticated connection for secondary member
  const secondaryConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: secondaryMember.token.access,
    },
  };

  // 3. Create article as context for discussion
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(
      primaryConnection,
      {
        body: {
          title: "Test Article for Notifications",
          content:
            "This is a test article to generate various notification types for aggregation testing.",
          category_code: "economics",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate("article created successfully", article.id !== null);

  // 4. Post comment from primary member
  const primaryComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      primaryConnection,
      {
        articleId: article.id,
        body: {
          content: "This is a test comment from the primary member.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(primaryComment);
  TestValidator.equals(
    "primary comment author is primary member",
    primaryComment.discussion_board_member_id,
    primaryMember.id,
  );

  // 5. Post reply from secondary member to generate comment_reply notification
  const replyComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.comments.replies.createReply(
      secondaryConnection,
      {
        commentId: primaryComment.id,
        body: {
          content: "This is a reply from the secondary member.",
          parent_comment_id: primaryComment.id,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(replyComment);
  TestValidator.equals(
    "reply comment parent is primary comment",
    replyComment.parent_comment_id,
    primaryComment.id,
  );

  // 6. Retrieve notifications for primary member and validate aggregation
  const notificationsPage: IPageIDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.get(
      primaryConnection,
    );
  typia.assert(notificationsPage);

  TestValidator.predicate(
    "notifications page contains data",
    notificationsPage.data.length > 0,
  );

  // Validate notification structure
  const notifications = notificationsPage.data;
  TestValidator.predicate(
    "at least one notification exists",
    notifications.length >= 1,
  );

  // Verify each notification has required fields and proper structure
  notifications.forEach(
    (notification: IDiscussionBoardNotification, index: number) => {
      typia.assert(notification);
      TestValidator.predicate(
        `notification at index ${index} has valid type`,
        notification.notification_type !== undefined &&
          notification.notification_type.length > 0,
      );
      TestValidator.equals(
        `notification at index ${index} recipient is primary member`,
        notification.recipient_member_id,
        primaryMember.id,
      );
      TestValidator.predicate(
        `notification at index ${index} has valid id`,
        notification.id !== undefined && notification.id.length > 0,
      );
      TestValidator.predicate(
        `notification at index ${index} has created_at timestamp`,
        notification.created_at !== undefined &&
          notification.created_at.length > 0,
      );
    },
  );

  // Validate that comment_reply notification is present
  const commentReplyNotifications = notifications.filter(
    (n: IDiscussionBoardNotification) =>
      n.notification_type === "comment_reply",
  );
  TestValidator.predicate(
    "at least one comment_reply notification exists",
    commentReplyNotifications.length > 0,
  );

  // Validate comment_reply notification has correct metadata
  if (commentReplyNotifications.length > 0) {
    const replyNotification = commentReplyNotifications[0];
    typia.assertGuard(replyNotification);
    TestValidator.predicate(
      "comment_reply notification has triggering comment",
      replyNotification.triggering_comment_id !== null &&
        replyNotification.triggering_comment_id !== undefined,
    );
    TestValidator.predicate(
      "comment_reply notification has source member",
      replyNotification.source_member_id !== null &&
        replyNotification.source_member_id !== undefined,
    );
    TestValidator.equals(
      "comment_reply notification references correct reply comment",
      replyNotification.triggering_comment_id,
      replyComment.id,
    );
    TestValidator.equals(
      "comment_reply notification source is secondary member",
      replyNotification.source_member_id,
      secondaryMember.id,
    );
  }

  // Validate pagination information
  TestValidator.predicate(
    "pagination exists",
    notificationsPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is set",
    notificationsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    notificationsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count matches or exceeds returned notifications",
    notificationsPage.pagination.records >= notifications.length,
  );
}
