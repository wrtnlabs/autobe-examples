import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

/**
 * Test admin attempting to retrieve a non-existent system notification.
 * 1. Authenticate as admin via admin join
 * 2. Attempt to retrieve notification using valid UUID that doesn't exist
 * 3. Verify system returns appropriate error for non-existent notification
 */
export async function test_api_admin_system_notification_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(authResult);
  // Generate a valid UUID that doesn't exist in the system
  const nonExistentNotificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve non-existent notification and expect error
  await TestValidator.error(
    "should return error for non-existent notification",
    async () => {
      await api.functional.discussionBoard.admin.system_notifications.at(
        adminConnection,
        {
          notificationId: nonExistentNotificationId,
        },
      );
    },
  );
}
