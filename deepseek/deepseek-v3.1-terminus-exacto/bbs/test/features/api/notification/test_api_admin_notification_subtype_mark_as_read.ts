import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMemberNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberNotificationPreference";
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

export async function test_api_admin_notification_subtype_mark_as_read(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create a system notification
  const notification =
    await generate_random_discussion_board_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          notification_type: RandomGenerator.pick([
            "announcement",
            "alert",
            "status_update",
            "moderation_action",
            "personal_message",
          ] as const),
          status: "sent",
          priority: RandomGenerator.pick([
            "low",
            "normal",
            "high",
            "critical",
          ] as const),
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // Step 3: Mark notification subtype as read
  const readTimestamp = new Date().toISOString();
  const updatedNotification =
    await api.functional.discussionBoard.admin.system_notifications.subtypes.updateSubtypes(
      adminConnection,
      {
        notificationId: notification.id,
        body: {
          readAt: readTimestamp,
        } satisfies IDiscussionBoardSystemNotification.ISubtypeUpdate,
      },
    );
  typia.assert(updatedNotification);
  // Step 4: Validate the response
  TestValidator.equals(
    "notification ID unchanged",
    updatedNotification.id,
    notification.id,
  );
  TestValidator.equals(
    "read_at timestamp updated",
    updatedNotification.read_at,
    readTimestamp,
  );
  TestValidator.equals(
    "title unchanged",
    updatedNotification.title,
    notification.title,
  );
  TestValidator.equals(
    "content unchanged",
    updatedNotification.content,
    notification.content,
  );
  TestValidator.equals(
    "notification_type unchanged",
    updatedNotification.notification_type,
    notification.notification_type,
  );
  TestValidator.equals(
    "status unchanged",
    updatedNotification.status,
    notification.status,
  );
  TestValidator.equals(
    "priority unchanged",
    updatedNotification.priority,
    notification.priority,
  );
  // Additional validation for business logic
  TestValidator.predicate(
    "read_at timestamp is valid",
    updatedNotification.read_at !== null,
  );
  TestValidator.predicate(
    "notification remains accessible",
    updatedNotification.id === notification.id,
  );
}
