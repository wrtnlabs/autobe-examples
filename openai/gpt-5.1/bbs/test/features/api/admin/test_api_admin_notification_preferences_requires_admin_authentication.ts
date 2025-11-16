import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardAdminuserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserNotificationPreference";

export async function test_api_admin_notification_preferences_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Build a valid-looking update body according to IDiscussionBoardAdminuserNotificationPreference.IUpdate
  const body = {
    activity_notifications_enabled: true,
    digest_notifications_enabled: false,
    marketing_notifications_enabled: true,
  } satisfies IDiscussionBoardAdminuserNotificationPreference.IUpdate;

  // 2. Create an unauthenticated connection by cloning the existing one
  //    and wiping out headers so that no Authorization token is present.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Attempt to call the preferences.update endpoint without authentication
  //    and verify that it fails.
  await TestValidator.error(
    "unauthenticated admin preferences update must fail",
    async () => {
      await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.update(
        unauthenticatedConnection,
        {
          body,
        },
      );
    },
  );
}
