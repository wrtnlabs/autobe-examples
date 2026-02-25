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

export async function test_api_activity_log_update_edge_case_values(
  connection: api.IConnection,
): Promise<void> {
  // Test updating an activity log with edge case values such as empty strings for optional text fields (ipAddress, userAgent, metadata)
  // and unusual actionType strings. Validate that the system correctly persists these values and returns them in the updated log.
  // Verify proper handling of nullable fields and confirm timestamps remain logically consistent.
  // 1. Admin join (register) and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin+${Date.now()}@test.com`,
      password: "StrongPass1234",
      displayName: "AdminUser",
    },
  });
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Create initial activity log
  const initialLog =
    await generate_random_community_platform_admin_activity_logs_create(
      adminConnection,
      {
        body: { action_type: "initial_action" },
      },
    );
  typia.assert(initialLog);
  // 3. Construct update body with edge case values
  const updateBody: ICommunityPlatformActivityLog.IUpdate = {
    actionType: "",
    ipAddress: "",
    userAgent: "",
    metadata: "",
  };
  // 4. Perform update
  const updatedLog =
    await api.functional.communityPlatform.admin.activityLogs.updateActivityLog(
      adminConnection,
      {
        id: initialLog.id,
        body: updateBody,
      },
    );
  typia.assert(updatedLog);
  // 5. Validate updated fields
  TestValidator.equals(
    "updated actionType is empty string",
    updatedLog.action_type,
    updateBody.actionType,
  );
  TestValidator.equals(
    "updated ipAddress is empty string",
    updatedLog.ip_address ?? "",
    updateBody.ipAddress ?? "",
  );
  TestValidator.equals(
    "updated userAgent is empty string",
    updatedLog.user_agent ?? "",
    updateBody.userAgent ?? "",
  );
  TestValidator.equals(
    "updated metadata is empty string",
    updatedLog.metadata ?? "",
    updateBody.metadata ?? "",
  );
  // 6. Validate timestamps: updatedAt >= createdAt
  const createdAtTime = new Date(updatedLog.created_at).getTime();
  const updatedAtTime = new Date(updatedLog.updated_at).getTime();
  TestValidator.predicate(
    "updatedAt is same or after createdAt",
    updatedAtTime >= createdAtTime,
  );
  // 7. Validate id remains same
  TestValidator.equals("id remains unchanged", updatedLog.id, initialLog.id);
}
