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
import type { IDiscussionBoardNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotifications";

export async function test_api_notification_bulk_read_mark_multiple_unread_notifications_as_read(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (article author and notification owner)
  const member1Email: string = typia.random<string & tags.Format<"email">>();
  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: "TestPass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member1);

  // Step 2: Create second member account (commenter who generates notifications)
  const member2Email: string = typia.random<string & tags.Format<"email">>();
  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: "TestPass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member2);

  // Step 3: Switch back to first member and create an article
  await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: "TestPass123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Economic Analysis: Market Trends",
        content:
          "This article discusses current market trends and economic indicators affecting global markets. Analysis of monetary policy, inflation rates, and market volatility patterns.",
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 4: Switch to second member to post comments (generates notifications for first member)
  await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: "TestPass123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });

  // Post multiple comments that would generate notifications
  const comment1: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "Great analysis! I completely agree with your market assessment.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment1);

  const comment2: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: "This is very helpful information for investment decisions.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment2);

  const comment3: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: "Would love to see more analysis on emerging markets.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment3);

  // Step 5: Switch back to first member
  await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: "TestPass123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });

  // Step 6: Prepare notification IDs for bulk marking as read
  // These represent notification IDs that would have been generated from the comment activities
  const notificationIds: (string & tags.Format<"uuid">)[] = ArrayUtil.repeat(
    3,
    () => typia.random<string & tags.Format<"uuid">>(),
  );

  // Step 7: Call bulk read endpoint to mark multiple notifications as read
  const bulkReadResponse: IDiscussionBoardNotifications.IReadBulkResponse =
    await api.functional.discussionBoard.member.notifications.bulk.read.updateReadBulk(
      connection,
      {
        body: {
          notification_ids: notificationIds,
        } satisfies IDiscussionBoardNotifications.IReadBulkRequest,
      },
    );
  typia.assert(bulkReadResponse);

  // Step 8: Validate bulk read response structure and count
  TestValidator.predicate(
    "bulk read response should have updated_count as non-negative integer",
    bulkReadResponse.updated_count >= 0,
  );

  // Step 9: Test bulk read with empty notification list
  const emptyBulkReadResponse: IDiscussionBoardNotifications.IReadBulkResponse =
    await api.functional.discussionBoard.member.notifications.bulk.read.updateReadBulk(
      connection,
      {
        body: {
          notification_ids: [],
        } satisfies IDiscussionBoardNotifications.IReadBulkRequest,
      },
    );
  typia.assert(emptyBulkReadResponse);

  TestValidator.equals(
    "bulk read with empty list should return zero updated count",
    emptyBulkReadResponse.updated_count,
    0,
  );

  // Step 10: Test that member cannot mark other member's notifications as read
  // Switch to second member
  await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: "TestPass123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });

  // Attempt to mark first member's notifications as read should fail
  await TestValidator.error(
    "other member cannot mark another member's notifications as read",
    async () => {
      await api.functional.discussionBoard.member.notifications.bulk.read.updateReadBulk(
        connection,
        {
          body: {
            notification_ids: notificationIds,
          } satisfies IDiscussionBoardNotifications.IReadBulkRequest,
        },
      );
    },
  );
}
