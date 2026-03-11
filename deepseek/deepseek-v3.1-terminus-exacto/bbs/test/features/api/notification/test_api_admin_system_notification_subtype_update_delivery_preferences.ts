import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import type { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import type { IDiscussionBoardSystemNotificationOfAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotificationOfAdmin";
import type { IDiscussionBoardSystemNotificationOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotificationOfMember";
import type { IDiscussionBoardSystemNotificationOfSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotificationOfSuperAdmin";
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

export async function test_api_admin_system_notification_subtype_update_delivery_preferences(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create parent system notification
  const notification =
    await generate_random_discussion_board_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          notification_type: "announcement",
          status: "pending",
          priority: "normal",
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // 3. Create notification subtype
  const subtype =
    await api.functional.discussionBoard.admin.system_notifications.subtypes.createSubtype(
      adminConnection,
      {
        notificationId: notification.id,
        body: {
          actor_type: "admin",
          admin_id: adminAuth.id,
          notification_context: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
      },
    );
  typia.assert(subtype);
  // 4. Update parent notification content through subtype endpoint
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({ paragraphs: 1 }),
    notification_type: "alert",
    status: "sent",
    priority: "high",
  } satisfies IDiscussionBoardSystemNotification.IUpdate;
  const updatedNotification =
    await api.functional.discussionBoard.admin.system_notifications.subtypes.update(
      adminConnection,
      {
        notificationId: notification.id,
        subtypeId: subtype.id,
        body: updateBody,
      },
    );
  typia.assert(updatedNotification);
  // 5. Validate parent notification content was updated
  TestValidator.equals(
    "title updated",
    updatedNotification.title,
    updateBody.title,
  );
  TestValidator.equals(
    "content updated",
    updatedNotification.content,
    updateBody.content,
  );
  TestValidator.equals(
    "notification type updated",
    updatedNotification.notification_type,
    updateBody.notification_type,
  );
  TestValidator.equals(
    "status updated",
    updatedNotification.status,
    updateBody.status,
  );
  TestValidator.equals(
    "priority updated",
    updatedNotification.priority,
    updateBody.priority,
  );
  // 6. Validate parent notification ID remains unchanged
  TestValidator.equals(
    "notification ID unchanged",
    updatedNotification.id,
    notification.id,
  );
}
