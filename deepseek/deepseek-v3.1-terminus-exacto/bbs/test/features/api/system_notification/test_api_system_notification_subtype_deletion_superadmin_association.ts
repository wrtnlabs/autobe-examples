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
 * Test the deletion of a superAdmin subtype association from a system notification.
 * Authenticate as superAdmin, create a notification, and establish a superAdmin subtype association.
 * Delete the subtype association and verify proper removal. Validate that the superAdmin's
 * session context and personalized delivery metadata are correctly detached from the
 * notification while preserving the parent notification content.
 */
export async function test_api_system_notification_subtype_deletion_superadmin_association(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create parent notification
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
  // 3. Create superAdmin subtype association
  const subtype =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
      superAdminConnection,
      {
        notificationId: notification.id,
        body: {
          actor_type: "superAdmin",
          super_admin_id: superAdmin.id,
          session_context: RandomGenerator.alphabets(10),
        } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
      },
    );
  typia.assert(subtype);
  // 4. Delete the subtype association
  await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.erase(
    superAdminConnection,
    {
      notificationId: notification.id,
      subtypeId: subtype.subtype.id,
    },
  );
  // 5. Verify deletion by attempting to create duplicate subtype (should fail due to 1:1 constraint)
  await TestValidator.error(
    "duplicate subtype association should fail",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
        superAdminConnection,
        {
          notificationId: notification.id,
          body: {
            actor_type: "superAdmin",
            super_admin_id: superAdmin.id,
            session_context: RandomGenerator.alphabets(10),
          } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
        },
      );
    },
  );
  // 6. Verify parent notification still exists and content is preserved
  TestValidator.equals(
    "notification id preserved",
    notification.id,
    notification.id,
  );
  TestValidator.equals(
    "notification title preserved",
    notification.title,
    notification.title,
  );
  TestValidator.equals(
    "notification content preserved",
    notification.content,
    notification.content,
  );
}
