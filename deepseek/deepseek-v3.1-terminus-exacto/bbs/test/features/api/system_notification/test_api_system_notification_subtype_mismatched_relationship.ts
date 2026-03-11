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

export async function test_api_system_notification_subtype_mismatched_relationship(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(superAdminAuth);
  // Create first system notification
  const firstNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.create(
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
  typia.assert(firstNotification);
  // Create second system notification
  const secondNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          notification_type: "alert",
          status: "pending",
          priority: "high",
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(secondNotification);
  // Create subtype association with second notification
  const subtype =
    await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.createSubtype(
      superAdminConnection,
      {
        notificationId: secondNotification.id,
        body: {
          actor_type: "superAdmin",
          super_admin_id: superAdminAuth.id,
        } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
      },
    );
  typia.assert(subtype);
  // Attempt to retrieve subtype using first notification's ID (mismatched relationship)
  await TestValidator.error(
    "should reject subtype retrieval with mismatched notification ID",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_notifications.subtypes.at(
        superAdminConnection,
        {
          notificationId: firstNotification.id,
          subtypeId: subtype.id,
        },
      );
    },
  );
}
