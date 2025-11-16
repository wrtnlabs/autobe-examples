import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallOrderTrendStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderTrendStatistics";

export async function test_api_order_trend_statistics_empty_dataset(
  connection: api.IConnection,
) {
  // Prepare unauthenticated connection (SDK still manages headers internally)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Call analytics endpoint without any orders (assumed empty dataset/window)
  const stats: IShoppingMallOrderTrendStatistics =
    await api.functional.shoppingMall.statistics.orderTrends.index(
      unauthConnection,
    );

  // Type-level validation of response structure
  typia.assert<IShoppingMallOrderTrendStatistics>(stats);

  // Overall summary should be neutral/zero for empty dataset
  TestValidator.equals(
    "overall.total_order_count is zero when no orders exist",
    stats.overall.total_order_count,
    0,
  );

  TestValidator.equals(
    "overall.total_gmv_amount is zero when no orders exist",
    stats.overall.total_gmv_amount,
    0,
  );

  TestValidator.equals(
    "overall.average_order_amount is zero when no orders exist",
    stats.overall.average_order_amount,
    0,
  );

  // Overall status counts: either empty array or only zero-count buckets
  for (const statusCount of stats.overall.status_counts) {
    TestValidator.equals(
      "overall.status_counts[*].order_count is zero in empty dataset",
      statusCount.order_count,
      0,
    );
  }

  // Buckets: may be empty or contain only empty/zero-valued buckets
  if (stats.buckets.length === 0) {
    TestValidator.equals(
      "buckets array is empty when there is no order data",
      stats.buckets.length,
      0,
    );
  } else {
    for (const bucket of stats.buckets) {
      TestValidator.equals(
        "time bucket order_count is zero when there is no order data",
        bucket.order_count,
        0,
      );

      TestValidator.equals(
        "time bucket total_gmv_amount is zero when there is no order data",
        bucket.total_gmv_amount,
        0,
      );

      TestValidator.equals(
        "time bucket average_order_amount is zero when there is no order data",
        bucket.average_order_amount,
        0,
      );

      for (const statusCount of bucket.status_counts) {
        TestValidator.equals(
          "time bucket status_counts[*].order_count is zero in empty dataset",
          statusCount.order_count,
          0,
        );
      }
    }
  }
}
