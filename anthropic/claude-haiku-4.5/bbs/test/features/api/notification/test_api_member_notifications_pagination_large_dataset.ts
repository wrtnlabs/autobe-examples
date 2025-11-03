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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotification";

export async function test_api_member_notifications_pagination_large_dataset(
  connection: api.IConnection,
) {
  // Step 1: Create primary member who will receive notifications
  const primaryMemberEmail = typia.random<string & tags.Format<"email">>();
  const primaryConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const primaryMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(primaryConnection, {
      body: {
        email: primaryMemberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(primaryMember);

  // Step 2: Create secondary member who will interact with primary member
  const secondaryMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondaryConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const secondaryMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(secondaryConnection, {
      body: {
        email: secondaryMemberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(secondaryMember);

  // Step 3: Create article from primary member to establish context
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(
      primaryConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          category_code: "economics",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 4: Create initial comment from primary member
  const initialComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      primaryConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(initialComment);

  // Step 5: Create multiple replies from secondary member (15+ replies)
  // This will generate comment_reply notifications for the primary member
  const replyCount = 15;
  const replies: IDiscussionBoardComment[] = [];

  for (let i = 0; i < replyCount; i++) {
    const reply: IDiscussionBoardComment =
      await api.functional.discussionBoard.member.comments.replies.createReply(
        secondaryConnection,
        {
          commentId: initialComment.id,
          body: {
            content: `Reply ${i + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(reply);
    replies.push(reply);

    // Small delay to ensure different timestamps for ordering validation
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  // Step 6: Fetch notifications using primary member connection
  // Primary member should have received comment_reply notifications from the replies
  const notificationPage: IPageIDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.get(
      primaryConnection,
    );
  typia.assert(notificationPage);

  // Step 7: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination object exists",
    notificationPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page field",
    notificationPage.pagination.current !== undefined &&
      notificationPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit field",
    notificationPage.pagination.limit !== undefined &&
      notificationPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has total records count",
    notificationPage.pagination.records !== undefined &&
      notificationPage.pagination.records >= replyCount,
  );
  TestValidator.predicate(
    "pagination has pages field",
    notificationPage.pagination.pages !== undefined &&
      notificationPage.pagination.pages > 0,
  );

  // Step 8: Validate data array structure
  TestValidator.predicate(
    "notification data array exists and is array",
    notificationPage.data !== undefined && Array.isArray(notificationPage.data),
  );
  TestValidator.predicate(
    "notification data contains items",
    notificationPage.data.length > 0,
  );
  TestValidator.predicate(
    "notification count does not exceed page limit",
    notificationPage.data.length <= notificationPage.pagination.limit,
  );

  // Step 9: Validate individual notification structure and content
  const notifications = notificationPage.data;
  const notificationIds: string[] = [];

  for (const notification of notifications) {
    typia.assert(notification);

    // Validate required fields exist and have correct types
    TestValidator.predicate(
      "notification has valid id",
      notification.id !== undefined && notification.id !== "",
    );
    TestValidator.predicate(
      "notification has recipient_member_id",
      notification.recipient_member_id !== undefined &&
        notification.recipient_member_id !== "",
    );
    TestValidator.predicate(
      "notification has notification_type",
      notification.notification_type !== undefined &&
        notification.notification_type !== "",
    );
    TestValidator.predicate(
      "notification has title",
      notification.title !== undefined && notification.title !== "",
    );
    TestValidator.predicate(
      "notification has message",
      notification.message !== undefined && notification.message !== "",
    );
    TestValidator.predicate(
      "notification has is_read as boolean",
      notification.is_read !== undefined &&
        typeof notification.is_read === "boolean",
    );
    TestValidator.predicate(
      "notification has valid created_at timestamp",
      notification.created_at !== undefined && notification.created_at !== "",
    );

    // Validate created_at is a valid ISO 8601 date
    const createdAtDate = new Date(notification.created_at);
    TestValidator.predicate(
      "notification created_at is valid date",
      !isNaN(createdAtDate.getTime()),
    );

    // Track IDs for duplicate detection
    notificationIds.push(notification.id);

    // Validate notification is for the primary member
    TestValidator.equals(
      "notification recipient is primary member",
      notification.recipient_member_id,
      primaryMember.id,
    );
  }

  // Step 10: Validate no duplicates exist on current page
  const uniqueIds = new Set(notificationIds);
  TestValidator.equals(
    "no duplicate notification IDs on page",
    notificationIds.length,
    uniqueIds.size,
  );

  // Step 11: Validate ordering consistency (descending by timestamp)
  const timestamps = notifications.map((n) => new Date(n.created_at).getTime());
  let isConsecutivelyOrdered = true;
  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i] > timestamps[i - 1]) {
      isConsecutivelyOrdered = false;
      break;
    }
  }
  TestValidator.predicate(
    "notifications maintain consistent descending timestamp order",
    isConsecutivelyOrdered,
  );

  // Step 12: Validate comment_reply notifications with proper context
  const commentReplyNotifications = notifications.filter(
    (n) => n.notification_type === "comment_reply",
  );
  TestValidator.predicate(
    "comment_reply notifications exist from generated replies",
    commentReplyNotifications.length > 0,
  );

  for (const notification of commentReplyNotifications) {
    TestValidator.predicate(
      "comment_reply has source_member_id",
      notification.source_member_id !== undefined &&
        notification.source_member_id !== "",
    );
    TestValidator.predicate(
      "comment_reply has triggering_comment_id",
      notification.triggering_comment_id !== undefined &&
        notification.triggering_comment_id !== "",
    );
  }

  // Step 13: Validate pagination math
  const expectedPages = Math.ceil(
    notificationPage.pagination.records / notificationPage.pagination.limit,
  );
  TestValidator.equals(
    "calculated pages matches pagination pages field",
    notificationPage.pagination.pages,
    expectedPages,
  );
}
