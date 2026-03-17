import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ISearchHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchHealthMetric";
import type { ISearchHealthStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchHealthStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_search_health_check_service_unavailable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Call health check endpoint using adminConnection (headers updated by authorize_admin_join)
  const healthStatus =
    await api.functional.ecommerceMall.admin.search.health.check(
      adminConnection,
    );
  typia.assert(healthStatus);
  // 3. Validate unhealthy status response
  TestValidator.equals("status is unhealthy", healthStatus.status, "unhealthy");
  TestValidator.equals(
    "lastUpdated is null for unavailable service",
    healthStatus.lastUpdated,
    null,
  );
  TestValidator.notEquals("metrics should exist", healthStatus.metrics, null);
  if (healthStatus.metrics !== null) {
    TestValidator.equals(
      "availabilityStatus is unavailable",
      healthStatus.metrics.availabilityStatus,
      "unavailable",
    );
    TestValidator.equals(
      "freshnessHours is null when unavailable",
      healthStatus.metrics.freshnessHours,
      null,
    );
    TestValidator.equals(
      "totalIndexedCount is 0 or null when unavailable",
      healthStatus.metrics.totalIndexedCount,
      0,
    );
  }
}
