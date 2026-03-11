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

/**
 * Test that a super administrator can successfully retrieve a system notification they created.
 * 1. Authenticate as super admin
 * 2. Create a system notification
 * 3. Retrieve the notification by ID
 * 4. Validate all fields match
 */
export async function test_api_system_notification_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Create a system notification
  const notificationData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({ paragraphs: 1 }),
    notification_type: "announcement",
    status: "pending",
    priority: "normal",
    target_entity_type: null,
    target_entity_id: null,
    expires_at: null,
  } satisfies IDiscussionBoardSystemNotification.ICreate;
  const createdNotification =
    await generate_random_discussion_board_super_admin_system_notifications_create(
      superAdminConnection,
      {
        body: notificationData,
      },
    );
  typia.assert(createdNotification);
  // Retrieve the notification by ID
  const retrievedNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.at(
      superAdminConnection,
      {
        notificationId: createdNotification.id,
      },
    );
  typia.assert(retrievedNotification);
  // Validate all fields match
  TestValidator.equals(
    "notification ID",
    retrievedNotification.id,
    createdNotification.id,
  );
  TestValidator.equals(
    "notification title",
    retrievedNotification.title,
    notificationData.title,
  );
  TestValidator.equals(
    "notification content",
    retrievedNotification.content,
    notificationData.content,
  );
  TestValidator.equals(
    "notification type",
    retrievedNotification.notification_type,
    notificationData.notification_type,
  );
  TestValidator.equals(
    "notification status",
    retrievedNotification.status,
    notificationData.status,
  );
  TestValidator.equals(
    "notification priority",
    retrievedNotification.priority,
    notificationData.priority,
  );
  TestValidator.equals(
    "target entity type",
    retrievedNotification.target_entity_type,
    notificationData.target_entity_type,
  );
  TestValidator.equals(
    "target entity ID",
    retrievedNotification.target_entity_id,
    notificationData.target_entity_id,
  );
  TestValidator.equals(
    "expires at",
    retrievedNotification.expires_at,
    notificationData.expires_at,
  );
}
