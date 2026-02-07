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

export async function test_api_admin_usage_metrics_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Generate a random UUID for the metricId
  const metricId = typia.random<string & tags.Format<"uuid">>();
  // 3. Update the usage metrics record with an empty object
  // ICommunityUsageMetric is defined as {} (empty object) in the schema
  // We must pass exactly what the schema defines - an empty object
  const updatedResult =
    await api.functional.community.admin.usage_metrics.update(adminConnection, {
      metricId,
      body: {}, // Empty object - ICommunityUsageMetric is defined as {} in schema
    });
  typia.assert(updatedResult);
  // 4. Validate the response structure
  // Since ICommunityUsageMetric is {} (empty object), the response should be empty
  // We can verify it's still an object and not null/undefined
  TestValidator.predicate(
    "response is object",
    typeof updatedResult === "object" && updatedResult !== null,
  );
  TestValidator.equals(
    "response should be empty object",
    Object.keys(updatedResult).length,
    0,
  );
}
