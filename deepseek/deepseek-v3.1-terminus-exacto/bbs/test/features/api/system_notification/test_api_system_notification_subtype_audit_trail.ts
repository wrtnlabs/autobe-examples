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

export async function test_api_system_notification_subtype_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
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
  // 2. Create system notification using utility function
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
  // 3. Create admin subtype with valid data
  const adminSubtype =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
      superAdminConnection,
      {
        notificationId: notification.id,
        body: {
          actor_type: "admin",
          admin_id: typia.random<string & tags.Format<"uuid">>(),
          notification_context: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
      },
    );
  typia.assert(adminSubtype);
  // 4. Create member subtype with valid data
  const memberSubtype =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
      superAdminConnection,
      {
        notificationId: notification.id,
        body: {
          actor_type: "member",
          member_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
      },
    );
  typia.assert(memberSubtype);
  // 5. Create superAdmin subtype with valid data
  const superAdminSubtype =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
      superAdminConnection,
      {
        notificationId: notification.id,
        body: {
          actor_type: "superAdmin",
          super_admin_id: superAdminAuth.id,
          session_context: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
      },
    );
  typia.assert(superAdminSubtype);
  // 6. Retrieve admin subtype notification and validate audit trail
  const retrievedAdminNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.at(
      superAdminConnection,
      {
        notificationId: notification.id,
        subtypeId: adminSubtype.id,
      },
    );
  typia.assert(retrievedAdminNotification);
  TestValidator.equals(
    "admin notification ID matches original",
    retrievedAdminNotification.id,
    notification.id,
  );
  TestValidator.equals(
    "admin notification title matches",
    retrievedAdminNotification.title,
    notification.title,
  );
  // 7. Retrieve member subtype notification and validate audit trail
  const retrievedMemberNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.at(
      superAdminConnection,
      {
        notificationId: notification.id,
        subtypeId: memberSubtype.id,
      },
    );
  typia.assert(retrievedMemberNotification);
  TestValidator.equals(
    "member notification ID matches original",
    retrievedMemberNotification.id,
    notification.id,
  );
  // 8. Retrieve superAdmin subtype notification and validate audit trail
  const retrievedSuperAdminNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.at(
      superAdminConnection,
      {
        notificationId: notification.id,
        subtypeId: superAdminSubtype.id,
      },
    );
  typia.assert(retrievedSuperAdminNotification);
  TestValidator.equals(
    "superAdmin notification ID matches original",
    retrievedSuperAdminNotification.id,
    notification.id,
  );
  // 9. Validate subtype-specific relationships exist
  TestValidator.predicate(
    "admin subtype has subtype property",
    adminSubtype.subtype !== undefined,
  );
  TestValidator.predicate(
    "member subtype has subtype property",
    memberSubtype.subtype !== undefined,
  );
  TestValidator.predicate(
    "superAdmin subtype has subtype property",
    superAdminSubtype.subtype !== undefined,
  );
  // 10. Validate notification properties are consistent
  TestValidator.predicate(
    "notification has delivery status",
    retrievedAdminNotification.status !== undefined,
  );
  TestValidator.predicate(
    "notification has priority",
    retrievedAdminNotification.priority !== undefined,
  );
  TestValidator.predicate(
    "notification has type",
    retrievedAdminNotification.notification_type !== undefined,
  );
  // 11. Validate that notification content matches original
  TestValidator.equals(
    "notification content matches",
    retrievedAdminNotification.content,
    notification.content,
  );
  TestValidator.equals(
    "notification type matches",
    retrievedAdminNotification.notification_type,
    notification.notification_type,
  );
  TestValidator.equals(
    "notification status matches",
    retrievedAdminNotification.status,
    notification.status,
  );
  // 12. Validate subtype-specific properties based on actor type
  // For admin subtype, check that we have the correct subtype properties
  if (adminSubtype.subtype && "admin" in adminSubtype.subtype) {
    const adminSubtypeData = adminSubtype.subtype;
    TestValidator.predicate(
      "admin subtype has notification_context",
      adminSubtypeData.notification_context !== undefined,
    );
  }
  // For member subtype
  if (memberSubtype.subtype && "is_read" in memberSubtype.subtype) {
    const memberSubtypeData = memberSubtype.subtype;
    TestValidator.predicate(
      "member subtype has read status",
      typeof memberSubtypeData.is_read === "boolean",
    );
  }
  // For superAdmin subtype
  if (superAdminSubtype.subtype && "superAdmin" in superAdminSubtype.subtype) {
    const superAdminSubtypeData = superAdminSubtype.subtype;
    TestValidator.predicate(
      "superAdmin subtype has superAdmin reference",
      superAdminSubtypeData.superAdmin !== undefined,
    );
  }
}
