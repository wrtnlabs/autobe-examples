import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_orders_metrics_aggregation_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  typia.assert(admin);
  // 2. Call metrics endpoint
  const metrics = await api.functional.ecommerceMall.admin.orders.metrics.index(
    adminConnection,
    {
      body: typia.random<IEcommerceMallOrder.IRequest>(),
    },
  );
  typia.assert(metrics);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current", metrics.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit positive",
    metrics.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    metrics.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages matches calculation",
    metrics.pagination.pages,
    Math.ceil(metrics.pagination.records / metrics.pagination.limit),
  );
  // 4. Validate metrics data structure
  TestValidator.equals("metrics data length", metrics.data.length, 1);
  typia.assertGuard(metrics.data[0]);
  const summary = metrics.data[0];
  // 5. Validate status counts contain all required fields and are non-negative
  TestValidator.predicate(
    "statusCounts paid non-negative",
    summary.statusCounts.paid >= 0,
  );
  TestValidator.predicate(
    "statusCounts shipped non-negative",
    summary.statusCounts.shipped >= 0,
  );
  TestValidator.predicate(
    "statusCounts delivered non-negative",
    summary.statusCounts.delivered >= 0,
  );
  TestValidator.predicate(
    "statusCounts cancelled non-negative",
    summary.statusCounts.cancelled >= 0,
  );
  TestValidator.predicate(
    "statusCounts refunded non-negative",
    summary.statusCounts.refunded >= 0,
  );
  TestValidator.predicate(
    "statusCounts partiallyCompleted non-negative",
    summary.statusCounts.partiallyCompleted >= 0,
  );
  // 6. Validate fulfilledOrders = shipped + delivered
  TestValidator.equals(
    "fulfilledOrders equals shipped + delivered",
    summary.fulfilledOrders,
    summary.statusCounts.shipped + summary.statusCounts.delivered,
  );
  // 7. Validate averageOrderValue is non-negative
  TestValidator.predicate(
    "averageOrderValue non-negative",
    summary.averageOrderValue >= 0,
  );
  // 8. Validate totalOrders equals sum of all status counts
  const totalFromStatuses =
    summary.statusCounts.paid +
    summary.statusCounts.shipped +
    summary.statusCounts.delivered +
    summary.statusCounts.cancelled +
    summary.statusCounts.refunded +
    summary.statusCounts.partiallyCompleted;
  TestValidator.equals(
    "totalOrders equals sum of all status counts",
    summary.totalOrders,
    totalFromStatuses,
  );
}
