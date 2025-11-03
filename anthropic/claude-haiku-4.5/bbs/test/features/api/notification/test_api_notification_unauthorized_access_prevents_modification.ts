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
 * Test authorization boundary enforcement on notification modification.
 *
 * Validates that a member cannot update another member's notification, ensuring
 * strict ownership verification prevents unauthorized modifications.
 *
 * Workflow:
 *
 * 1. Create first member account (Alice)
 * 2. Create second member account (Bob)
 * 3. Create article as Alice to establish ownership context
 * 4. Create comment on article as Alice
 * 5. Retrieve Alice's notifications to identify target notification
 * 6. Switch to Bob's authentication context
 * 7. Attempt to update Alice's notification as Bob
 * 8. Verify operation fails with 403 Forbidden error
 */
export async function test_api_notification_unauthorized_access_prevents_modification(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (Alice)
  const aliceMemberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123",
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const aliceAuthorized = await api.functional.auth.member.join(connection, {
    body: aliceMemberData,
  });
  typia.assert(aliceAuthorized);

  // Step 2: Create second member account (Bob)
  const bobMemberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123",
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const bobAuthorized = await api.functional.auth.member.join(connection, {
    body: bobMemberData,
  });
  typia.assert(bobAuthorized);

  // Switch connection back to Alice's authentication
  connection.headers ??= {};
  connection.headers.Authorization = aliceAuthorized.token.access;

  // Step 3: Create article as Alice to establish ownership context
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 4: Create comment on article as Alice to trigger notification generation
  const commentData = {
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  // Step 5: Retrieve Alice's notifications to identify target notification
  const aliceNotifications =
    await api.functional.discussionBoard.member.notifications.get(connection);
  typia.assert(aliceNotifications);

  TestValidator.predicate(
    "Alice should have at least one notification",
    aliceNotifications.data.length > 0,
  );

  const targetNotification = aliceNotifications.data[0];
  typia.assert(targetNotification);

  // Step 6: Switch to Bob's authentication context
  connection.headers ??= {};
  connection.headers.Authorization = bobAuthorized.token.access;

  // Step 7: Attempt to update Alice's notification as Bob - should fail with 403
  await TestValidator.error(
    "Bob cannot update Alice's notification - should reject with authorization error",
    async () => {
      await api.functional.discussionBoard.member.notifications.update(
        connection,
        {
          notificationId: targetNotification.id,
          body: {
            is_read: true,
          } satisfies IDiscussionBoardNotification.IUpdate,
        },
      );
    },
  );

  // Step 8: Verify Alice can still update her own notification
  connection.headers ??= {};
  connection.headers.Authorization = aliceAuthorized.token.access;

  const updatedNotification =
    await api.functional.discussionBoard.member.notifications.update(
      connection,
      {
        notificationId: targetNotification.id,
        body: {
          is_read: true,
        } satisfies IDiscussionBoardNotification.IUpdate,
      },
    );
  typia.assert(updatedNotification);

  TestValidator.equals(
    "notification should be marked as read",
    updatedNotification.is_read,
    true,
  );
}
