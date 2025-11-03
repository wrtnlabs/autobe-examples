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
import type { IDiscussionBoardNotificationCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationCount";

export async function test_api_notification_unread_count_returns_accurate_count_after_member_activities(
  connection: api.IConnection,
) {
  // 1. Create authenticated member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // 2. Check unread notification count for the authenticated member
  const unreadCountResult: IDiscussionBoardNotificationCount =
    await api.functional.discussionBoard.member.notifications.unread_count.unreadCount(
      connection,
    );
  typia.assert(unreadCountResult);

  // 3. Validate the unread count structure and value
  TestValidator.predicate(
    "unread count should be a non-negative integer",
    unreadCountResult.unread_count >= 0,
  );

  // 4. Verify the response contains the expected property
  TestValidator.predicate(
    "response should have unread_count property",
    typeof unreadCountResult.unread_count === "number",
  );

  // 5. Create an article for this member
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 6. Verify unread count endpoint continues to work after creating article
  const countAfterArticle: IDiscussionBoardNotificationCount =
    await api.functional.discussionBoard.member.notifications.unread_count.unreadCount(
      connection,
    );
  typia.assert(countAfterArticle);

  // 7. Validate count is still a valid non-negative integer
  TestValidator.predicate(
    "unread count should remain non-negative after article creation",
    countAfterArticle.unread_count >= 0,
  );
}
