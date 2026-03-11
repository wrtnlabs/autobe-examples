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

export async function test_api_superadmin_system_notification_superadmin_subtype_creation(
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
  // 2. Create parent system notification
  const notification =
    await generate_random_discussion_board_super_admin_system_notifications_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          notification_type: "announcement",
          status: "pending",
          priority: "normal",
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // 3. Create super administrator subtype with session context
  const subtypeBody = {
    actor_type: "superAdmin" as const,
    super_admin_id: superAdmin.id,
    session_context: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IDiscussionBoardSystemNotification.ICreateSubtype;
  const subtype =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
      superAdminConnection,
      {
        notificationId: notification.id,
        body: subtypeBody,
      },
    );
  typia.assert(subtype);
  // 4. Validate subtype creation with session context
  TestValidator.equals(
    "subtype includes system notification",
    subtype.id,
    notification.id,
  );
  TestValidator.equals(
    "subtype title matches",
    subtype.title,
    notification.title,
  );
  TestValidator.equals(
    "subtype content matches",
    subtype.content,
    notification.content,
  );
  TestValidator.equals(
    "subtype has superAdmin actor",
    (subtype.subtype as IDiscussionBoardSystemNotificationOfSuperAdmin)
      .superAdmin.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "superAdmin email matches",
    (subtype.subtype as IDiscussionBoardSystemNotificationOfSuperAdmin)
      .superAdmin.email,
    superAdmin.email,
  );
  TestValidator.predicate(
    "session context is present",
    (subtype.subtype as IDiscussionBoardSystemNotificationOfSuperAdmin)
      .superAdminSession !== null,
  );
  // 5. Test 1:1 constraint enforcement
  await TestValidator.error(
    "cannot create duplicate superAdmin subtype for same notification",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
        superAdminConnection,
        {
          notificationId: notification.id,
          body: {
            actor_type: "superAdmin" as const,
            super_admin_id: typia.random<string & tags.Format<"uuid">>(), // different super admin id
            session_context: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
        },
      );
    },
  );
  // 6. Test error scenario: non-existent super admin
  await TestValidator.error(
    "cannot create subtype with non-existent super admin",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
        superAdminConnection,
        {
          notificationId: notification.id,
          body: {
            actor_type: "superAdmin" as const,
            super_admin_id: typia.random<string & tags.Format<"uuid">>(), // non-existent super admin
            session_context: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
        },
      );
    },
  );
  // 7. Test subtype without session_context (optional field)
  const secondNotification =
    await generate_random_discussion_board_super_admin_system_notifications_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          notification_type: "alert",
          status: "pending",
          priority: "high",
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(secondNotification);
  const subtypeWithoutSession =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
      superAdminConnection,
      {
        notificationId: secondNotification.id,
        body: {
          actor_type: "superAdmin" as const,
          super_admin_id: superAdmin.id,
          // session_context omitted
        } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
      },
    );
  typia.assert(subtypeWithoutSession);
  TestValidator.equals(
    "subtype without session context created successfully",
    (
      subtypeWithoutSession.subtype as IDiscussionBoardSystemNotificationOfSuperAdmin
    ).superAdmin.id,
    superAdmin.id,
  );
  TestValidator.predicate(
    "session context is null when not provided",
    (
      subtypeWithoutSession.subtype as IDiscussionBoardSystemNotificationOfSuperAdmin
    ).superAdminSession === null,
  );
}
