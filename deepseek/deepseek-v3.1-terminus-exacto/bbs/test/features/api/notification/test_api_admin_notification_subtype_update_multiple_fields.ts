import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMemberNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberNotificationPreference";
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

export async function test_api_admin_notification_subtype_update_multiple_fields(
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
  // Create a system notification
  const notification =
    await generate_random_discussion_board_admin_system_notifications_create(
      adminConnection,
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
  // Prepare comprehensive subtype update payload
  const currentTime = new Date().toISOString();
  const updatePayload: IDiscussionBoardSystemNotification.ISubtypeUpdate = {
    readAt: currentTime,
    deliveredAt: currentTime,
    preferences: {
      delivery_method: "push",
      frequency: "immediate",
      display_preference: "banner",
    } satisfies IDiscussionBoardMemberNotificationPreference,
  };
  // Update notification subtypes
  const updatedNotification =
    await api.functional.discussionBoard.admin.system_notifications.subtypes.updateSubtypes(
      adminConnection,
      {
        notificationId: notification.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedNotification);
  // Validate successful subtype update operation
  TestValidator.predicate(
    "subtype update completed successfully",
    updatedNotification !== null,
  );
}
