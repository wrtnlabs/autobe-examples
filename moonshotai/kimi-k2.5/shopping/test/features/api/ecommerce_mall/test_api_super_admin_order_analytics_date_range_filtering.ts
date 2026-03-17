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

export async function test_api_super_admin_order_analytics_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register super admin with required credentials
  await api.functional.ecommerceMall.auth.superAdmin.join(
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
  // Define date range for filtering (last 7 days)
  const endDate = new Date().toISOString();
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Retrieve analytics with date range filter
  const analytics =
    await api.functional.ecommerceMall.superAdmin.orderAnalytics.aggregate(
      superAdminConnection,
      {
        body: {
          startDate,
          endDate,
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(analytics);
  // Validate business constraints - all counts should be non-negative
  TestValidator.predicate(
    "totalItems is non-negative",
    analytics.totalItems >= 0,
  );
  TestValidator.predicate(
    "totalRevenue is non-negative",
    analytics.totalRevenue >= 0,
  );
  TestValidator.predicate(
    "pendingCancellationRequests is non-negative",
    analytics.pendingCancellationRequests >= 0,
  );
  TestValidator.predicate(
    "pendingRefundRequests is non-negative",
    analytics.pendingRefundRequests >= 0,
  );
  TestValidator.predicate(
    "statusCounts.paid is non-negative",
    analytics.statusCounts.paid >= 0,
  );
  TestValidator.predicate(
    "statusCounts.shipped is non-negative",
    analytics.statusCounts.shipped >= 0,
  );
  TestValidator.predicate(
    "statusCounts.delivered is non-negative",
    analytics.statusCounts.delivered >= 0,
  );
  TestValidator.predicate(
    "statusCounts.cancelled is non-negative",
    analytics.statusCounts.cancelled >= 0,
  );
  TestValidator.predicate(
    "statusCounts.refunded is non-negative",
    analytics.statusCounts.refunded >= 0,
  );
}
