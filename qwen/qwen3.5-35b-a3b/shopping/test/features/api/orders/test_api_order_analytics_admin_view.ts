import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderAnalytic";
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
 * Test that an admin can successfully retrieve order lifecycle analytics for the platform.
 * Validates the primary success path where an admin user authenticates and calls the
 * analytics endpoint to view aggregated order metrics across all lifecycle stages.
 */
export async function test_api_order_analytics_admin_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Request analytics with pagination parameters
  const analytics =
    await api.functional.ecommerceMall.admin.orders.analytics.getAnalytics(
      adminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          pageSize: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(analytics);
  // 3. Verify pagination parameters are within valid range
  TestValidator.predicate("page is at least 1", analytics.pagination.page >= 1);
  TestValidator.predicate(
    "pageSize is between 1 and 100",
    analytics.pagination.pageSize >= 1 && analytics.pagination.pageSize <= 100,
  );
  TestValidator.predicate(
    "totalItems is non-negative",
    analytics.pagination.totalItems >= 0,
  );
  TestValidator.predicate(
    "totalPages is at least 1",
    analytics.pagination.totalPages >= 1,
  );
  // 4. Verify pagination metadata accuracy (totalPages calculation)
  const expectedTotalPages = Math.ceil(
    analytics.pagination.totalItems / analytics.pagination.pageSize,
  );
  TestValidator.equals(
    "totalPages calculation is correct",
    analytics.pagination.totalPages,
    expectedTotalPages,
  );
  // 5. Verify totalOrders equals sum of all status-specific counts
  const statusSum =
    analytics.data.ordersCreated +
    analytics.data.ordersShipped +
    analytics.data.ordersDelivered +
    analytics.data.ordersCancelled +
    analytics.data.ordersRefunded;
  TestValidator.equals(
    "totalOrders equals sum of all status counts",
    analytics.data.totalOrders,
    statusSum,
  );
  // 6. Verify all metrics are non-negative integers
  TestValidator.predicate(
    "ordersCreated is non-negative",
    analytics.data.ordersCreated >= 0,
  );
  TestValidator.predicate(
    "ordersShipped is non-negative",
    analytics.data.ordersShipped >= 0,
  );
  TestValidator.predicate(
    "ordersDelivered is non-negative",
    analytics.data.ordersDelivered >= 0,
  );
  TestValidator.predicate(
    "ordersCancelled is non-negative",
    analytics.data.ordersCancelled >= 0,
  );
  TestValidator.predicate(
    "ordersRefunded is non-negative",
    analytics.data.ordersRefunded >= 0,
  );
  TestValidator.predicate(
    "totalOrders is non-negative",
    analytics.data.totalOrders >= 0,
  );
}
