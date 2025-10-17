import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";

/**
 * Test the notification read status update functionality.
 *
 * This test validates the notification update endpoint's ability to mark
 * notifications as read. Due to API limitations (no notification retrieval
 * endpoint, no login endpoint), this test focuses on the update operation
 * mechanics rather than a complete end-to-end workflow.
 *
 * Steps:
 *
 * 1. Create administrator account for category creation
 * 2. Create a discussion board category
 * 3. Create first member account (topic author)
 * 4. Create a discussion topic
 * 5. Create second member account with separate connection (reply author)
 * 6. Create a reply to generate a notification
 * 7. Test notification update with the topic author's credentials
 * 8. Validate response structure and read status
 */
export async function test_api_notification_read_status_update_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a discussion board category
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member account (topic author who will receive notification)
  const topicAuthorConnection: api.IConnection = { ...connection, headers: {} };
  const topicAuthor: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(topicAuthorConnection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(topicAuthor);

  // Step 4: Create a discussion topic
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(
      topicAuthorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 3 }),
          category_id: category.id,
          tag_ids: null,
        } satisfies IDiscussionBoardTopic.ICreate,
      },
    );
  typia.assert(topic);

  // Step 5: Create second member account with separate connection (commenter)
  const commenterConnection: api.IConnection = { ...connection, headers: {} };
  const commenter: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(commenterConnection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(commenter);

  // Step 6: Create a reply to generate a notification
  const reply: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      commenterConnection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: null,
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply);

  // Step 7: Test notification update with topic author's credentials
  // Note: Without a notification retrieval endpoint, we use a UUID that would
  // be generated by the system in a real scenario
  const testNotificationId = typia.random<string & tags.Format<"uuid">>();

  const updatedNotification: IDiscussionBoardNotification =
    await api.functional.discussionBoard.member.users.notifications.update(
      topicAuthorConnection,
      {
        userId: topicAuthor.id,
        notificationId: testNotificationId,
        body: {
          is_read: true,
        } satisfies IDiscussionBoardNotification.IUpdate,
      },
    );
  typia.assert(updatedNotification);

  // Step 8: Validate response structure and read status
  TestValidator.predicate(
    "notification is marked as read",
    updatedNotification.is_read === true,
  );

  TestValidator.predicate(
    "read_at timestamp is populated when marked as read",
    updatedNotification.read_at !== null,
  );

  // Verify the notification belongs to the correct user
  TestValidator.equals(
    "notification user_id matches topic author",
    updatedNotification.user_id,
    topicAuthor.id,
  );
}
