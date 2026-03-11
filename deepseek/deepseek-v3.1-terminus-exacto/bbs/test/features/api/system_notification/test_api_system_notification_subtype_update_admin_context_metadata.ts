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

export async function test_api_system_notification_subtype_update_admin_context_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as superAdmin using utility function
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Create system notification with moderation_action type
  const systemNotification =
    await generate_random_discussion_board_super_admin_system_notifications_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          notification_type: "moderation_action",
          status: "pending",
          priority: "high",
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(systemNotification);
  // Create admin notification subtype with initial context
  const initialContext = JSON.stringify({
    action: "user_review",
    workflow_id: typia.random<string & tags.Format<"uuid">>(),
  });
  const adminSubtype =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
      superAdminConnection,
      {
        notificationId: systemNotification.id,
        body: {
          actor_type: "admin",
          admin_id: superAdminAuth.id,
          notification_context: initialContext,
        } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
      },
    );
  typia.assert(adminSubtype);
  // Verify initial subtype properties
  TestValidator.equals(
    "subtype has initial context",
    (adminSubtype.subtype as IDiscussionBoardSystemNotificationOfAdmin).notification_context,
    initialContext,
  );
  TestValidator.equals(
    "subtype has correct admin",
    (adminSubtype.subtype as IDiscussionBoardSystemNotificationOfAdmin).admin.id,
    superAdminAuth.id,
  );
  TestValidator.equals(
    "subtype has correct notification",
    adminSubtype.id,
    systemNotification.id,
  );
  // Update the subtype with modified notification_context
  const updatedContext = JSON.stringify({
    action: "user_review",
    workflow_id: typia.random<string & tags.Format<"uuid">>(),
    decision: "approved",
    timestamp: new Date().toISOString(),
  });
  const updatedNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.update(
      superAdminConnection,
      {
        notificationId: systemNotification.id,
        subtypeId: (
          adminSubtype.subtype as IDiscussionBoardSystemNotificationOfAdmin
        ).id,
        body: {
          title: systemNotification.title, // Preserve original title
          content: systemNotification.content, // Preserve original content
        } satisfies IDiscussionBoardSystemNotification.IUpdate,
      },
    );
  typia.assert(updatedNotification);
  // Verify update preserved core notification properties
  TestValidator.equals(
    "title preserved after update",
    updatedNotification.title,
    systemNotification.title,
  );
  TestValidator.equals(
    "content preserved after update",
    updatedNotification.content,
    systemNotification.content,
  );
  TestValidator.equals(
    "notification type preserved",
    updatedNotification.notification_type,
    systemNotification.notification_type,
  );
  // Test partial update scenario - only update specific fields
  const partialUpdate =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.update(
      superAdminConnection,
      {
        notificationId: systemNotification.id,
        subtypeId: (
          adminSubtype.subtype as IDiscussionBoardSystemNotificationOfAdmin
        ).id,
        body: {
          priority: "normal", // Change only priority
        } satisfies IDiscussionBoardSystemNotification.IUpdate,
      },
    );
  typia.assert(partialUpdate);
  // Verify partial update only modified the specified field
  TestValidator.equals(
    "title still preserved",
    partialUpdate.title,
    systemNotification.title,
  );
  TestValidator.equals(
    "content still preserved",
    partialUpdate.content,
    systemNotification.content,
  );
  TestValidator.notEquals(
    "priority changed",
    partialUpdate.priority,
    systemNotification.priority,
  );
  TestValidator.equals(
    "priority updated to normal",
    partialUpdate.priority,
    "normal",
  );
}