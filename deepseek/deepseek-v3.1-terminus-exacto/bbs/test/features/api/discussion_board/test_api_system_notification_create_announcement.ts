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

export async function test_api_system_notification_create_announcement(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as admin using utility function
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create system notification with announcement type
  const notificationBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({ paragraphs: 1 }),
    notification_type: "announcement",
    status: "pending",
    priority: "normal",
    target_entity_type: null,
    target_entity_id: null,
    expires_at: null,
  } satisfies IDiscussionBoardSystemNotification.ICreate;
  const notification =
    await api.functional.discussionBoard.admin.system_notifications.create(
      adminConnection,
      { body: notificationBody },
    );
  typia.assert(notification);
  // Validate notification creation
  TestValidator.equals(
    "notification type",
    notification.notification_type,
    "announcement",
  );
  TestValidator.equals("notification status", notification.status, "pending");
  TestValidator.equals(
    "notification priority",
    notification.priority,
    "normal",
  );
  TestValidator.equals(
    "notification title",
    notification.title,
    notificationBody.title,
  );
  TestValidator.equals(
    "notification content",
    notification.content,
    notificationBody.content,
  );
  TestValidator.equals(
    "target entity type",
    notification.target_entity_type,
    null,
  );
  TestValidator.equals("target entity id", notification.target_entity_id, null);
  TestValidator.equals("expires at", notification.expires_at, null);
  // Validate delivery status for pending notification
  TestValidator.equals(
    "delivered_at should be null for pending",
    notification.delivered_at,
    null,
  );
  TestValidator.equals(
    "read_at should be null for pending",
    notification.read_at,
    null,
  );
}
