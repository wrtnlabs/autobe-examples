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
 * Test that an administrator can successfully update a system notification with partial field updates,
 * ensuring only provided fields are modified while others remain unchanged.
 */
export async function test_api_system_notification_update_by_administrator(
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
  // 2. Create initial system notification
  const initialNotification =
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
  typia.assert(initialNotification);
  // 3. Perform partial update with selected fields
  const updateData: IDiscussionBoardSystemNotification.IUpdate = {
    title: "Updated Title",
    content: "Updated content for the system notification",
    priority: "high",
    status: "sent",
  };
  const updatedNotification =
    await api.functional.discussionBoard.admin.system_notifications.update(
      adminConnection,
      {
        notificationId: initialNotification.id,
        body: updateData,
      },
    );
  typia.assert(updatedNotification);
  // 4. Validate that only provided fields are updated
  TestValidator.equals(
    "title should be updated",
    updatedNotification.title,
    "Updated Title",
  );
  TestValidator.equals(
    "content should be updated",
    updatedNotification.content,
    "Updated content for the system notification",
  );
  TestValidator.equals(
    "priority should be updated",
    updatedNotification.priority,
    "high",
  );
  TestValidator.equals(
    "status should be updated",
    updatedNotification.status,
    "sent",
  );
  // 5. Verify unchanged fields remain the same
  TestValidator.equals(
    "notification ID remains unchanged",
    updatedNotification.id,
    initialNotification.id,
  );
  TestValidator.equals(
    "notification type remains unchanged",
    updatedNotification.notification_type,
    initialNotification.notification_type,
  );
  TestValidator.equals(
    "target entity type remains unchanged",
    updatedNotification.target_entity_type,
    initialNotification.target_entity_type,
  );
  TestValidator.equals(
    "target entity ID remains unchanged",
    updatedNotification.target_entity_id,
    initialNotification.target_entity_id,
  );
  TestValidator.equals(
    "expires at remains unchanged",
    updatedNotification.expires_at,
    initialNotification.expires_at,
  );
  // 6. Validate business logic constraints
  TestValidator.predicate(
    "priority should be valid value",
    ["low", "normal", "high", "critical"].includes(
      updatedNotification.priority,
    ),
  );
  TestValidator.predicate(
    "status should be valid value",
    ["pending", "sent", "read", "archived"].includes(
      updatedNotification.status,
    ),
  );
}
