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

export async function test_api_activity_log_update_success_valid_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Admin join and login to obtain auth token
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
      password: "Password123!",
      displayName: "Admin User",
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(admin);
  // Set Authorization header for subsequent requests
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // 2. Create an initial activity log entry
  const initialActivityLog =
    await generate_random_community_platform_admin_activity_logs_create(
      adminConnection,
      {
        body: {
          action_type: "initial_action",
          ip_address: "192.168.1.100",
          user_agent: "InitialAgent/1.0",
          metadata: JSON.stringify({ info: "initial metadata" }),
        },
      },
    );
  typia.assert(initialActivityLog);
  // Prepare update body - partially update with some fields
  const updateBody: ICommunityPlatformActivityLog.IUpdate = {
    actionType: "updated_action",
    ipAddress: "10.0.0.2",
    userAgent: "UpdatedAgent/2.0",
    metadata: JSON.stringify({ updated: true, details: "extra info" }),
  };
  // 3. Perform the update operation
  const updatedLog =
    await api.functional.communityPlatform.admin.activityLogs.updateActivityLog(
      adminConnection,
      {
        id: initialActivityLog.id,
        body: updateBody,
      },
    );
  typia.assert(updatedLog);
  // 4. Verify updated fields
  TestValidator.equals(
    "actionType updated correctly",
    updatedLog.action_type,
    updateBody.actionType,
  );
  TestValidator.equals(
    "ipAddress updated correctly",
    updatedLog.ip_address,
    updateBody.ipAddress,
  );
  TestValidator.equals(
    "userAgent updated correctly",
    updatedLog.user_agent,
    updateBody.userAgent,
  );
  TestValidator.equals(
    "metadata updated correctly",
    updatedLog.metadata,
    updateBody.metadata,
  );
  // 5. Verify immutable fields unchanged
  TestValidator.equals("id unchanged", updatedLog.id, initialActivityLog.id);
  TestValidator.equals(
    "created_at unchanged",
    updatedLog.created_at,
    initialActivityLog.created_at,
  );
  // 6. Verify updated_at timestamp is newer
  TestValidator.predicate(
    "updated_at timestamp is newer",
    new Date(updatedLog.updated_at).getTime() >
      new Date(initialActivityLog.updated_at).getTime(),
  );
}
