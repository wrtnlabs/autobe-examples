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

export async function test_api_system_notification_entity_targeting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create system notification with entity targeting using utility function
  const notification =
    await generate_random_discussion_board_super_admin_system_notifications_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          notification_type: "status_update",
          status: "sent",
          priority: "high",
          target_entity_type: "article",
          target_entity_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // 3. Validate entity targeting fields
  TestValidator.equals(
    "target_entity_type should be 'article'",
    notification.target_entity_type,
    "article",
  );
  TestValidator.predicate(
    "target_entity_id should be valid UUID",
    notification.target_entity_id !== null,
  );
  // 4. Validate delivery status fields
  TestValidator.predicate(
    "delivered_at should be set when status is 'sent'",
    notification.delivered_at !== null,
  );
  TestValidator.predicate(
    "read_at should be null for unread notification",
    notification.read_at === null,
  );
  TestValidator.equals("status should be 'sent'", notification.status, "sent");
  TestValidator.equals(
    "priority should be 'high'",
    notification.priority,
    "high",
  );
  TestValidator.equals(
    "notification_type should be 'status_update'",
    notification.notification_type,
    "status_update",
  );
}
