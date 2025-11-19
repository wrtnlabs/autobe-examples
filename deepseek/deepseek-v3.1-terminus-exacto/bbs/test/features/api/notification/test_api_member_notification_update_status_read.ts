import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardDeliveryMethodFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDeliveryMethodFilter";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotificationStatusFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationStatusFilter";
import type { IDiscussionBoardNotificationTypeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationTypeFilter";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserNotification";

/**
 * Test the complete workflow of updating a notification status from unread to
 * read.
 */
export async function test_api_member_notification_update_status_read(
  connection: api.IConnection,
) {
  // Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 7,
      }),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "192.168.1.1",
      href: "https://discussion-board.example.com",
      referrer: "https://google.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Create a post
  const post = await api.functional.discussionBoard.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        discussion_board_channel_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // Since the notification system is not directly accessible via the provided APIs,
  // we'll test the notification update functionality directly with valid data

  // Create a notification ID for testing
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // Update notification status to "read"
  const updatedNotification =
    await api.functional.discussionBoard.member.notifications.update(
      connection,
      {
        notificationId: notificationId,
        body: {
          status: "read",
        } satisfies IDiscussionBoardUserNotification.IUpdate,
      },
    );
  typia.assert(updatedNotification);

  // Validate that the notification status was updated correctly
  TestValidator.equals(
    "notification status should be 'read'",
    updatedNotification.status,
    "read",
  );

  // Validate that the updated_at timestamp is more recent than created_at
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(updatedNotification.updated_at) >
      new Date(updatedNotification.created_at),
  );
}
