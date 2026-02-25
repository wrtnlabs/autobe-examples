import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_activity_logs_create } from "../../../generate/generate_random_community_platform_admin_activity_logs_create";
import { prepare_random_community_platform_activity_log } from "../../../prepare/prepare_random_community_platform_activity_log";

export async function test_api_activity_log_deletion_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that a user without admin privileges cannot delete an activity log entry
  // 1. Admin setup: create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "AdminPass123!",
      displayName: `AdminUser${RandomGenerator.alphaNumeric(5)}`,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(adminAuthorized);
  // 2. Create an activity log entry with admin privileges
  const activityLog =
    await generate_random_community_platform_admin_activity_logs_create(
      adminConnection,
      {
        body: {
          action_type: "test_delete_attempt",
          user_id: adminAuthorized.id,
          ip_address: "127.0.0.1",
          user_agent: "Mozilla/5.0",
          metadata: JSON.stringify({ reason: "create for deletion test" }),
        },
      },
    );
  typia.assert(activityLog);
  // 3. User setup: create user account and login
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {
      email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "UserPass123!",
      username: `user${RandomGenerator.alphaNumeric(5)}`,
      displayName: `User${RandomGenerator.alphaNumeric(4)}`,
      href: "https://example.com/join",
      referrer: "https://google.com/",
      ip: null,
    },
  });
  typia.assert(userAuthorized);
  // 4. User attempts to delete the activity log entry (should be forbidden)
  let forbiddenError: unknown = undefined;
  try {
    await api.functional.communityPlatform.admin.activityLogs.erase(
      userConnection,
      {
        id: activityLog.id,
      },
    );
  } catch (error) {
    forbiddenError = error;
  }
  // Assert that the error is HttpError with status 403
  await TestValidator.httpError(
    "unauthorized user cannot delete activity log entry",
    403,
    async () => {
      if (!forbiddenError)
        throw new Error("No error thrown on unauthorized delete");
      throw forbiddenError;
    },
  );
  // 5. Verify the activity log entry still exists by attempting admin's deletion (which should succeed)
  // We do this to confirm the record still exists and was not deleted
  // First, attempt to delete with admin connection which should succeed without error
  await api.functional.communityPlatform.admin.activityLogs.erase(
    adminConnection,
    {
      id: activityLog.id,
    },
  );
  // No error means the test passes; record still existed and user unauthorized deletion failed
}
