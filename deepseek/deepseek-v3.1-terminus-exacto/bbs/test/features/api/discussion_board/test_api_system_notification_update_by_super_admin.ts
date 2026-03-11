import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_system_notification_update_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create initial system notification with random data
  const initialNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.create(
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
  typia.assert(initialNotification);
  // Store original values for comparison
  const originalNotificationType = initialNotification.notification_type;
  const originalTargetEntityType = initialNotification.target_entity_type;
  const originalTargetEntityId = initialNotification.target_entity_id;
  const originalExpiresAt = initialNotification.expires_at;
  // Update notification with modified fields
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({ paragraphs: 1 }),
    priority: "high",
    status: "sent",
  } satisfies IDiscussionBoardSystemNotification.IUpdate;
  const updatedNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.update(
      superAdminConnection,
      {
        notificationId: initialNotification.id,
        body: updateBody,
      },
    );
  typia.assert(updatedNotification);
  // Validate updated fields
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
    "priority updated",
    updatedNotification.priority,
    updateBody.priority,
  );
  TestValidator.equals(
    "status updated",
    updatedNotification.status,
    updateBody.status,
  );
  // Validate unchanged fields
  TestValidator.equals(
    "notification_type unchanged",
    updatedNotification.notification_type,
    originalNotificationType,
  );
  TestValidator.equals(
    "target_entity_type unchanged",
    updatedNotification.target_entity_type,
    originalTargetEntityType,
  );
  TestValidator.equals(
    "target_entity_id unchanged",
    updatedNotification.target_entity_id,
    originalTargetEntityId,
  );
  TestValidator.equals(
    "expires_at unchanged",
    updatedNotification.expires_at,
    originalExpiresAt,
  );
  // Validate ID remains the same
  TestValidator.equals(
    "notification ID unchanged",
    updatedNotification.id,
    initialNotification.id,
  );
}
