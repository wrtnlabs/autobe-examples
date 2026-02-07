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

export async function test_api_admin_usage_metrics_update_realistic_values(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  typia.assert(joined);
  // Generate a unique metric ID
  const metricId = typia.random<string & tags.Format<"uuid">>();
  // Update the usage metrics record with realistic values as per scenario
  // Since ICommunityUsageMetric is defined as empty object {}, we must pass an empty object
  // The scenario's specific properties (total_users, active_sessions, etc.) don't exist in the DTO
  // Therefore we cannot validate them - the system accepts an empty object and replaces the record
  const updatedMetric =
    await api.functional.community.admin.usage_metrics.update(adminConnection, {
      metricId,
      body: {} satisfies ICommunityUsageMetric,
    });
  typia.assert(updatedMetric);
  // Validate that updated metric is of type ICommunityUsageMetric and is empty object
  // Since ICommunityUsageMetric is defined as {} - empty object, we can only validate it's an object
  TestValidator.equals(
    "updated metric type is object",
    typeof updatedMetric,
    "object",
  );
  TestValidator.equals(
    "updated metric has no properties",
    Object.keys(updatedMetric).length,
    0,
  );
}
