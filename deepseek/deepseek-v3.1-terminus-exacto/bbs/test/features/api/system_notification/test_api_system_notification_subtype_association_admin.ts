import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import type { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import type { IDiscussionBoardSystemNotificationOfAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotificationOfAdmin";
import type { IDiscussionBoardSystemNotificationOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotificationOfMember";
import type { IDiscussionBoardSystemNotificationOfSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotificationOfSuperAdmin";
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

export async function test_api_system_notification_subtype_association_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // Create parent system notification
  const notification =
    await api.functional.discussionBoard.admin.system_notifications.create(
      adminConnection,
      {
        body: {
          title: "Platform Maintenance Announcement",
          content: "Scheduled maintenance on Sunday",
          notification_type: "announcement",
          status: "pending",
          priority: "normal",
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // Create admin subtype association
  const subtypeResponse =
    await api.functional.discussionBoard.admin.system_notifications.subtypes.createSubtype(
      adminConnection,
      {
        notificationId: notification.id,
        body: {
          actor_type: "admin",
          admin_id: adminAuth.id,
          notification_context: "Admin coordination required",
        } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
      },
    );
  typia.assert(subtypeResponse);
  // Validate response structure
  TestValidator.equals(
    "notification id matches",
    subtypeResponse.id,
    notification.id,
  );
  TestValidator.equals(
    "title matches",
    subtypeResponse.title,
    "Platform Maintenance Announcement",
  );
  TestValidator.equals(
    "content matches",
    subtypeResponse.content,
    "Scheduled maintenance on Sunday",
  );
  TestValidator.equals(
    "notification type matches",
    subtypeResponse.notification_type,
    "announcement",
  );
  TestValidator.equals("status matches", subtypeResponse.status, "pending");
  TestValidator.equals("priority matches", subtypeResponse.priority, "normal");
  // Validate subtype structure
  TestValidator.predicate(
    "subtype exists",
    () => subtypeResponse.subtype !== undefined,
  );
  TestValidator.predicate(
    "subtype is admin type",
    () =>
      "admin" in subtypeResponse.subtype &&
      "notification_context" in subtypeResponse.subtype,
  );
  const adminSubtype =
    subtypeResponse.subtype as IDiscussionBoardSystemNotificationOfAdmin;
  TestValidator.equals("admin id matches", adminSubtype.admin.id, adminAuth.id);
  TestValidator.equals(
    "admin email matches",
    adminSubtype.admin.email,
    adminAuth.email,
  );
  TestValidator.equals(
    "notification context matches",
    adminSubtype.notification_context,
    "Admin coordination required",
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at is valid",
    () => new Date(subtypeResponse.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    () => new Date(subtypeResponse.updated_at).getTime() > 0,
  );
}
