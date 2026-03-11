import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMemberNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberNotificationPreference";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_notifications_create } from "../../../generate/generate_random_discussion_board_super_admin_system_notifications_create";
import { prepare_random_discussion_board_system_notification } from "../../../prepare/prepare_random_discussion_board_system_notification";

export async function test_api_system_notifications_update_subtype_delivery_status(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create a system notification
  const notification =
    await generate_random_discussion_board_super_admin_system_notifications_create(
      superAdminConnection,
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
  // Update subtype delivery status
  const updatedNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.updateSubtypes(
      superAdminConnection,
      {
        notificationId: notification.id,
        body: {
          readAt: new Date().toISOString(),
          deliveredAt: new Date().toISOString(),
          preferences: {
            delivery_method: "in_app",
            frequency: "immediate",
          } satisfies IDiscussionBoardMemberNotificationPreference,
        } satisfies IDiscussionBoardSystemNotification.ISubtypeUpdate,
      },
    );
  typia.assert(updatedNotification);
  // Validate that the notification was returned correctly
  TestValidator.equals(
    "notification ID matches",
    updatedNotification.id,
    notification.id,
  );
  TestValidator.equals(
    "title remains unchanged",
    updatedNotification.title,
    notification.title,
  );
  TestValidator.equals(
    "content remains unchanged",
    updatedNotification.content,
    notification.content,
  );
}
