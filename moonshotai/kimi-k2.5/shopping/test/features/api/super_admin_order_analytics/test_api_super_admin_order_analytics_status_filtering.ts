import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderAnalytic";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_order_analytics_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 2. Register super admin account
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 3. Define valid status values for filtering
  const statusValues = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ] as const;
  // 4. Test filtering by each status value
  for (const status of statusValues) {
    const analytics =
      await api.functional.ecommerceMall.superAdmin.orderAnalytics.aggregate(
        superAdminConnection,
        {
          body: {
            status: status,
          } satisfies IEcommerceMallOrderAnalytic.IRequest,
        },
      );
    typia.assert(analytics);
    // Verify that when filtered by status, totalItems matches the status count
    TestValidator.equals(
      `totalItems should match ${status} count when filtered by ${status}`,
      analytics.totalItems,
      analytics.statusCounts[status],
    );
    // Verify that totalRevenue is non-negative
    TestValidator.predicate(
      `totalRevenue should be non-negative for ${status} filter`,
      analytics.totalRevenue >= 0,
    );
    // Verify that the filtered status count equals total when only that status is requested
    // This ensures proper aggregation behavior per the scenario requirements
    const otherStatusesSum = Object.entries(analytics.statusCounts)
      .filter(([key]) => key !== status)
      .reduce((sum, [, count]) => sum + count, 0);
    // When filtering by a specific status, only that status should be counted
    // So other status counts should be 0 or the status counts should reflect the filter
    TestValidator.predicate(
      `only ${status} items should be included when filtered by ${status}`,
      analytics.statusCounts[status] === analytics.totalItems,
    );
  }
  // 5. Test without status filter to verify all statuses are included
  const allAnalytics =
    await api.functional.ecommerceMall.superAdmin.orderAnalytics.aggregate(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(allAnalytics);
  // Verify that totalItems equals sum of all status counts
  const totalStatusCounts = Object.values(allAnalytics.statusCounts).reduce(
    (a, b) => a + b,
    0,
  );
  TestValidator.equals(
    "totalItems should equal sum of all status counts without filter",
    allAnalytics.totalItems,
    totalStatusCounts,
  );
}
