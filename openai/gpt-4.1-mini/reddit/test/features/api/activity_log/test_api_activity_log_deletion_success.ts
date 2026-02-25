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

export async function test_api_activity_log_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // 2. Use the authorized connection for subsequent admin actions
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuthorized.token.access,
  };
  // 3. Create an activity log to delete
  const createdLog =
    await generate_random_community_platform_admin_activity_logs_create(
      adminConnection,
      {
        body: {
          user_id: null,
          action_type: "test_action_delete",
          ip_address: "127.0.0.1",
          user_agent: "unit-test-agent",
          metadata: null,
        },
      },
    );
  typia.assert(createdLog);
  // 4. Delete the activity log by its id
  await api.functional.communityPlatform.admin.activityLogs.erase(
    adminConnection,
    {
      id: createdLog.id,
    },
  );
  // Note: GET endpoint to verify deletion does not exist, so no retrieval verification
}
