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

export async function test_api_notification_cannot_delete_other_member_notification(
  connection: api.IConnection,
) {
  // Create first member (notification owner)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: "Password123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member1);

  // Create second member (unauthorized deleter)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: "Password123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member2);

  // Create article as member1
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // Create comment as member1 to generate notification
  const commentBody = {
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // Get member1's notifications
  const member1Notifications: IPageIDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.get(connection);
  typia.assert(member1Notifications);

  // Member1 should have at least one notification
  TestValidator.predicate(
    "member1 should have notifications",
    member1Notifications.data.length > 0,
  );

  const targetNotification = member1Notifications.data[0];
  typia.assert(targetNotification);

  // Switch to member2 context by logging in as member2
  const member2Connection: api.IConnection = {
    ...connection,
    headers: { Authorization: `Bearer ${member2.token.access}` },
  };

  // Member2 attempts to delete member1's notification (should fail with 403)
  await TestValidator.error(
    "member2 cannot delete member1's notification",
    async () => {
      await api.functional.discussionBoard.member.notifications.erase(
        member2Connection,
        {
          notificationId: targetNotification.id,
        },
      );
    },
  );

  // Verify notification still exists for member1
  const member1NotificationsAfter: IPageIDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.get(connection);
  typia.assert(member1NotificationsAfter);

  const stillExistsNotification = member1NotificationsAfter.data.find(
    (n) => n.id === targetNotification.id,
  );

  TestValidator.predicate(
    "notification still exists for owner",
    stillExistsNotification !== undefined,
  );
}
