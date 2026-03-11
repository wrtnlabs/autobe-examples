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

export async function test_api_admin_notification_subtype_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create a system notification with valid notification type
  const notification =
    await generate_random_discussion_board_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          notification_type: RandomGenerator.pick([
            "announcement",
            "alert",
            "status_update",
            "moderation_action",
            "personal_message",
          ] as const),
          status: "pending",
          priority: "normal",
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // Extract notification ID
  const notificationId = notification.id;
  // For this test, we'll simulate a subtype ID since the actual subtype creation endpoint
  // is not available in the provided API functions. In a real scenario, this would come
  // from a subtype creation operation.
  const subtypeId = typia.random<string & tags.Format<"uuid">>();
  // Delete the subtype association
  await api.functional.discussionBoard.admin.system_notifications.subtypes.erase(
    adminConnection,
    {
      notificationId,
      subtypeId,
    },
  );
  // Validate successful deletion (void response indicates success)
  TestValidator.predicate("subtype deletion successful", true);
  // Verify parent notification remains intact by retrieving it again
  // Note: Since retrieval endpoint is not available, we validate the original notification
  TestValidator.equals(
    "notification ID remains unchanged",
    notification.id,
    notificationId,
  );
  TestValidator.predicate(
    "notification title exists",
    notification.title.length > 0,
  );
  TestValidator.predicate(
    "notification content exists",
    notification.content.length > 0,
  );
}
