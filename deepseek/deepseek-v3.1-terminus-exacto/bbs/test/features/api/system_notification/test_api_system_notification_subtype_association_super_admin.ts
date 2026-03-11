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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_system_notifications_create } from "../../../generate/generate_random_discussion_board_admin_system_notifications_create";
import { prepare_random_discussion_board_system_notification } from "../../../prepare/prepare_random_discussion_board_system_notification";

export async function test_api_system_notification_subtype_association_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Step 2: Create super admin account needed for subtype association
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Step 3: Create parent system notification
  const notification =
    await generate_random_discussion_board_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          notification_type: "alert",
          status: "pending",
          priority: "high",
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // Step 4: Create super admin subtype association
  const subtypeBody = {
    actor_type: "superAdmin" as const,
    super_admin_id: superAdmin.id,
    session_context: JSON.stringify({
      ip: "192.168.1.1",
      user_agent: "Test Agent",
      timestamp: new Date().toISOString(),
    }),
  } satisfies IDiscussionBoardSystemNotification.ICreateSubtype;
  const subtype =
    await api.functional.discussionBoard.admin.system_notifications.subtypes.createSubtype(
      adminConnection,
      {
        notificationId: notification.id,
        body: subtypeBody,
      },
    );
  typia.assert(subtype);
  // Step 5: Validate subtype properties
  TestValidator.equals("notification id matches", subtype.id, notification.id);
  TestValidator.equals("title matches", subtype.title, notification.title);
  TestValidator.equals(
    "content matches",
    subtype.content,
    notification.content,
  );
  TestValidator.equals(
    "notification type matches",
    subtype.notification_type,
    notification.notification_type,
  );
  TestValidator.equals(
    "priority matches",
    subtype.priority,
    notification.priority,
  );
  // Step 6: Validate super admin subtype association
  TestValidator.predicate(
    "should have subtype property",
    () => subtype.subtype !== undefined,
  );
  // Validate the subtype is for super admin
  TestValidator.predicate(
    "subtype should be super admin type",
    () => "superAdmin" in subtype.subtype,
  );
  const superAdminSubtype =
    subtype.subtype as IDiscussionBoardSystemNotificationOfSuperAdmin;
  TestValidator.equals(
    "super admin id matches",
    superAdminSubtype.superAdmin.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "super admin email matches",
    superAdminSubtype.superAdmin.email,
    superAdmin.email,
  );
  // Step 7: Validate session context when provided
  TestValidator.predicate(
    "session context should be recorded",
    () => superAdminSubtype.superAdminSession !== null,
  );
  // Step 8: Validate polymorphic ownership relationship
  TestValidator.predicate(
    "should have system notification summary",
    () => superAdminSubtype.systemNotification !== undefined,
  );
  TestValidator.equals(
    "system notification id matches",
    superAdminSubtype.systemNotification.id,
    notification.id,
  );
}
