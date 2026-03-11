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

export async function test_api_system_notification_platform_governance(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create platform governance notification
  const notification =
    await api.functional.discussionBoard.superAdmin.system_notifications.create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          notification_type: "moderation_action",
          status: "read",
          priority: "normal",
          target_entity_type: null,
          target_entity_id: null,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 days from now
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // Validate notification metadata
  TestValidator.equals(
    "notification type",
    notification.notification_type,
    "moderation_action",
  );
  TestValidator.equals("notification status", notification.status, "read");
  TestValidator.equals(
    "notification priority",
    notification.priority,
    "normal",
  );
  TestValidator.predicate("has UUID id", notification.id.length > 0);
  TestValidator.predicate("has title", notification.title.length > 0);
  TestValidator.predicate("has content", notification.content.length > 0);
  // Validate timestamp fields
  TestValidator.predicate(
    "read_at timestamp set",
    notification.read_at !== null,
  );
  TestValidator.predicate(
    "delivered_at timestamp set",
    notification.delivered_at !== null,
  );
  TestValidator.predicate(
    "expires_at timestamp set",
    notification.expires_at !== null,
  );
  // Validate that read_at is a valid ISO date
  if (notification.read_at !== null) {
    TestValidator.predicate(
      "read_at is valid date",
      !isNaN(new Date(notification.read_at).getTime()),
    );
  }
  // Validate that delivered_at is a valid ISO date
  if (notification.delivered_at !== null) {
    TestValidator.predicate(
      "delivered_at is valid date",
      !isNaN(new Date(notification.delivered_at).getTime()),
    );
  }
  // Validate that expires_at is a valid ISO date
  if (notification.expires_at !== null) {
    TestValidator.predicate(
      "expires_at is valid date",
      !isNaN(new Date(notification.expires_at).getTime()),
    );
  }
  // Test notification with entity targeting
  const targetedNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          notification_type: "moderation_action",
          status: "sent",
          priority: "high",
          target_entity_type: "user",
          target_entity_id: typia.random<string & tags.Format<"uuid">>(),
          expires_at: null, // No expiration
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(targetedNotification);
  // Validate targeted notification
  TestValidator.equals(
    "target entity type",
    targetedNotification.target_entity_type,
    "user",
  );
  TestValidator.predicate(
    "target entity ID is UUID",
    targetedNotification.target_entity_id !== null,
  );
  TestValidator.equals("status is sent", targetedNotification.status, "sent");
  TestValidator.equals(
    "priority is high",
    targetedNotification.priority,
    "high",
  );
  TestValidator.predicate(
    "read_at not set for sent status",
    targetedNotification.read_at === null,
  );
  TestValidator.predicate(
    "delivered_at set for sent status",
    targetedNotification.delivered_at !== null,
  );
  TestValidator.equals("no expiration", targetedNotification.expires_at, null);
}
