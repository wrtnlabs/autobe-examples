import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IEcommerceSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_metrics_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_administrator_join(adminConnection, {});
  typia.assert(auth);
  // Create separate connection for system metrics API call
  const metricsConnection: api.IConnection = { host: connection.host };
  metricsConnection.headers = { ...adminConnection.headers };
  // Retrieve system metric using valid UUID
  const metric =
    await api.functional.ecommerce.superAdministrator.system_metrics.at(
      metricsConnection,
      {
        metricId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(metric);
  // Validate business logic requirements
  TestValidator.predicate(
    "metric has valid measurement timestamp",
    new Date(metric.measurement_timestamp) <= new Date(),
  );
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    new Date(metric.created_at) <= new Date(metric.updated_at),
  );
  TestValidator.predicate(
    "collection interval is reasonable for monitoring",
    metric.collection_interval >= 1 && metric.collection_interval <= 3600,
  );
  TestValidator.predicate(
    "metric value is finite number",
    Number.isFinite(metric.metric_value),
  );
  // Validate environment context
  const validEnvironments = ["production", "staging", "development", "test"];
  TestValidator.predicate(
    "metric has valid environment",
    validEnvironments.includes(metric.environment),
  );
  // Validate source component format
  TestValidator.predicate(
    "source component is non-empty string",
    metric.source_component.trim().length > 0,
  );
}
