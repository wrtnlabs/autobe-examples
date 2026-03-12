import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an authenticated administrator can successfully retrieve comprehensive metrics
 * for an existing customer account. The test verifies that the admin can access customer
 * metrics endpoint and receive properly aggregated data across all metric categories.
 */
export async function test_api_customer_metrics_admin_view_active_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer authentication via join endpoint
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 3. Admin retrieves customer metrics
  const metrics = await api.functional.shoppingMall.admin.customers.metrics.at(
    adminConnection,
    {
      customerId: customerAuth.id,
    },
  );
  typia.assert(metrics);
  // 4. Validate order statistics structure and values
  TestValidator.equals(
    "totalOrders is zero for new customer",
    metrics.orderStatistics.totalOrders,
    0,
  );
  TestValidator.equals(
    "totalSpending is zero for new customer",
    metrics.orderStatistics.totalSpending,
    0,
  );
  TestValidator.equals(
    "averageOrderValue is zero when no orders",
    metrics.orderStatistics.averageOrderValue,
    0,
  );
  TestValidator.equals(
    "paid orders count is zero",
    metrics.orderStatistics.byStatus.paid,
    0,
  );
  TestValidator.equals(
    "shipped orders count is zero",
    metrics.orderStatistics.byStatus.shipped,
    0,
  );
  TestValidator.equals(
    "delivered orders count is zero",
    metrics.orderStatistics.byStatus.delivered,
    0,
  );
  TestValidator.equals(
    "cancelled orders count is zero",
    metrics.orderStatistics.byStatus.cancelled,
    0,
  );
  TestValidator.equals(
    "refunded orders count is zero",
    metrics.orderStatistics.byStatus.refunded,
    0,
  );
  // 5. Validate wishlist statistics
  TestValidator.equals(
    "wishlist totalItems is zero for new customer",
    metrics.wishlistStatistics.totalItems,
    0,
  );
  // 6. Validate cart statistics
  TestValidator.equals(
    "cart totalItems is zero for new customer",
    metrics.cartStatistics.totalItems,
    0,
  );
  TestValidator.equals(
    "cart totalValue is zero for new customer",
    metrics.cartStatistics.totalValue,
    0,
  );
  // 7. Validate review statistics
  TestValidator.equals(
    "totalReviews is zero for new customer",
    metrics.reviewStatistics.totalReviews,
    0,
  );
  TestValidator.equals(
    "averageRating is null when no reviews",
    metrics.reviewStatistics.averageRating,
    null,
  );
  // 8. Validate cancellation statistics
  TestValidator.equals(
    "cancellation totalRequests is zero",
    metrics.cancellationStatistics.totalRequests,
    0,
  );
  TestValidator.equals(
    "cancellation pending count is zero",
    metrics.cancellationStatistics.byStatus.pending,
    0,
  );
  TestValidator.equals(
    "cancellation approved count is zero",
    metrics.cancellationStatistics.byStatus.approved,
    0,
  );
  TestValidator.equals(
    "cancellation rejected count is zero",
    metrics.cancellationStatistics.byStatus.rejected,
    0,
  );
  // 9. Validate refund statistics
  TestValidator.equals(
    "refund totalRequests is zero",
    metrics.refundStatistics.totalRequests,
    0,
  );
  TestValidator.equals(
    "refund pending count is zero",
    metrics.refundStatistics.byStatus.pending,
    0,
  );
  TestValidator.equals(
    "refund approved count is zero",
    metrics.refundStatistics.byStatus.approved,
    0,
  );
  TestValidator.equals(
    "refund rejected count is zero",
    metrics.refundStatistics.byStatus.rejected,
    0,
  );
  // 10. Validate account info
  TestValidator.predicate("registrationDate is valid date-time", () => {
    const date = new Date(metrics.accountInfo.registrationDate);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate(
    "accountAgeInDays is non-negative",
    metrics.accountInfo.accountAgeInDays >= 0,
  );
}
