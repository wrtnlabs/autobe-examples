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

export async function test_api_superadmin_system_notification_admin_subtype_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create base system notification
  const notification =
    await generate_random_discussion_board_super_admin_system_notifications_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          notification_type: "announcement",
          status: "pending",
          priority: "normal",
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // 3. Create administrator subtype
  const adminSubtype =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
      superAdminConnection,
      {
        notificationId: notification.id,
        body: {
          actor_type: "admin",
          admin_id: superAdmin.id,
          notification_context: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
      },
    );
  typia.assert(adminSubtype);
  // 4. Validate subtype creation
  TestValidator.equals(
    "subtype should have parent notification id",
    adminSubtype.id,
    notification.id,
  );
  TestValidator.equals(
    "subtype should have correct title",
    adminSubtype.title,
    notification.title,
  );
  TestValidator.equals(
    "subtype should have correct content",
    adminSubtype.content,
    notification.content,
  );
  // Validate admin subtype specific properties using type narrowing
  if ("notification_context" in adminSubtype.subtype) {
    TestValidator.predicate(
      "admin subtype should have notification context",
      adminSubtype.subtype.notification_context !== null,
    );
  }
  // 5. Test uniqueness constraint - attempt to create duplicate admin subtype
  await TestValidator.error(
    "should reject duplicate admin subtype creation",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
        superAdminConnection,
        {
          notificationId: notification.id,
          body: {
            actor_type: "admin",
            admin_id: superAdmin.id,
            notification_context: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
        },
      );
    },
  );
  // 6. Test creating subtypes for different actor types
  const memberSubtype =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
      superAdminConnection,
      {
        notificationId: notification.id,
        body: {
          actor_type: "member",
          member_id: typia.random<string & tags.Format<"uuid">>(),
          read_status: "unread",
        } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
      },
    );
  typia.assert(memberSubtype);
  const superAdminSubtype =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
      superAdminConnection,
      {
        notificationId: notification.id,
        body: {
          actor_type: "superAdmin",
          super_admin_id: superAdmin.id,
          session_context: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
      },
    );
  typia.assert(superAdminSubtype);
  // 7. Verify different actor types can coexist by validating their unique properties
  if ("is_read" in memberSubtype.subtype) {
    TestValidator.predicate(
      "member subtype should have read status property",
      true,
    );
  }
  if ("superAdminSession" in superAdminSubtype.subtype) {
    TestValidator.predicate(
      "superAdmin subtype should have session context property",
      true,
    );
  }
  // Final validation that all subtypes were created successfully
  TestValidator.predicate(
    "all subtypes should be created without errors",
    adminSubtype !== null &&
      memberSubtype !== null &&
      superAdminSubtype !== null,
  );
}
