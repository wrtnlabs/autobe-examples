import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMemberNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberNotificationPreference";
import type { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_notification_subtype_update_non_existent_notification(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate random UUID for non-existent notification
  const nonExistentNotificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create valid subtype update data
  const subtypeUpdate = {
    readAt: new Date().toISOString(),
    deliveredAt: new Date().toISOString(),
    preferences: {
      delivery_method: "email",
      frequency: "immediate",
    } satisfies IDiscussionBoardMemberNotificationPreference,
  } satisfies IDiscussionBoardSystemNotification.ISubtypeUpdate;
  // Test that updating subtypes for non-existent notification throws error
  await TestValidator.error(
    "should throw error when updating subtypes for non-existent notification",
    async () => {
      await api.functional.discussionBoard.admin.system_notifications.subtypes.updateSubtypes(
        adminConnection,
        {
          notificationId: nonExistentNotificationId,
          body: subtypeUpdate,
        },
      );
    },
  );
}
