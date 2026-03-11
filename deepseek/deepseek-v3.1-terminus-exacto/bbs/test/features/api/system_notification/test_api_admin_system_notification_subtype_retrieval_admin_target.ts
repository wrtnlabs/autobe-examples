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

/**
 * Test successful retrieval of an admin-specific notification subtype by an authenticated administrator.
 *
 * This test validates that administrators can successfully retrieve detailed information
 * about admin-specific notification subtypes for compliance monitoring and audit trail purposes.
 */
export async function test_api_admin_system_notification_subtype_retrieval_admin_target(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up authentication as an admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a system notification
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
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // 3. Create an admin-specific subtype
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
  
  // Narrow the subtype to admin-specific subtype since we created an admin subtype
  const adminSubtype = typia.assert<IDiscussionBoardSystemNotificationOfAdmin>(subtype.subtype);
  
  // 4. Retrieve the admin-specific subtype
  const retrievedSubtype =
    await api.functional.discussionBoard.admin.system_notifications.subtypes.at(
      adminConnection,
      {
        notificationId: notification.id,
        subtypeId: adminSubtype.id,
      },
    );
  typia.assert(retrievedSubtype);
  
  // Narrow the type to admin-specific subtype since we know this is an admin notification
  const adminRetrievedSubtype = typia.assert<IDiscussionBoardSystemNotificationOfAdmin>(retrievedSubtype);
  
  // 5. Validate response structure and content
  TestValidator.equals(
    "subtype ID matches",
    adminRetrievedSubtype.id,
    adminSubtype.id,
  );
  TestValidator.equals(
    "notification context matches",
    adminRetrievedSubtype.notification_context,
    adminSubtype.notification_context,
  );
  TestValidator.equals(
    "system notification ID matches",
    adminRetrievedSubtype.systemNotification.id,
    notification.id,
  );
  TestValidator.equals(
    "admin ID matches",
    adminRetrievedSubtype.admin.id,
    adminAuth.id,
  );
  TestValidator.predicate(
    "created_at is populated",
    adminRetrievedSubtype.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is populated",
    adminRetrievedSubtype.updated_at !== null,
  );
  TestValidator.predicate(
    "timestamps are valid",
    new Date(adminRetrievedSubtype.created_at) <=
      new Date(adminRetrievedSubtype.updated_at),
  );
}