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

/**
 * Test retrieval of existing platform monitoring metric with valid UUID.
 * 1. Administrator authentication via join utility function
 * 2. Call GET endpoint with random UUID to retrieve metric details
 * 3. Validate metric structure using typia.assert()
 */
export async function test_api_platform_monitoring_metrics_existing_metric(
  connection: api.IConnection,
): Promise<void> {
  // Administrator authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
    },
  });
  // Retrieve platform monitoring metric
  const metric =
    await api.functional.ecommerce.administrator.platform_monitoring_metrics.at(
      adminConnection,
      {
        platformMonitoringMetricId: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    );
  typia.assert(metric);
}
