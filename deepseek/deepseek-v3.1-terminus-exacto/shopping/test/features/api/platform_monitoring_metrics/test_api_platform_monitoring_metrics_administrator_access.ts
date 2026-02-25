import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_platform_monitoring_metrics_administrator_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and obtain authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Generate random UUID for platform monitoring metric ID
  const platformMonitoringMetricId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve platform monitoring metric
  const metric =
    await api.functional.ecommerce.administrator.platform_monitoring_metrics.at(
      adminConnection,
      { platformMonitoringMetricId },
    );
  // 4. Validate response structure
  typia.assert(metric);
  // 5. Verify that the returned ID matches the requested ID
  typia.assertGuard(metric);
  TestValidator.equals(
    "metric ID matches request",
    metric.id,
    platformMonitoringMetricId,
  );
  // Additional validation of expected fields
  TestValidator.predicate(
    "parameter_name exists",
    metric.parameter_name.length > 0,
  );
  TestValidator.predicate(
    "parameter_value exists",
    metric.parameter_value.length > 0,
  );
  TestValidator.predicate("data_type exists", metric.data_type.length > 0);
  TestValidator.predicate("description exists", metric.description.length > 0);
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(metric.created_at).toString() !== "Invalid Date",
  );
}
