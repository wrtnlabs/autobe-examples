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

export async function test_api_admin_activity_log_create_success_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via join utility
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminJoinConnection, {});
  typia.assert(admin);
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // 2. Test successful creation of activity log with required and optional fields
  const body1: ICommunityPlatformActivityLog.ICreate = {
    action_type: "test_action",
    user_id: null,
    ip_address: "192.168.1.100",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    metadata: null,
  };
  const result1 =
    await generate_random_community_platform_admin_activity_logs_create(
      adminConnection,
      { body: body1 },
    );
  typia.assert(result1);
  TestValidator.equals(
    "action_type matches",
    result1.action_type,
    body1.action_type,
  );
  TestValidator.equals("user_id is null", result1.user?.id ?? null, null);
  TestValidator.equals(
    "ip_address matches",
    result1.ip_address ?? null,
    body1.ip_address,
  );
  TestValidator.equals(
    "user_agent matches",
    result1.user_agent ?? null,
    body1.user_agent,
  );
  TestValidator.equals("metadata is null", result1.metadata ?? null, null);
  // Validate timestamps presence and format
  typia.assert(result1.created_at);
  typia.assert(result1.updated_at);
  // 3. Test authorization enforcement: create log without admin auth (no headers)
  const anonConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized create call", async () => {
    await generate_random_community_platform_admin_activity_logs_create(
      anonConnection,
      {
        body: {
          action_type: "unauth_action",
        } satisfies ICommunityPlatformActivityLog.ICreate,
      },
    );
  });
  // 4. Test creation with complex JSON string in metadata
  const complexMetadata = JSON.stringify({
    nested: { level1: { level2: 123, flags: [true, false, null] } },
    array: [1, 2, 3],
    text: "random text",
  });
  const body2: ICommunityPlatformActivityLog.ICreate = {
    action_type: "complex_metadata_action",
    metadata: complexMetadata,
  };
  const result2 =
    await generate_random_community_platform_admin_activity_logs_create(
      adminConnection,
      { body: body2 },
    );
  typia.assert(result2);
  TestValidator.equals(
    "action_type matches for complex metadata",
    result2.action_type,
    body2.action_type,
  );
  TestValidator.equals(
    "metadata matches complex JSON string",
    result2.metadata ?? null,
    complexMetadata,
  );
  // Validate metadata can be parsed back
  const parsedMetadata = JSON.parse(result2.metadata ?? "{}");
  TestValidator.predicate(
    "metadata parse successful",
    typeof parsedMetadata === "object" && parsedMetadata !== null,
  );
}
