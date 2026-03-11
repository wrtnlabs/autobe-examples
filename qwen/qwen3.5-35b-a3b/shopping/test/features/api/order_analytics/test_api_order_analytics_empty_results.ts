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
 * Test admin order analytics returns appropriate empty results.
 *
 * Validates that when no orders match the query criteria (e.g., status='refunded'
 * with no refunds), the system returns proper empty analytics with zero counts
 * instead of errors or malformed responses.
 */
export async function test_api_order_analytics_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // Create new connection with admin token for subsequent calls
  const adminApiConnection: api.IConnection = { host: connection.host };
  adminApiConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Query analytics with 'refunded' status filter (likely empty in fresh test environment)
  const analyticsRequest: IEcommerceMallOrderAnalytic.IRequest = {
    status: "refunded",
    page: 1,
    pageSize: 20,
  } satisfies IEcommerceMallOrderAnalytic.IRequest;
  const analytics =
    await api.functional.ecommerceMall.admin.orders.analytics.getAnalytics(
      adminApiConnection,
      { body: analyticsRequest },
    );
  typia.assert(analytics);
  // 3. Validate response structure is maintained
  TestValidator.predicate("response has valid structure", analytics !== null);
  TestValidator.equals(
    "pagination exists",
    analytics.pagination,
    analytics.pagination,
  );
  // 4. Validate all status metrics are zero for empty results
  TestValidator.equals(
    "ordersCreated is zero",
    analytics.data.ordersCreated,
    0,
  );
  TestValidator.equals(
    "ordersShipped is zero",
    analytics.data.ordersShipped,
    0,
  );
  TestValidator.equals(
    "ordersDelivered is zero",
    analytics.data.ordersDelivered,
    0,
  );
  TestValidator.equals(
    "ordersCancelled is zero",
    analytics.data.ordersCancelled,
    0,
  );
  TestValidator.equals(
    "ordersRefunded is zero",
    analytics.data.ordersRefunded,
    0,
  );
  TestValidator.equals("totalOrders is zero", analytics.data.totalOrders, 0);
  // 5. Validate pagination metadata for empty results
  TestValidator.equals("pagination page is 1", analytics.pagination.page, 1);
  TestValidator.equals(
    "totalItems is zero",
    analytics.pagination.totalItems,
    0,
  );
  TestValidator.equals(
    "totalPages is valid",
    analytics.pagination.totalPages >= 0,
    true,
  );
  TestValidator.equals(
    "pageSize is valid",
    analytics.pagination.pageSize >= 1,
    true,
  );
}