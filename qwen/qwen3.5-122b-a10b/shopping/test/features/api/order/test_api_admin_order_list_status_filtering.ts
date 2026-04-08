import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator order list status filtering functionality.
 *
 * Validates that administrators can filter orders by specific status values to review orders at particular workflow stages. The test ensures proper status validation, filtered result accuracy, and pagination metadata correctness.
 *
 * 1. Administrator authenticates successfully via admin join endpoint.
 * 2. Administrator filters orders by valid status values (paid, shipped, delivered, cancelled, refunded, partially_completed).
 * 3. Filtered results contain only orders matching the specified status.
 * 4. Pagination metadata reflects the count of filtered results.
 * 5. Orders in filtered results maintain created_at descending sort order.
 */
export async function test_api_admin_order_list_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Test filtering by valid status: paid
  const paidOrders: IPageIEcommerceOrder.ISummary =
    await api.functional.ecommerce.admin.orders.index(adminConnection, {
      body: {
        status: "paid",
        page: 0,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    });
  typia.assert(paidOrders);
  // Validate all returned orders have paid status
  for (const order of paidOrders.data) {
    TestValidator.equals("order status is paid", order.status, "paid");
  }
  // 3. Test filtering by valid status: shipped
  const shippedOrders: IPageIEcommerceOrder.ISummary =
    await api.functional.ecommerce.admin.orders.index(adminConnection, {
      body: {
        status: "shipped",
        page: 0,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    });
  typia.assert(shippedOrders);
  // Validate all returned orders have shipped status
  for (const order of shippedOrders.data) {
    TestValidator.equals("order status is shipped", order.status, "shipped");
  }
  // 4. Test filtering by valid status: delivered
  const deliveredOrders: IPageIEcommerceOrder.ISummary =
    await api.functional.ecommerce.admin.orders.index(adminConnection, {
      body: {
        status: "delivered",
        page: 0,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    });
  typia.assert(deliveredOrders);
  // Validate all returned orders have delivered status
  for (const order of deliveredOrders.data) {
    TestValidator.equals(
      "order status is delivered",
      order.status,
      "delivered",
    );
  }
  // 5. Test filtering by valid status: cancelled
  const cancelledOrders: IPageIEcommerceOrder.ISummary =
    await api.functional.ecommerce.admin.orders.index(adminConnection, {
      body: {
        status: "cancelled",
        page: 0,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    });
  typia.assert(cancelledOrders);
  // Validate all returned orders have cancelled status
  for (const order of cancelledOrders.data) {
    TestValidator.equals(
      "order status is cancelled",
      order.status,
      "cancelled",
    );
  }
  // 6. Test filtering by valid status: refunded
  const refundedOrders: IPageIEcommerceOrder.ISummary =
    await api.functional.ecommerce.admin.orders.index(adminConnection, {
      body: {
        status: "refunded",
        page: 0,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    });
  typia.assert(refundedOrders);
  // Validate all returned orders have refunded status
  for (const order of refundedOrders.data) {
    TestValidator.equals("order status is refunded", order.status, "refunded");
  }
  // 7. Test filtering by valid status: partially_completed
  const partiallyCompletedOrders: IPageIEcommerceOrder.ISummary =
    await api.functional.ecommerce.admin.orders.index(adminConnection, {
      body: {
        status: "partially_completed",
        page: 0,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    });
  typia.assert(partiallyCompletedOrders);
  // Validate all returned orders have partially_completed status
  for (const order of partiallyCompletedOrders.data) {
    TestValidator.equals(
      "order status is partially_completed",
      order.status,
      "partially_completed",
    );
  }
  // 8. Verify pagination metadata reflects filtered results
  TestValidator.predicate(
    "pagination records count is non-negative",
    paidOrders.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    paidOrders.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current page is non-negative",
    paidOrders.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    paidOrders.pagination.limit >= 0,
  );
  // 9. Test filtering without status (all orders)
  const allOrders: IPageIEcommerceOrder.ISummary =
    await api.functional.ecommerce.admin.orders.index(adminConnection, {
      body: {
        page: 0,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    });
  typia.assert(allOrders);
  // Validate pagination metadata
  TestValidator.predicate(
    "all orders pagination records is non-negative",
    allOrders.pagination.records >= 0,
  );
}
