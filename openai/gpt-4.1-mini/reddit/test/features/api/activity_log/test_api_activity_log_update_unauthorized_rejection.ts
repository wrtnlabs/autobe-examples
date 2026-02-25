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
import { generate_random_community_platform_admin_activity_logs_create } from "../../../generate/generate_random_community_platform_admin_activity_logs_create";
import { prepare_random_community_platform_activity_log } from "../../../prepare/prepare_random_community_platform_activity_log";

export async function test_api_activity_log_update_unauthorized_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Scenario:
  // 1. Authenticate as admin and create an initial activity log entry.
  // 2. Attempt to update the created activity log without authenticating (using base connection).
  // 3. Expect the update operation to be rejected with an authorization error.
  // Step 1: Admin join and create an initial activity log entry
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // Create an activity log entry to update later
  const initialLog =
    await generate_random_community_platform_admin_activity_logs_create(
      adminConnection,
      { body: { action_type: "test_action" } },
    );
  typia.assert(initialLog);
  // Step 2: Attempt update without admin authentication (using base connection)
  await TestValidator.httpError(
    "unauthorized rejection for activity log update",
    401,
    async () => {
      await api.functional.communityPlatform.admin.activityLogs.updateActivityLog(
        connection,
        {
          id: initialLog.id,
          body: {
            actionType: "unauthorized_update_attempt",
            ipAddress: "192.168.0.1",
            userAgent: "unauthorized-agent",
            metadata: JSON.stringify({ reason: "test" }),
          } satisfies ICommunityPlatformActivityLog.IUpdate,
        },
      );
    },
  );
}
