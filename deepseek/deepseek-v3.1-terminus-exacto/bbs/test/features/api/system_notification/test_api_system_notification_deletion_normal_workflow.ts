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
 * Test a normal deletion workflow where a super administrator creates a system notification
 * and then successfully deletes it.
 */
export async function test_api_system_notification_deletion_normal_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a system notification using SDK function (utility function not available)
  const notification =
    await api.functional.discussionBoard.superAdmin.system_notifications.create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          notification_type: RandomGenerator.pick([
            "announcement",
            "alert",
            "status_update",
            "moderation_action",
            "personal_message",
          ] as const),
          status: "pending",
          priority: RandomGenerator.pick([
            "low",
            "normal",
            "high",
            "critical",
          ] as const),
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // Verify the notification exists after creation
  TestValidator.predicate(
    "notification created successfully",
    notification.id !== undefined,
  );
  // Perform deletion using the notificationId
  await api.functional.discussionBoard.superAdmin.system_notifications.erase(
    superAdminConnection,
    {
      notificationId: notification.id,
    },
  );
  // Validate successful deletion by attempting to delete again (should fail with appropriate error)
  await TestValidator.error(
    "deleted notification cannot be deleted again",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_notifications.erase(
        superAdminConnection,
        {
          notificationId: notification.id,
        },
      );
    },
  );
  // Note: The operation specification indicates that deletion is permanent and irreversible,
  // and all associated subtype records are cleaned up automatically
}
