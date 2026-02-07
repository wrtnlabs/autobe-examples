import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityUsageMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUsageMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_admin_usage_metrics_create } from "../../../generate/generate_random_community_admin_usage_metrics_create";
import { prepare_random_community_usage_metric } from "../../../prepare/prepare_random_community_usage_metric";

export async function test_api_admin_usage_metrics_snapshot_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // 2. Verify admin can create usage metrics snapshot
  const snapshot = await generate_random_community_admin_usage_metrics_create(
    adminConnection,
    {
      body: {} satisfies ICommunityUsageMetric.ICreate,
    },
  );
  // Cast snapshot to a type that includes 'id' (assuming it exists in a response interface)
  const typedSnapshot = typia.assert<ICommunityUsageMetric & { id: string }>(snapshot);
  // 3. Validate snapshot has required properties (id based on scenario, despite schema being empty)
  TestValidator.predicate("snapshot has id", typedSnapshot.id !== undefined);
  // 4. Verify non-admin user is rejected
  const userConnection: api.IConnection = { host: connection.host };
  // Simulate user context by not authenticating as admin
  // The endpoint should reject non-admin users with 403 Forbidden
  await TestValidator.httpError(
    "non-admin should be forbidden",
    403,
    async () => {
      await generate_random_community_admin_usage_metrics_create(
        userConnection,
        {
          body: {} satisfies ICommunityUsageMetric.ICreate,
        },
      );
    },
  );
}