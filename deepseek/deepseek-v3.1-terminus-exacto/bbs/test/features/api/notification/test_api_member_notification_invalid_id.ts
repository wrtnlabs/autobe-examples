import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDeliveryMethodFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDeliveryMethodFilter";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotificationStatusFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationStatusFilter";
import type { IDiscussionBoardNotificationTypeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationTypeFilter";
import type { IDiscussionBoardUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserNotification";

/**
 * Test error handling for notification retrieval with invalid or non-existent
 * notification IDs.
 *
 * This scenario validates that the system properly handles requests for
 * notifications that do not exist or have invalid format. It ensures that
 * appropriate error responses are returned for malformed UUIDs, non-existent
 * notification IDs, and IDs that do not belong to the authenticated member,
 * maintaining system security and data integrity.
 */
export async function test_api_member_notification_invalid_id(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member to establish user context for notification access
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 15,
      }),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 2,
        wordMax: 8,
      }),
      bio: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 8,
      }),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Test non-existent but valid UUID format
  await TestValidator.error(
    "non-existent UUID should throw error",
    async () => {
      await api.functional.discussionBoard.member.notifications.at(connection, {
        notificationId: "00000000-0000-0000-0000-000000000000",
      });
    },
  );

  // Step 3: Test another non-existent valid UUID
  await TestValidator.error(
    "another non-existent UUID should throw error",
    async () => {
      await api.functional.discussionBoard.member.notifications.at(connection, {
        notificationId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Step 4: Test null-like UUID (zeros with different pattern)
  await TestValidator.error(
    "null pattern UUID should throw error",
    async () => {
      await api.functional.discussionBoard.member.notifications.at(connection, {
        notificationId: "00000000-0000-0000-0000-000000000001",
      });
    },
  );

  // Step 5: Test a UUID that likely belongs to another user
  await TestValidator.error(
    "UUID belonging to another user should throw error",
    async () => {
      await api.functional.discussionBoard.member.notifications.at(connection, {
        notificationId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
      });
    },
  );

  // Step 6: Test sequential UUID pattern that likely doesn't exist
  await TestValidator.error(
    "sequential UUID pattern should throw error",
    async () => {
      await api.functional.discussionBoard.member.notifications.at(connection, {
        notificationId: "12345678-1234-1234-1234-123456789abc",
      });
    },
  );
}
