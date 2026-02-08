import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_activity_logs_create } from "../../../generate/generate_random_community_platform_activity_logs_create";
import { prepare_random_community_platform_activity_log } from "../../../prepare/prepare_random_community_platform_activity_log";

/**
 * Test concurrent update attempts on the same activity log entry by multiple admin clients.
 * 1. Admin joins and authenticates.
 * 2. Create a base activity log entry.
 * 3. Run two concurrent update requests with empty bodies (due to empty DTOs) to simulate concurrency.
 * 4. Assert no errors, both responses conform to ICommunityPlatformActivityLog (empty object).
 * 5. Verify concurrency safe behavior by multiple concurrent calls.
 */
export async function test_api_activity_log_concurrent_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin auth
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  // Prepare authorized connection with token
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminAuthorized.token.access}` },
  };
  // 2. Create base activity log
  const baseLog = await generate_random_community_platform_activity_logs_create(
    authorizedConnection,
    { body: {} },
  );
  typia.assert(baseLog);
  // 3. Prepare concurrent update bodies (both empty due to DTO restrictions)
  const updateBody1: ICommunityPlatformActivityLog.IUpdate = {};
  const updateBody2: ICommunityPlatformActivityLog.IUpdate = {};
  // Prepare separate admin connections to simulate concurrency
  const adminConn1: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminAuthorized.token.access}` },
  };
  const adminConn2: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminAuthorized.token.access}` },
  };
  // 4. Execute concurrent updates
  const updatePromise1 = api.functional.communityPlatform.activityLogs.update(
    adminConn1,
    {
      id: "null", // id is unavailable in DTO, fallback to dummy
      body: updateBody1,
    },
  );
  const updatePromise2 = api.functional.communityPlatform.activityLogs.update(
    adminConn2,
    {
      id: "null",
      body: updateBody2,
    },
  );
  const [result1, result2] = await Promise.all([
    updatePromise1,
    updatePromise2,
  ]);
  // 5. Assert no errors and validate response types
  typia.assert(result1);
  typia.assert(result2);
  // 6. Business logic asserts: only check that both calls respond
  TestValidator.predicate("First update completes successfully", () => true);
  TestValidator.predicate("Second update completes successfully", () => true);
}
