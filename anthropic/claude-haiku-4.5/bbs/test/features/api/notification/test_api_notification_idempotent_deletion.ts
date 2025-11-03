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

export async function test_api_notification_idempotent_deletion(
  connection: api.IConnection,
) {
  // 1. Create a member account for testing
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // 2. Create an article to enable notification generation
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3. Create a comment to generate notifications
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 4. Retrieve notifications to get the target notification
  const notificationsPage: IPageIDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.get(connection);
  typia.assert(notificationsPage);

  TestValidator.predicate(
    "notifications should be generated",
    notificationsPage.data.length > 0,
  );

  const targetNotification: IDiscussionBoardNotification =
    notificationsPage.data[0];
  typia.assert(targetNotification);

  // 5. Delete the notification successfully (first delete)
  await api.functional.discussionBoard.member.notifications.erase(connection, {
    notificationId: targetNotification.id,
  });

  // 6. Attempt to delete the same notification again (idempotent delete)
  // This should succeed without error, confirming idempotent behavior
  await api.functional.discussionBoard.member.notifications.erase(connection, {
    notificationId: targetNotification.id,
  });

  // 7. Validate that the notification is no longer in the active list
  const updatedNotificationsPage: IPageIDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.get(connection);
  typia.assert(updatedNotificationsPage);

  const notificationExists: boolean = updatedNotificationsPage.data.some(
    (n) => n.id === targetNotification.id,
  );

  TestValidator.predicate(
    "deleted notification should not appear in active notifications",
    !notificationExists,
  );
}
