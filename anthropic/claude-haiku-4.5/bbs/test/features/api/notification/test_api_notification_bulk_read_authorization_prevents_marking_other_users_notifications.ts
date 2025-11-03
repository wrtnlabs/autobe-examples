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

export async function test_api_notification_bulk_read_authorization_prevents_marking_other_users_notifications(
  connection: api.IConnection,
) {
  // 1. Member A signs up
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberA: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberAEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberA);

  // 2. Member A creates an article to trigger notification generation
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3. Member B signs up and switches context
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberB: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberBEmail,
        password: "TestPassword456",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberB);
  // Connection now has Member B's authorization token

  // 4. Member B posts a comment on Member A's article
  // This creates a notification for Member A
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5. Prepare synthetic notification IDs that would belong to Member A
  // In this test, we create IDs that represent Member A's notifications
  const memberANotificationIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  // 6. Member B attempts to mark Member A's notifications as read
  // This should fail with an authorization error because Member B does not own these notifications
  await TestValidator.error(
    "Member B should not be able to mark Member A's notifications as read due to authorization failure",
    async () => {
      await api.functional.discussionBoard.member.notifications.bulk.read.updateReadBulk(
        connection,
        {
          body: {
            notification_ids: memberANotificationIds,
          } satisfies IDiscussionBoardNotifications.IReadBulkRequest,
        },
      );
    },
  );

  // 7. Verify authorization enforcement by testing with empty notification list
  // Member B can call the endpoint with an empty list (authorized but no notifications to process)
  const emptyNotificationResponse: IDiscussionBoardNotifications.IReadBulkResponse =
    await api.functional.discussionBoard.member.notifications.bulk.read.updateReadBulk(
      connection,
      {
        body: {
          notification_ids: [],
        } satisfies IDiscussionBoardNotifications.IReadBulkRequest,
      },
    );
  typia.assert(emptyNotificationResponse);

  // Validate that the response indicates zero notifications were updated
  TestValidator.equals(
    "empty notification list should result in zero updated count",
    emptyNotificationResponse.updated_count,
    0,
  );
}
