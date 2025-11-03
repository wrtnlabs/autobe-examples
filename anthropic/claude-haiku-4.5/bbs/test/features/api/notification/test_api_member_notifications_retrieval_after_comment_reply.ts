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

/**
 * Test member notification retrieval after comment reply.
 *
 * This test validates the complete notification workflow:
 *
 * 1. Create two member accounts
 * 2. First member creates an article
 * 3. First member posts a comment on the article
 * 4. Second member replies to the first member's comment
 * 5. First member retrieves their notifications and verifies the reply
 *    notification
 *
 * Key validations:
 *
 * - Notifications are filtered by recipient_member_id
 * - Notifications include complete metadata (type, article, source member,
 *   action_url)
 * - Pagination works with default page size
 * - Notifications are ordered by creation date (newest first)
 * - Read status indicators (is_read, read_at) reflect notification state
 */
export async function test_api_member_notifications_retrieval_after_comment_reply(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (who will receive the notification)
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: firstMemberEmail,
        password: "Password123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(firstMember);
  TestValidator.predicate("first member created", firstMember.id !== null);

  // Store first member's token for later use
  const firstMemberToken = firstMember.token.access;

  // Step 2: Create second member account (who will post the reply)
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: secondMemberEmail,
        password: "Password123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(secondMember);
  TestValidator.predicate("second member created", secondMember.id !== null);

  // Step 3: First member creates an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Economic Policy Discussion",
        content:
          "This article discusses important economic policies and their impacts on society.",
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.equals(
    "article created by first member",
    article.author.id,
    firstMember.id,
  );

  // Step 4: First member posts a comment on the article
  const firstComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "I believe this policy will have positive effects on economic growth.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(firstComment);
  TestValidator.equals(
    "first comment posted by first member",
    firstComment.author.id,
    firstMember.id,
  );

  // Step 5: Switch to second member's session to post a reply
  const secondMemberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${secondMember.token.access}`,
    },
  };

  // Step 6: Second member posts a reply to the first member's comment
  const replyComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.comments.replies.createReply(
      secondMemberConnection,
      {
        commentId: firstComment.id,
        body: {
          content:
            "I agree with your analysis. The long-term benefits are significant.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(replyComment);
  TestValidator.equals(
    "reply posted by second member",
    replyComment.author.id,
    secondMember.id,
  );

  // Step 7: Switch back to first member's session to retrieve notifications
  const firstMemberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${firstMemberToken}`,
    },
  };

  // Step 8: Retrieve first member's notifications
  const notificationsPage: IPageIDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.get(
      firstMemberConnection,
    );
  typia.assert(notificationsPage);

  // Step 9: Verify pagination structure
  TestValidator.predicate(
    "pagination exists",
    notificationsPage.pagination !== null,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(notificationsPage.data),
  );
  TestValidator.predicate(
    "pagination has current page",
    notificationsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    notificationsPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has total records",
    notificationsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    notificationsPage.pagination.pages >= 0,
  );

  // Step 10: Verify notifications are ordered by creation date (newest first)
  if (notificationsPage.data.length > 1) {
    for (let i = 0; i < notificationsPage.data.length - 1; i++) {
      const current = new Date(notificationsPage.data[i].created_at).getTime();
      const next = new Date(notificationsPage.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "notifications ordered newest first",
        current >= next,
      );
    }
  }

  // Step 11: Find the comment_reply notification triggered by the second member's reply
  const replyNotification = notificationsPage.data.find(
    (n) =>
      n.notification_type === "comment_reply" &&
      n.source_member_id === secondMember.id,
  );

  TestValidator.predicate(
    "comment reply notification exists",
    replyNotification !== undefined,
  );

  if (replyNotification) {
    // Step 12: Verify notification metadata
    TestValidator.equals(
      "notification recipient is first member",
      replyNotification.recipient_member_id,
      firstMember.id,
    );
    TestValidator.equals(
      "notification type is comment_reply",
      replyNotification.notification_type,
      "comment_reply",
    );
    TestValidator.equals(
      "notification source is second member",
      replyNotification.source_member_id,
      secondMember.id,
    );
    TestValidator.equals(
      "notification references correct article",
      replyNotification.triggering_article_id,
      article.id,
    );
    TestValidator.equals(
      "notification references correct comment",
      replyNotification.triggering_comment_id,
      replyComment.id,
    );

    // Step 13: Verify notification title and message exist
    TestValidator.predicate(
      "notification has title",
      replyNotification.title !== null && replyNotification.title.length > 0,
    );
    TestValidator.predicate(
      "notification has message",
      replyNotification.message !== null &&
        replyNotification.message.length > 0,
    );

    // Step 14: Verify recipient email is stored
    TestValidator.predicate(
      "notification has recipient email",
      replyNotification.recipient_email !== null &&
        replyNotification.recipient_email !== undefined,
    );

    // Step 15: Verify read status indicators (should be unread initially)
    TestValidator.equals(
      "notification is initially unread",
      replyNotification.is_read,
      false,
    );
    TestValidator.predicate(
      "read_at is null for unread notification",
      !replyNotification.read_at,
    );

    // Step 16: Verify action_url exists and contains proper format
    TestValidator.predicate(
      "notification has action_url",
      replyNotification.action_url !== null &&
        replyNotification.action_url !== undefined,
    );
  }
}
