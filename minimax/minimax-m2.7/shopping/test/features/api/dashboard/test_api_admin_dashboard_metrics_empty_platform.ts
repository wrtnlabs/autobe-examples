import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminDashboardMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminDashboardMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin dashboard metrics endpoint returns correct zero values when platform has no data.
 *
 * This test validates the empty state handling of aggregation queries by:
 * 1. Authenticating as a super admin
 * 2. Calling the dashboard metrics endpoint on a fresh platform with no customers, sellers, products, or orders
 * 3. Verifying all counts return 0
 * 4. Verifying status breakdowns are empty objects with zero values
 * 5. Verifying GMV is 0
 * 6. Verifying all date-based metrics show 0 counts
 */
export async function test_api_admin_dashboard_metrics_empty_platform(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call the dashboard metrics endpoint
  const metrics =
    await api.functional.ecommerceMall.admin.admin.dashboard.metrics.at(
      adminConnection,
    );
  typia.assert(metrics);
  // 3. Validate customer metrics are all zero
  TestValidator.equals("customers total is 0", metrics.customers.total, 0);
  TestValidator.equals(
    "customers new_last_30_days is 0",
    metrics.customers.new_last_30_days,
    0,
  );
  // 4. Validate seller metrics are all zero
  TestValidator.equals("sellers total is 0", metrics.sellers.total, 0);
  TestValidator.equals(
    "sellers by_status pending is 0",
    metrics.sellers.by_status.pending,
    0,
  );
  TestValidator.equals(
    "sellers by_status approved is 0",
    metrics.sellers.by_status.approved,
    0,
  );
  TestValidator.equals(
    "sellers by_status rejected is 0",
    metrics.sellers.by_status.rejected,
    0,
  );
  TestValidator.equals("sellers suspended is 0", metrics.sellers.suspended, 0);
  // 5. Validate product metrics are all zero
  TestValidator.equals("products total is 0", metrics.products.total, 0);
  TestValidator.equals(
    "products new_last_30_days is 0",
    metrics.products.new_last_30_days,
    0,
  );
  // 6. Validate order metrics are all zero
  TestValidator.equals("orders total is 0", metrics.orders.total, 0);
  TestValidator.equals(
    "orders by_status paid is 0",
    metrics.orders.by_status.paid,
    0,
  );
  TestValidator.equals(
    "orders by_status shipped is 0",
    metrics.orders.by_status.shipped,
    0,
  );
  TestValidator.equals(
    "orders by_status delivered is 0",
    metrics.orders.by_status.delivered,
    0,
  );
  TestValidator.equals(
    "orders by_status cancelled is 0",
    metrics.orders.by_status.cancelled,
    0,
  );
  TestValidator.equals(
    "orders by_status refunded is 0",
    metrics.orders.by_status.refunded,
    0,
  );
  TestValidator.equals(
    "orders by_status partially_completed is 0",
    metrics.orders.by_status.partially_completed,
    0,
  );
  TestValidator.equals("orders gmv is 0", metrics.orders.gmv, 0);
  TestValidator.equals(
    "orders new_last_30_days is 0",
    metrics.orders.new_last_30_days,
    0,
  );
  // 7. Validate pending requests are all zero
  TestValidator.equals(
    "pending_requests seller_approvals is 0",
    metrics.pending_requests.seller_approvals,
    0,
  );
  TestValidator.equals(
    "pending_requests admin_requests is 0",
    metrics.pending_requests.admin_requests,
    0,
  );
  // 8. Validate disputes are all zero
  TestValidator.equals(
    "disputes cancellation_requests is 0",
    metrics.disputes.cancellation_requests,
    0,
  );
  TestValidator.equals(
    "disputes refund_requests is 0",
    metrics.disputes.refund_requests,
    0,
  );
}
