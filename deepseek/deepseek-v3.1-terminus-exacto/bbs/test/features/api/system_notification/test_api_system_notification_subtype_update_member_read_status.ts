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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_notifications_create } from "../../../generate/generate_random_discussion_board_super_admin_system_notifications_create";
import { prepare_random_discussion_board_system_notification } from "../../../prepare/prepare_random_discussion_board_system_notification";

/**
 * Test updating a member notification subtype to mark it as read.
 * 1. Create superAdmin session
 * 2. Create system notification
 * 3. Create member notification subtype
 * 4. Update subtype read status
 * 5. Validate update results
 * 6. Test idempotency
 */
export async function test_api_system_notification_subtype_update_member_read_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create system notification
  const notification =
    await generate_random_discussion_board_super_admin_system_notifications_create(
      superAdminConnection,
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
  // 3. Create member notification subtype
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const subtype =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
      superAdminConnection,
      {
        notificationId: notification.id,
        body: {
          actor_type: "member",
          member_id: memberId,
        } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
      },
    );
  typia.assert(subtype);
  // 4. Update subtype to mark as read - update the parent notification status
  const updateBody: IDiscussionBoardSystemNotification.IUpdate = {
    status: "read",
  };
  const updatedNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.update(
      superAdminConnection,
      {
        notificationId: notification.id,
        subtypeId: subtype.subtype.id,
        body: updateBody,
      },
    );
  typia.assert(updatedNotification);
  // 5. Validate update results
  TestValidator.equals(
    "notification status should be updated to read",
    updatedNotification.status,
    "read",
  );
  TestValidator.predicate(
    "read_at timestamp should be set",
    updatedNotification.read_at !== null,
  );
  // 6. Test idempotency - make same update again
  const secondUpdate =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.update(
      superAdminConnection,
      {
        notificationId: notification.id,
        subtypeId: subtype.subtype.id,
        body: updateBody,
      },
    );
  typia.assert(secondUpdate);
  // Validate idempotency - should get same result
  TestValidator.equals(
    "idempotent update should return same status",
    secondUpdate.status,
    "read",
  );
  TestValidator.equals(
    "idempotent update should preserve read_at timestamp",
    secondUpdate.read_at,
    updatedNotification.read_at,
  );
}
