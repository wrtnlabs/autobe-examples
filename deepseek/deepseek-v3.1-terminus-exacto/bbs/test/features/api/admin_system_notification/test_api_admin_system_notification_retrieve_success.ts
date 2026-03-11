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
 * Test successful retrieval of a system notification by an administrator.
 * 1. Create admin account through admin join endpoint
 * 2. Create a system notification using admin create notification endpoint
 * 3. Retrieve notification by ID with valid admin authentication
 * 4. Validate all notification fields match the created data
 */
export async function test_api_admin_system_notification_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and establish authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a system notification
  const notificationCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.paragraph({ sentences: 5 }),
    notification_type: RandomGenerator.pick([
      "announcement",
      "alert",
      "status_update",
      "moderation_action",
      "personal_message",
    ] as const),
    status: RandomGenerator.pick([
      "pending",
      "sent",
      "read",
      "archived",
    ] as const),
    priority: RandomGenerator.pick([
      "low",
      "normal",
      "high",
      "critical",
    ] as const),
  } satisfies IDiscussionBoardSystemNotification.ICreate;
  const createdNotification =
    await generate_random_discussion_board_admin_system_notifications_create(
      adminConnection,
      {
        body: notificationCreateBody,
      },
    );
  typia.assert(createdNotification);
  // 3. Retrieve the notification by ID
  const retrievedNotification =
    await api.functional.discussionBoard.admin.system_notifications.at(
      adminConnection,
      {
        notificationId: createdNotification.id,
      },
    );
  typia.assert(retrievedNotification);
  // 4. Validate that all fields match
  TestValidator.equals(
    "notification ID",
    retrievedNotification.id,
    createdNotification.id,
  );
  TestValidator.equals(
    "notification title",
    retrievedNotification.title,
    createdNotification.title,
  );
  TestValidator.equals(
    "notification content",
    retrievedNotification.content,
    createdNotification.content,
  );
  TestValidator.equals(
    "notification type",
    retrievedNotification.notification_type,
    createdNotification.notification_type,
  );
  TestValidator.equals(
    "notification status",
    retrievedNotification.status,
    createdNotification.status,
  );
  TestValidator.equals(
    "notification priority",
    retrievedNotification.priority,
    createdNotification.priority,
  );
  TestValidator.equals(
    "target entity type",
    retrievedNotification.target_entity_type,
    createdNotification.target_entity_type,
  );
  TestValidator.equals(
    "target entity ID",
    retrievedNotification.target_entity_id,
    createdNotification.target_entity_id,
  );
  TestValidator.equals(
    "expires at",
    retrievedNotification.expires_at,
    createdNotification.expires_at,
  );
  // Validate timestamp fields exist (can be null)
  TestValidator.predicate(
    "has delivered_at field",
    retrievedNotification.delivered_at !== undefined,
  );
  TestValidator.predicate(
    "has read_at field",
    retrievedNotification.read_at !== undefined,
  );
  // Validate business logic: admin can retrieve notification they created
  TestValidator.predicate(
    "admin can retrieve created notification",
    retrievedNotification.id === createdNotification.id,
  );
}
