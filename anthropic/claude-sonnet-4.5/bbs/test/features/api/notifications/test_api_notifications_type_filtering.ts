import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotification";

/**
 * Test notification filtering by notification type to help users find specific
 * categories of activity alerts.
 *
 * This test validates the notification type filtering functionality that
 * enables users to review specific activity categories efficiently. The test
 * creates diverse notification types through various platform activities and
 * validates type-based filtering capabilities.
 *
 * Test workflow:
 *
 * 1. Create primary member account (notification receiver)
 * 2. Create topics by primary member
 * 3. Create secondary member account (activity generator)
 * 4. Generate reply_to_topic notifications (secondary replies to primary's topics)
 * 5. Generate reply_to_comment notifications (secondary replies to primary's
 *    replies)
 * 6. Filter notifications by type: reply_to_topic
 * 7. Filter notifications by type: reply_to_comment
 * 8. Validate type-specific filtering returns only matching notifications
 * 9. Test combined filtering by type and read status
 */
export async function test_api_notifications_type_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create primary member account
  const primaryMemberEmail = typia.random<string & tags.Format<"email">>();
  const primaryMemberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: primaryMemberEmail,
    password: "SecurePass123!@#",
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const primaryMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: primaryMemberData,
    });
  typia.assert(primaryMember);

  // Step 2: Create topics by primary member to enable notification triggers
  const topicData1 = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    tag_ids: ArrayUtil.repeat(2, () =>
      typia.random<string & tags.Format<"uuid">>(),
    ),
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic1: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData1,
    });
  typia.assert(topic1);

  const topicData2 = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 12,
      sentenceMax: 18,
    }),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    tag_ids: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic2: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData2,
    });
  typia.assert(topic2);

  // Step 3: Create secondary member account to generate notifications
  const secondaryMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondaryMemberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: secondaryMemberEmail,
    password: "SecurePass456!@#",
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const secondaryMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: secondaryMemberData,
    });
  typia.assert(secondaryMember);

  // Step 4: Secondary member creates replies to primary member's topics
  // This generates reply_to_topic notifications for primary member
  const replyToTopic1Data = {
    discussion_board_topic_id: topic1.id,
    parent_reply_id: null,
    content: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 9,
    }),
  } satisfies IDiscussionBoardReply.ICreate;

  const replyToTopic1: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic1.id,
        body: replyToTopic1Data,
      },
    );
  typia.assert(replyToTopic1);

  const replyToTopic2Data = {
    discussion_board_topic_id: topic2.id,
    parent_reply_id: null,
    content: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardReply.ICreate;

  const replyToTopic2: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic2.id,
        body: replyToTopic2Data,
      },
    );
  typia.assert(replyToTopic2);

  // Step 5: Primary member creates replies, then secondary member replies to them
  // This generates reply_to_comment notifications for primary member

  // Re-authenticate as primary member
  await api.functional.auth.member.join(connection, {
    body: primaryMemberData,
  });

  const primaryReplyData = {
    discussion_board_topic_id: topic1.id,
    parent_reply_id: null,
    content: RandomGenerator.paragraph({
      sentences: 7,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardReply.ICreate;

  const primaryReply: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic1.id,
        body: primaryReplyData,
      },
    );
  typia.assert(primaryReply);

  // Re-authenticate as secondary member
  await api.functional.auth.member.join(connection, {
    body: secondaryMemberData,
  });

  const replyToCommentData = {
    discussion_board_topic_id: topic1.id,
    parent_reply_id: primaryReply.id,
    content: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IDiscussionBoardReply.ICreate;

  const replyToComment: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic1.id,
        body: replyToCommentData,
      },
    );
  typia.assert(replyToComment);

  // Step 6: Re-authenticate as primary member to retrieve notifications
  await api.functional.auth.member.join(connection, {
    body: primaryMemberData,
  });

  // Step 7: Retrieve all notifications without filter first
  const allNotificationsRequest = {
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardNotification.IRequest;

  const allNotifications: IPageIDiscussionBoardNotification.ISummary =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: primaryMember.id,
        body: allNotificationsRequest,
      },
    );
  typia.assert(allNotifications);

  // Step 8: Filter notifications by type - reply_to_topic
  const filterReplyToTopicRequest = {
    page: 1,
    limit: 20,
    notification_type: "reply_to_topic" as const,
  } satisfies IDiscussionBoardNotification.IRequest;

  const replyToTopicNotifications: IPageIDiscussionBoardNotification.ISummary =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: primaryMember.id,
        body: filterReplyToTopicRequest,
      },
    );
  typia.assert(replyToTopicNotifications);

  // Validate all returned notifications are reply_to_topic type
  if (replyToTopicNotifications.data.length > 0) {
    TestValidator.predicate(
      "all notifications should be reply_to_topic type",
      replyToTopicNotifications.data.every(
        (n) => n.notification_type === "reply_to_topic",
      ),
    );
  }

  // Step 9: Filter notifications by type - reply_to_comment
  const filterReplyToCommentRequest = {
    page: 1,
    limit: 20,
    notification_type: "reply_to_comment" as const,
  } satisfies IDiscussionBoardNotification.IRequest;

  const replyToCommentNotifications: IPageIDiscussionBoardNotification.ISummary =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: primaryMember.id,
        body: filterReplyToCommentRequest,
      },
    );
  typia.assert(replyToCommentNotifications);

  // Validate all returned notifications are reply_to_comment type
  if (replyToCommentNotifications.data.length > 0) {
    TestValidator.predicate(
      "all notifications should be reply_to_comment type",
      replyToCommentNotifications.data.every(
        (n) => n.notification_type === "reply_to_comment",
      ),
    );
  }

  // Step 10: Validate that filtering reduces the result set appropriately
  TestValidator.predicate(
    "reply_to_topic filtered results should be subset of all notifications",
    replyToTopicNotifications.data.length <= allNotifications.data.length,
  );

  TestValidator.predicate(
    "reply_to_comment filtered results should be subset of all notifications",
    replyToCommentNotifications.data.length <= allNotifications.data.length,
  );

  // Step 11: Test combined filtering - type and read status
  const combinedFilterRequest = {
    page: 1,
    limit: 20,
    notification_type: "reply_to_topic" as const,
    is_read: false,
  } satisfies IDiscussionBoardNotification.IRequest;

  const combinedFilterNotifications: IPageIDiscussionBoardNotification.ISummary =
    await api.functional.discussionBoard.member.users.notifications.index(
      connection,
      {
        userId: primaryMember.id,
        body: combinedFilterRequest,
      },
    );
  typia.assert(combinedFilterNotifications);

  // Validate all returned notifications match both filters
  if (combinedFilterNotifications.data.length > 0) {
    TestValidator.predicate(
      "all notifications should be reply_to_topic type and unread",
      combinedFilterNotifications.data.every(
        (n) => n.notification_type === "reply_to_topic" && n.is_read === false,
      ),
    );
  }

  // Step 12: Verify combined filtering is more restrictive than single type filtering
  TestValidator.predicate(
    "combined filter results should be subset of type-only filter",
    combinedFilterNotifications.data.length <=
      replyToTopicNotifications.data.length,
  );
}
