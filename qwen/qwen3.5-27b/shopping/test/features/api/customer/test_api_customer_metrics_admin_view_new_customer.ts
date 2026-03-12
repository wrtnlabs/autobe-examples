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
 * Test that an authenticated administrator can retrieve metrics for a customer account with no activity.
 *
 * This test verifies that:
 * 1. Admin authenticates via join endpoint
 * 2. A new customer account is created with no orders, wishlist items, cart items, reviews, or cancellation/refund requests
 * 3. Admin calls the metrics endpoint with the customer's ID
 * 4. Response contains all expected metric categories with zero/null values
 * 5. accountInfo contains valid registrationDate and accountAgeInDays (should be 0 or 1)
 * 6. No errors are returned despite empty data
 * 7. All required fields are present in the response
 */
export async function test_api_customer_metrics_admin_view_new_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create new customer with no activity
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Admin retrieves customer metrics
  const metrics = await api.functional.shoppingMall.admin.customers.metrics.at(
    adminConnection,
    {
      customerId: customer.id,
    },
  );
  typia.assert(metrics);
  // 4. Validate order statistics are all zeros
  TestValidator.equals(
    "totalOrders is 0",
    metrics.orderStatistics.totalOrders,
    0,
  );
  TestValidator.equals(
    "totalSpending is 0",
    metrics.orderStatistics.totalSpending,
    0,
  );
  TestValidator.equals(
    "averageOrderValue is 0",
    metrics.orderStatistics.averageOrderValue,
    0,
  );
  TestValidator.equals(
    "paid orders is 0",
    metrics.orderStatistics.byStatus.paid,
    0,
  );
  TestValidator.equals(
    "shipped orders is 0",
    metrics.orderStatistics.byStatus.shipped,
    0,
  );
  TestValidator.equals(
    "delivered orders is 0",
    metrics.orderStatistics.byStatus.delivered,
    0,
  );
  TestValidator.equals(
    "cancelled orders is 0",
    metrics.orderStatistics.byStatus.cancelled,
    0,
  );
  TestValidator.equals(
    "refunded orders is 0",
    metrics.orderStatistics.byStatus.refunded,
    0,
  );
  // 5. Validate wishlist statistics
  TestValidator.equals(
    "wishlist totalItems is 0",
    metrics.wishlistStatistics.totalItems,
    0,
  );
  // 6. Validate cart statistics
  TestValidator.equals(
    "cart totalItems is 0",
    metrics.cartStatistics.totalItems,
    0,
  );
  TestValidator.equals(
    "cart totalValue is 0",
    metrics.cartStatistics.totalValue,
    0,
  );
  // 7. Validate review statistics
  TestValidator.equals(
    "totalReviews is 0",
    metrics.reviewStatistics.totalReviews,
    0,
  );
  TestValidator.equals(
    "averageRating is null for new customer",
    metrics.reviewStatistics.averageRating,
    null,
  );
  // 8. Validate cancellation statistics
  TestValidator.equals(
    "cancellation totalRequests is 0",
    metrics.cancellationStatistics.totalRequests,
    0,
  );
  TestValidator.equals(
    "cancellation pending is 0",
    metrics.cancellationStatistics.byStatus.pending,
    0,
  );
  TestValidator.equals(
    "cancellation approved is 0",
    metrics.cancellationStatistics.byStatus.approved,
    0,
  );
  TestValidator.equals(
    "cancellation rejected is 0",
    metrics.cancellationStatistics.byStatus.rejected,
    0,
  );
  // 9. Validate refund statistics
  TestValidator.equals(
    "refund totalRequests is 0",
    metrics.refundStatistics.totalRequests,
    0,
  );
  TestValidator.equals(
    "refund pending is 0",
    metrics.refundStatistics.byStatus.pending,
    0,
  );
  TestValidator.equals(
    "refund approved is 0",
    metrics.refundStatistics.byStatus.approved,
    0,
  );
  TestValidator.equals(
    "refund rejected is 0",
    metrics.refundStatistics.byStatus.rejected,
    0,
  );
  // 10. Validate account info
  TestValidator.predicate(
    "registrationDate is valid",
    metrics.accountInfo.registrationDate !== null,
  );
  TestValidator.predicate(
    "accountAgeInDays is 0 or 1",
    metrics.accountInfo.accountAgeInDays === 0 ||
      metrics.accountInfo.accountAgeInDays === 1,
  );
}
