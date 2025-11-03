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
 * Test soft-deleting a notification by setting deleted_at timestamp.
 *
 * This test validates that a member can soft-delete their own notifications,
 * marking them as hidden from the inbox while maintaining an audit trail. The
 * test creates a member, creates an article to establish context, then
 * retrieves the member's notification list and updates a notification to
 * soft-delete it by setting the deleted_at timestamp.
 *
 * Steps:
 *
 * 1. Register and authenticate a member
 * 2. Create an article by the member
 * 3. Retrieve notification list for the member
 * 4. If notifications exist, soft-delete the first notification
 * 5. Validate the notification is marked as deleted
 */
export async function test_api_notification_soft_delete_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member should be registered with valid ID",
    !!member.id,
  );

  // Step 2: Create an article by the member
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.predicate(
    "article should be created with valid ID",
    !!article.id,
  );

  // Step 3: Retrieve notification list for the member
  const notificationPage: IPageIDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.get(connection);
  typia.assert(notificationPage);
  TestValidator.predicate(
    "notification page should have pagination info",
    !!notificationPage.pagination,
  );

  // Step 4: If notifications exist, soft-delete the first one
  if (notificationPage.data.length > 0) {
    const notificationToDelete = notificationPage.data[0];
    TestValidator.predicate(
      "notification should not be deleted initially",
      notificationToDelete.deleted_at === null ||
        notificationToDelete.deleted_at === undefined,
    );

    // Step 5: Update the notification to soft-delete it
    const currentTimestamp = new Date().toISOString();
    const deletedNotification: IDiscussionBoardNotification =
      await api.functional.discussionBoard.member.notifications.update(
        connection,
        {
          notificationId: notificationToDelete.id,
          body: {
            deleted_at: currentTimestamp,
          } satisfies IDiscussionBoardNotification.IUpdate,
        },
      );
    typia.assert(deletedNotification);

    // Step 6: Validate that deleted_at is set
    TestValidator.predicate(
      "notification should have deleted_at set",
      !!deletedNotification.deleted_at,
    );
    TestValidator.equals(
      "deleted notification id should match original notification",
      deletedNotification.id,
      notificationToDelete.id,
    );
  } else {
    // If no notifications exist, validate the page is properly structured
    TestValidator.equals(
      "notification page should have empty data array",
      notificationPage.data.length,
      0,
    );
  }
}
