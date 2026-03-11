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

export async function test_api_system_notifications_update_subtype_preferences_with_target_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create targeted notification with entity references
  const notification =
    await generate_random_discussion_board_super_admin_system_notifications_create(
      superAdminConnection,
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
          status: "pending",
          priority: RandomGenerator.pick([
            "low",
            "normal",
            "high",
            "critical",
          ] as const),
          target_entity_type: "admin_request",
          target_entity_id: typia.random<string & tags.Format<"uuid">>(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // 3. Update subtype preferences with valid settings
  const subtypeUpdate: IDiscussionBoardSystemNotification.ISubtypeUpdate = {
    readAt: null,
    deliveredAt: new Date().toISOString(),
    preferences: {
      setting1: "value1",
      setting2: "value2",
    } satisfies IDiscussionBoardMemberNotificationPreference,
  };
  const updatedNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.updateSubtypes(
      superAdminConnection,
      {
        notificationId: notification.id,
        body: subtypeUpdate,
      },
    );
  typia.assert(updatedNotification);
  // 4. Validate that target entity references are preserved
  TestValidator.equals(
    "notification ID remains consistent",
    updatedNotification.id,
    notification.id,
  );
  TestValidator.equals(
    "target entity type preserved",
    updatedNotification.target_entity_type,
    "admin_request",
  );
  TestValidator.equals(
    "target entity ID preserved",
    updatedNotification.target_entity_id,
    notification.target_entity_id,
  );
  TestValidator.equals(
    "notification type preserved",
    updatedNotification.notification_type,
    notification.notification_type,
  );
  TestValidator.equals(
    "priority level preserved",
    updatedNotification.priority,
    notification.priority,
  );
  // 5. Validate that core notification properties remain unchanged
  TestValidator.equals(
    "title preserved",
    updatedNotification.title,
    notification.title,
  );
  TestValidator.equals(
    "content preserved",
    updatedNotification.content,
    notification.content,
  );
  TestValidator.predicate(
    "expiration timestamp valid",
    updatedNotification.expires_at !== null,
  );
}
