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

export async function test_api_admin_system_notification_subtype_mark_as_read(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create parent system notification
  const notification =
    await generate_random_discussion_board_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          notification_type: "announcement",
          status: "sent",
          priority: "normal",
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // Step 3: Create notification subtype for admin
  const subtype =
    await api.functional.discussionBoard.admin.system_notifications.subtypes.createSubtype(
      adminConnection,
      {
        notificationId: notification.id,
        body: {
          actor_type: "admin",
          admin_id: adminAuth.id,
          notification_context: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
      },
    );
  typia.assert(subtype);
  // Step 4: Validate subtype has an ID (instead of checking non-existent notificationId)
  TestValidator.predicate(
    "subtype should have an ID",
    subtype.id !== undefined && subtype.id !== null,
  );
  // Step 5: Mark subtype as read by updating parent notification status
  const updateBody: IDiscussionBoardSystemNotification.IUpdate = {
    status: "read",
  };
  const updatedNotification =
    await api.functional.discussionBoard.admin.system_notifications.subtypes.update(
      adminConnection,
      {
        notificationId: notification.id,
        subtypeId: subtype.id, // Use the subtype ID from the created subtype
        body: updateBody,
      },
    );
  typia.assert(updatedNotification);
  // Step 6: Validate read_at timestamp is set on parent notification
  TestValidator.predicate(
    "read_at timestamp should be set when status is 'read'",
    updatedNotification.read_at !== null,
  );
  // Step 7: Validate idempotent behavior
  const secondUpdate =
    await api.functional.discussionBoard.admin.system_notifications.subtypes.update(
      adminConnection,
      {
        notificationId: notification.id,
        subtypeId: subtype.id,
        body: updateBody,
      },
    );
  typia.assert(secondUpdate);
  TestValidator.equals(
    "read_at timestamp should remain unchanged on subsequent updates",
    updatedNotification.read_at,
    secondUpdate.read_at,
  );
  // Step 8: Validate core notification content remains immutable
  TestValidator.equals(
    "title should remain unchanged",
    updatedNotification.title,
    notification.title,
  );
  TestValidator.equals(
    "content should remain unchanged",
    updatedNotification.content,
    notification.content,
  );
  TestValidator.equals(
    "notification_type should remain unchanged",
    updatedNotification.notification_type,
    notification.notification_type,
  );
}
