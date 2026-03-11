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

export async function test_api_system_notification_critical_announcement(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using join
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(superAdmin);
  // Create a critical system announcement using utility function
  const notificationBody: IDiscussionBoardSystemNotification.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({ paragraphs: 3 }),
    notification_type: "announcement",
    status: "pending",
    priority: "critical",
    target_entity_type: null,
    target_entity_id: null,
    expires_at: null,
  };
  const notification =
    await generate_random_discussion_board_super_admin_system_notifications_create(
      superAdminConnection,
      { body: notificationBody },
    );
  typia.assert(notification);
  // Validate notification creation
  TestValidator.equals(
    "notification title matches input",
    notification.title,
    notificationBody.title,
  );
  TestValidator.equals(
    "notification content matches input",
    notification.content,
    notificationBody.content,
  );
  TestValidator.equals(
    "notification type is announcement",
    notification.notification_type,
    "announcement",
  );
  TestValidator.equals(
    "notification status is pending",
    notification.status,
    "pending",
  );
  TestValidator.equals(
    "notification priority is critical",
    notification.priority,
    "critical",
  );
  TestValidator.equals(
    "target entity type is null",
    notification.target_entity_type,
    null,
  );
  TestValidator.equals(
    "target entity id is null",
    notification.target_entity_id,
    null,
  );
  TestValidator.equals("expires at is null", notification.expires_at, null);
  TestValidator.equals(
    "delivered at is null for pending status",
    notification.delivered_at,
    null,
  );
  TestValidator.equals(
    "read at is null for pending status",
    notification.read_at,
    null,
  );
}
