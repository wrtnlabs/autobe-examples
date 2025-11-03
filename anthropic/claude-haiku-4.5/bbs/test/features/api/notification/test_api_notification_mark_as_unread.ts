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
 * Test marking a read notification as unread.
 *
 * This test validates the complete notification lifecycle including creation
 * through user interactions, reading, and reverting back to unread state. The
 * test performs:
 *
 * 1. Member registration and authentication
 * 2. Article creation on the discussion board
 * 3. Comment creation to trigger notification generation
 * 4. Retrieval of notifications list
 * 5. Marking notification as read
 * 6. Marking notification back as unread
 * 7. Validating the unread state transition
 */
export async function test_api_notification_mark_as_unread(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.equals("member is created", typeof member.id, "string");

  // Step 2: Create an article to enable notification generation
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Economic Policy Discussion",
        content:
          "This article discusses current economic policies and their impact on the market.",
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.equals(
    "article is created",
    article.title,
    "Economic Policy Discussion",
  );

  // Step 3: Create a comment on the article (this will generate a notification for interactions)
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: "This is an interesting perspective on fiscal policy.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals("comment is created", comment.status, "published");

  // Step 4: Retrieve notifications list
  const notificationsPage: IPageIDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.get(connection);
  typia.assert(notificationsPage);
  TestValidator.predicate(
    "notifications page has data",
    notificationsPage.data.length > 0,
  );

  // Get the first notification (most recent)
  const targetNotification = notificationsPage.data[0];
  typia.assert(targetNotification);

  // Step 5: Mark notification as read
  const readNotification: IDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.update(
      connection,
      {
        notificationId: targetNotification.id,
        body: {
          is_read: true,
        } satisfies IDiscussionBoardNotification.IUpdate,
      },
    );
  typia.assert(readNotification);
  TestValidator.equals(
    "notification is marked as read",
    readNotification.is_read,
    true,
  );
  TestValidator.predicate(
    "notification has read_at timestamp",
    readNotification.read_at !== null && readNotification.read_at !== undefined,
  );

  // Step 6: Mark notification as unread by setting is_read to false
  const unreadNotification: IDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.update(
      connection,
      {
        notificationId: targetNotification.id,
        body: {
          is_read: false,
        } satisfies IDiscussionBoardNotification.IUpdate,
      },
    );
  typia.assert(unreadNotification);

  // Step 7: Validate the unread state transition
  TestValidator.equals(
    "notification is marked as unread",
    unreadNotification.is_read,
    false,
  );
  TestValidator.equals(
    "notification read_at is cleared",
    unreadNotification.read_at,
    null,
  );
  TestValidator.predicate(
    "notification id is valid",
    unreadNotification.id !== null && unreadNotification.id !== undefined,
  );
}
