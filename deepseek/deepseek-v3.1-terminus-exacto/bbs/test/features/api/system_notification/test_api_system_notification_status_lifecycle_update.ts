import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_system_notifications_create } from "../../../generate/generate_random_discussion_board_admin_system_notifications_create";
import { prepare_random_discussion_board_system_notification } from "../../../prepare/prepare_random_discussion_board_system_notification";

/**
 * Test the complete lifecycle of a system notification through status updates,
 * ensuring proper state transitions and expiration handling.
 */
export async function test_api_system_notification_status_lifecycle_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create initial notification with 'pending' status
  const notification =
    await generate_random_discussion_board_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          notification_type: "announcement",
          status: "pending",
          priority: "normal",
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // 3. Test status transition: pending → sent
  const sentNotification =
    await api.functional.discussionBoard.admin.system_notifications.update(
      adminConnection,
      {
        notificationId: notification.id,
        body: {
          status: "sent",
        } satisfies IDiscussionBoardSystemNotification.IUpdate,
      },
    );
  typia.assert(sentNotification);
  // Validate sent status and delivered_at timestamp
  TestValidator.equals(
    "status should be sent",
    sentNotification.status,
    "sent",
  );
  TestValidator.predicate(
    "delivered_at should be set",
    sentNotification.delivered_at !== null,
  );
  // 4. Test status transition: sent → read
  const readNotification =
    await api.functional.discussionBoard.admin.system_notifications.update(
      adminConnection,
      {
        notificationId: notification.id,
        body: {
          status: "read",
        } satisfies IDiscussionBoardSystemNotification.IUpdate,
      },
    );
  typia.assert(readNotification);
  // Validate read status and read_at timestamp
  TestValidator.equals(
    "status should be read",
    readNotification.status,
    "read",
  );
  TestValidator.predicate(
    "read_at should be set",
    readNotification.read_at !== null,
  );
  // 5. Test status transition: read → archived
  const archivedNotification =
    await api.functional.discussionBoard.admin.system_notifications.update(
      adminConnection,
      {
        notificationId: notification.id,
        body: {
          status: "archived",
        } satisfies IDiscussionBoardSystemNotification.IUpdate,
      },
    );
  typia.assert(archivedNotification);
  // Validate archived status
  TestValidator.equals(
    "status should be archived",
    archivedNotification.status,
    "archived",
  );
  // 6. Test expiration timestamp handling
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 1 day from now
  const expiredNotification =
    await api.functional.discussionBoard.admin.system_notifications.update(
      adminConnection,
      {
        notificationId: notification.id,
        body: {
          expires_at: futureDate,
        } satisfies IDiscussionBoardSystemNotification.IUpdate,
      },
    );
  typia.assert(expiredNotification);
  // Validate expiration timestamp
  TestValidator.equals(
    "expires_at should be set",
    expiredNotification.expires_at,
    futureDate,
  );
  // 7. Test that status remains unchanged when updating other properties
  const updatedNotification =
    await api.functional.discussionBoard.admin.system_notifications.update(
      adminConnection,
      {
        notificationId: notification.id,
        body: {
          title: "Updated Title",
          content: "Updated content",
          priority: "high",
        } satisfies IDiscussionBoardSystemNotification.IUpdate,
      },
    );
  typia.assert(updatedNotification);
  // Validate that status remains archived
  TestValidator.equals(
    "status should remain archived",
    updatedNotification.status,
    "archived",
  );
  TestValidator.equals(
    "title should be updated",
    updatedNotification.title,
    "Updated Title",
  );
  TestValidator.equals(
    "content should be updated",
    updatedNotification.content,
    "Updated content",
  );
  TestValidator.equals(
    "priority should be updated",
    updatedNotification.priority,
    "high",
  );
}
