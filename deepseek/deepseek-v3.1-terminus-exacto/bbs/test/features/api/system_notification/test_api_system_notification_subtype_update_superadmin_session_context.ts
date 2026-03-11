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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_notifications_create } from "../../../generate/generate_random_discussion_board_super_admin_system_notifications_create";
import { prepare_random_discussion_board_system_notification } from "../../../prepare/prepare_random_discussion_board_system_notification";

export async function test_api_system_notification_subtype_update_superadmin_session_context(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create high-priority system notification
  const notification =
    await generate_random_discussion_board_super_admin_system_notifications_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          notification_type: "announcement",
          status: "pending",
          priority: RandomGenerator.pick(["high", "critical"] as const),
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 1 day from now
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // Create superAdmin notification subtype
  const subtype =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
      superAdminConnection,
      {
        notificationId: notification.id,
        body: {
          actor_type: "superAdmin",
          super_admin_id: superAdmin.id,
        } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
      },
    );
  typia.assert(subtype);
  // Update the notification (not subtype metadata)
  const updatedNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.update(
      superAdminConnection,
      {
        notificationId: notification.id,
        subtypeId: subtype.subtype.id,
        body: {
          title: "Updated " + RandomGenerator.paragraph({ sentences: 1 }),
          content: "Updated " + RandomGenerator.paragraph({ sentences: 3 }),
          status: "sent",
          priority: "normal",
        } satisfies IDiscussionBoardSystemNotification.IUpdate,
      },
    );
  typia.assert(updatedNotification);
  // Validate that superAdmin actor reference is preserved
  TestValidator.equals(
    "superAdmin actor preserved",
    (subtype.subtype as IDiscussionBoardSystemNotificationOfSuperAdmin).superAdmin.id,
    superAdmin.id,
  );
  // Test updating expired notification
  const expiredNotification =
    await generate_random_discussion_board_super_admin_system_notifications_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          notification_type: "alert",
          status: "pending",
          priority: "normal",
          expires_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(expiredNotification);
  const expiredSubtype =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
      superAdminConnection,
      {
        notificationId: expiredNotification.id,
        body: {
          actor_type: "superAdmin",
          super_admin_id: superAdmin.id,
        } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
      },
    );
  typia.assert(expiredSubtype);
  const updatedExpiredNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.update(
      superAdminConnection,
      {
        notificationId: expiredNotification.id,
        subtypeId: expiredSubtype.subtype.id,
        body: {
          status: "archived",
        } satisfies IDiscussionBoardSystemNotification.IUpdate,
      },
    );
  typia.assert(updatedExpiredNotification);
  // Test error cases
  await TestValidator.error(
    "update non-existent subtype",
    async () =>
      await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.update(
        superAdminConnection,
        {
          notificationId: notification.id,
          subtypeId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            status: "read",
          } satisfies IDiscussionBoardSystemNotification.IUpdate,
        },
      ),
  );
  await TestValidator.error(
    "update mismatched notification-subtype",
    async () =>
      await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.update(
        superAdminConnection,
        {
          notificationId: expiredNotification.id,
          subtypeId: subtype.subtype.id, // Wrong subtype for this notification
          body: {
            status: "read",
          } satisfies IDiscussionBoardSystemNotification.IUpdate,
        },
      ),
  );
}