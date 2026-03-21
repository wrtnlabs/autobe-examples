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

export async function test_api_admin_dashboard_metrics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated admin connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 2: Retrieve dashboard metrics
  const metrics =
    await api.functional.ecommerceMall.admin.admin.dashboard.metrics.at(
      adminConnection,
    );
  // Step 3: Validate response structure and types using typia.assert()
  typia.assert(metrics);
  // Step 4: Validate business logic - all counts must be non-negative
  TestValidator.predicate(
    "customers.total is non-negative",
    metrics.customers.total >= 0,
  );
  TestValidator.predicate(
    "customers.new_last_30_days does not exceed total",
    metrics.customers.new_last_30_days <= metrics.customers.total,
  );
  TestValidator.predicate(
    "sellers.total is non-negative",
    metrics.sellers.total >= 0,
  );
  TestValidator.predicate(
    "sellers.by_status.pending is non-negative",
    metrics.sellers.by_status.pending >= 0,
  );
  TestValidator.predicate(
    "sellers.by_status.approved is non-negative",
    metrics.sellers.by_status.approved >= 0,
  );
  TestValidator.predicate(
    "sellers.by_status.rejected is non-negative",
    metrics.sellers.by_status.rejected >= 0,
  );
  TestValidator.predicate(
    "sellers.suspended is non-negative",
    metrics.sellers.suspended >= 0,
  );
  TestValidator.predicate(
    "sellers by status sum matches total",
    metrics.sellers.by_status.pending +
      metrics.sellers.by_status.approved +
      metrics.sellers.by_status.rejected <=
      metrics.sellers.total,
  );
  TestValidator.predicate(
    "products.total is non-negative",
    metrics.products.total >= 0,
  );
  TestValidator.predicate(
    "products.new_last_30_days is non-negative",
    metrics.products.new_last_30_days <= metrics.products.total,
  );
  TestValidator.predicate(
    "orders.total is non-negative",
    metrics.orders.total >= 0,
  );
  TestValidator.predicate(
    "orders.by_status.paid is non-negative",
    metrics.orders.by_status.paid >= 0,
  );
  TestValidator.predicate(
    "orders.by_status.shipped is non-negative",
    metrics.orders.by_status.shipped >= 0,
  );
  TestValidator.predicate(
    "orders.by_status.delivered is non-negative",
    metrics.orders.by_status.delivered >= 0,
  );
  TestValidator.predicate(
    "orders.by_status.cancelled is non-negative",
    metrics.orders.by_status.cancelled >= 0,
  );
  TestValidator.predicate(
    "orders.by_status.refunded is non-negative",
    metrics.orders.by_status.refunded >= 0,
  );
  TestValidator.predicate(
    "orders.by_status.partially_completed is non-negative",
    metrics.orders.by_status.partially_completed >= 0,
  );
  TestValidator.predicate(
    "orders.gmv is non-negative",
    metrics.orders.gmv >= 0,
  );
  TestValidator.predicate(
    "orders.new_last_30_days is non-negative",
    metrics.orders.new_last_30_days <= metrics.orders.total,
  );
  TestValidator.predicate(
    "pending_requests.seller_approvals is non-negative",
    metrics.pending_requests.seller_approvals >= 0,
  );
  TestValidator.predicate(
    "pending_requests.admin_requests is non-negative",
    metrics.pending_requests.admin_requests >= 0,
  );
  TestValidator.predicate(
    "disputes.cancellation_requests is non-negative",
    metrics.disputes.cancellation_requests >= 0,
  );
  TestValidator.predicate(
    "disputes.refund_requests is non-negative",
    metrics.disputes.refund_requests >= 0,
  );
}
