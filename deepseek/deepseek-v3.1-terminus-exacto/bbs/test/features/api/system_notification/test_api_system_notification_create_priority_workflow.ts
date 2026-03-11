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

export async function test_api_system_notification_create_priority_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test notification types and priorities
  const notificationTypes = [
    "announcement",
    "alert",
    "status_update",
    "moderation_action",
    "personal_message",
  ] as const;
  const priorities = ["low", "normal", "high", "critical"] as const;
  const statuses = ["pending", "sent", "read", "archived"] as const;
  // Create notifications with different priority levels
  for (const priority of priorities) {
    for (const notificationType of notificationTypes) {
      for (const status of statuses) {
        const notification =
          await generate_random_discussion_board_admin_system_notifications_create(
            adminConnection,
            {
              body: {
                title: RandomGenerator.paragraph({ sentences: 2 }),
                content: RandomGenerator.content({ paragraphs: 2 }),
                notification_type: notificationType,
                status: status,
                priority: priority,
                target_entity_type: null,
                target_entity_id: null,
                expires_at:
                  status === "archived"
                    ? new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
                    : null,
              } satisfies IDiscussionBoardSystemNotification.ICreate,
            },
          );
        typia.assert(notification);
        // Validate priority-specific behavior
        TestValidator.equals(
          `${priority} priority notification created`,
          notification.priority,
          priority,
        );
        TestValidator.equals(
          `${notificationType} type notification created`,
          notification.notification_type,
          notificationType,
        );
        TestValidator.equals(
          `${status} status notification created`,
          notification.status,
          status,
        );
        // Validate timestamp logic based on status
        if (status === "sent" || status === "read") {
          TestValidator.predicate(
            `${status} status should have delivered_at timestamp`,
            notification.delivered_at !== null,
          );
        } else {
          TestValidator.predicate(
            `${status} status should not have delivered_at timestamp`,
            notification.delivered_at === null,
          );
        }
        if (status === "read") {
          TestValidator.predicate(
            "read status should have read_at timestamp",
            notification.read_at !== null,
          );
        } else {
          TestValidator.predicate(
            "non-read status should not have read_at timestamp",
            notification.read_at === null,
          );
        }
        // Test critical priority gets immediate processing
        if (priority === "critical") {
          TestValidator.predicate(
            "critical priority notification should be processed",
            notification.status === "sent" || notification.status === "read",
          );
        }
      }
    }
  }
  // Test edge cases: special character content
  const specialContentNotification =
    await generate_random_discussion_board_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          title: "Special Characters: !@#$%^&*()",
          content: "Content with special chars: <>{}[]|\\/~`'",
          notification_type: "alert",
          status: "sent",
          priority: "high",
          target_entity_type: null,
          target_entity_id: null,
          expires_at: null,
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(specialContentNotification);
  // Test expired notification
  const expiredNotification =
    await generate_random_discussion_board_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          title: "Expired Notification",
          content: "This notification expired in the past",
          notification_type: "announcement",
          status: "pending",
          priority: "low",
          target_entity_type: null,
          target_entity_id: null,
          expires_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(expiredNotification);
  TestValidator.predicate(
    "expired notification should have expires_at in past",
    expiredNotification.expires_at !== null &&
      new Date(expiredNotification.expires_at) < new Date(),
  );
}
