import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerMonthlyOrderTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerMonthlyOrderTrend";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated administrator can successfully retrieve comprehensive metrics for a specific seller account.
 * Validates all metric categories including order items stats, revenue, shipment stats, cancellation/refund request stats,
 * ratings, reviews, monthly trends, and derived rates.
 */
export async function test_api_seller_metrics_admin_access_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate a valid sellerId for metrics query
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve seller metrics
  const metrics = await api.functional.shoppingMall.admin.sellers.metrics.at(
    adminConnection,
    { sellerId },
  );
  typia.assert(metrics);
  // 4. Validate order items stats - all counts should be non-negative
  TestValidator.equals(
    "paid order items count is non-negative",
    metrics.order_items_stats.paid >= 0,
    true,
  );
  TestValidator.equals(
    "shipped order items count is non-negative",
    metrics.order_items_stats.shipped >= 0,
    true,
  );
  TestValidator.equals(
    "delivered order items count is non-negative",
    metrics.order_items_stats.delivered >= 0,
    true,
  );
  TestValidator.equals(
    "cancelled order items count is non-negative",
    metrics.order_items_stats.cancelled >= 0,
    true,
  );
  TestValidator.equals(
    "refunded order items count is non-negative",
    metrics.order_items_stats.refunded >= 0,
    true,
  );
  // 5. Validate total revenue is non-negative
  TestValidator.predicate(
    "total revenue is non-negative",
    metrics.total_revenue >= 0,
  );
  // 6. Validate shipment stats
  TestValidator.equals(
    "total shipments is non-negative",
    metrics.shipment_stats.total_shipments >= 0,
    true,
  );
  TestValidator.predicate(
    "delivery confirmation rate is between 0 and 1",
    metrics.shipment_stats.delivery_confirmation_rate >= 0 &&
      metrics.shipment_stats.delivery_confirmation_rate <= 1,
  );
  // 7. Validate cancellation request stats
  TestValidator.equals(
    "pending cancellations is non-negative",
    metrics.cancellation_request_stats.pending >= 0,
    true,
  );
  TestValidator.equals(
    "approved cancellations is non-negative",
    metrics.cancellation_request_stats.approved >= 0,
    true,
  );
  TestValidator.equals(
    "rejected cancellations is non-negative",
    metrics.cancellation_request_stats.rejected >= 0,
    true,
  );
  // 8. Validate refund request stats
  TestValidator.equals(
    "pending refunds is non-negative",
    metrics.refund_request_stats.pending >= 0,
    true,
  );
  TestValidator.equals(
    "approved refunds is non-negative",
    metrics.refund_request_stats.approved >= 0,
    true,
  );
  TestValidator.equals(
    "rejected refunds is non-negative",
    metrics.refund_request_stats.rejected >= 0,
    true,
  );
  // 9. Validate average rating (can be null or between 1-5)
  if (metrics.average_rating !== null) {
    TestValidator.predicate(
      "average rating is between 1 and 5",
      metrics.average_rating >= 1 && metrics.average_rating <= 5,
    );
  }
  // 10. Validate total reviews is non-negative
  TestValidator.equals(
    "total reviews is non-negative",
    metrics.total_reviews >= 0,
    true,
  );
  // 11. Validate monthly order trends
  TestValidator.predicate(
    "monthly order trends has at most 12 items",
    metrics.monthly_order_trends.length <= 12,
  );
  await ArrayUtil.asyncForEach(metrics.monthly_order_trends, async (trend) => {
    // Validate month format (YYYY-MM)
    TestValidator.predicate(
      `month format is YYYY-MM for ${trend.month}`,
      /^[0-9]{4}-[0-9]{2}$/.test(trend.month),
    );
    // Validate order item count is non-negative
    TestValidator.equals(
      `order item count is non-negative for ${trend.month}`,
      trend.orderItemCount >= 0,
      true,
    );
    // Validate revenue is non-negative
    TestValidator.predicate(
      `revenue is non-negative for ${trend.month}`,
      trend.revenue >= 0,
    );
  });
  // 12. Validate derived rates are between 0 and 1
  TestValidator.predicate(
    "cancellation rate is between 0 and 1",
    metrics.cancellation_rate >= 0 && metrics.cancellation_rate <= 1,
  );
  TestValidator.predicate(
    "refund rate is between 0 and 1",
    metrics.refund_rate >= 0 && metrics.refund_rate <= 1,
  );
  TestValidator.predicate(
    "delivery confirmation rate is between 0 and 1",
    metrics.delivery_confirmation_rate >= 0 &&
      metrics.delivery_confirmation_rate <= 1,
  );
}
