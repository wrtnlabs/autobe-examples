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

export async function test_api_system_notification_partial_update_content_priority(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create initial notification with full content
  const initialNotification =
    await generate_random_discussion_board_super_admin_system_notifications_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.paragraph({ sentences: 3 }),
          notification_type: "announcement",
          status: "pending",
          priority: "normal",
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(initialNotification);
  // 3. Perform partial update - only change content and priority
  const updatedNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.update(
      superAdminConnection,
      {
        notificationId: initialNotification.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
          priority: "high",
        } satisfies IDiscussionBoardSystemNotification.IUpdate,
      },
    );
  typia.assert(updatedNotification);
  // 4. Validate partial update semantics
  TestValidator.equals(
    "notification ID remains unchanged",
    updatedNotification.id,
    initialNotification.id,
  );
  TestValidator.equals(
    "title remains unchanged",
    updatedNotification.title,
    initialNotification.title,
  );
  TestValidator.notEquals(
    "content is updated",
    updatedNotification.content,
    initialNotification.content,
  );
  TestValidator.equals(
    "notification_type remains unchanged",
    updatedNotification.notification_type,
    initialNotification.notification_type,
  );
  TestValidator.equals(
    "status remains unchanged",
    updatedNotification.status,
    initialNotification.status,
  );
  TestValidator.equals(
    "priority is updated to high",
    updatedNotification.priority,
    "high",
  );
  TestValidator.equals(
    "target_entity_type remains unchanged",
    updatedNotification.target_entity_type,
    initialNotification.target_entity_type,
  );
  TestValidator.equals(
    "target_entity_id remains unchanged",
    updatedNotification.target_entity_id,
    initialNotification.target_entity_id,
  );
  TestValidator.equals(
    "expires_at remains unchanged",
    updatedNotification.expires_at,
    initialNotification.expires_at,
  );
}
