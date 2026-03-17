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

export async function test_api_search_health_check_service_healthy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and get authorization
  const adminAuth: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Create admin connection with token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuth.token.access,
    },
  };
  // 3. Call health check endpoint
  const healthStatus: ISearchHealthStatus =
    await api.functional.ecommerceMall.admin.search.health.check(
      adminConnection,
    );
  typia.assert(healthStatus);
  // 4. Validate health status is healthy
  TestValidator.equals(
    "health status is healthy",
    healthStatus.status,
    "healthy",
  );
  // 5. Validate metrics exist
  TestValidator.predicate("metrics not null", healthStatus.metrics !== null);
  if (healthStatus.metrics) {
    // 6. Validate availability status
    TestValidator.equals(
      "availability status is available",
      healthStatus.metrics.availabilityStatus,
      "available",
    );
    // 7. Validate freshness hours (should be < 1.0 for healthy service)
    TestValidator.predicate(
      "freshness hours under 1.0",
      healthStatus.metrics.freshnessHours !== null &&
        healthStatus.metrics.freshnessHours < 1.0,
    );
    // 8. Validate total indexed count exists and is valid
    TestValidator.predicate(
      "total indexed count is valid",
      healthStatus.metrics.totalIndexedCount >= 0,
    );
  }
}
