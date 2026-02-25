import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import type { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import type { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import type { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import type { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import type { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import type { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import type { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_analytics_orders_filtered_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Step 2: Define 7-day promotional period (Black Friday week simulation)
  const startDate = new Date("2024-11-22T00:00:00Z"); // Black Friday
  const endDate = new Date("2024-11-29T00:00:00Z"); // End of week
  // Step 3: Test analytics with date filtering
  const analyticsResponse =
    await api.functional.ecommerce.administrator.analytics.orders.analytics(
      adminConnection,
      {
        body: {
          created_after: startDate.toISOString(),
          created_before: endDate.toISOString(),
        } satisfies IEcommerceOrder.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // Step 4: Validate basic metrics
  TestValidator.predicate(
    "total revenue should be non-negative",
    analyticsResponse.total_revenue >= 0,
  );
  TestValidator.predicate(
    "order count should be non-negative integer",
    analyticsResponse.order_count >= 0,
  );
  TestValidator.predicate(
    "average order value should be non-negative",
    analyticsResponse.average_order_value >= 0,
  );
  // Step 5: Validate status distribution structure
  const statusDist = analyticsResponse.status_distribution;
  typia.assert(statusDist);
  TestValidator.predicate(
    "status distribution has all required fields",
    ("paid" in statusDist &&
      "shipped" in statusDist &&
      "delivered" in statusDist &&
      "cancelled" in statusDist &&
      "refunded" in statusDist) as boolean,
  );
  // Step 6: Validate seller performance array
  const sellerPerf = analyticsResponse.seller_performance;
  typia.assert(sellerPerf);
  TestValidator.predicate(
    "seller performance is an array",
    Array.isArray(sellerPerf),
  );
  // Step 7: Validate geographic distribution
  const geoDist = analyticsResponse.geographic_distribution;
  typia.assert(geoDist);
  TestValidator.predicate(
    "geographic distribution has all required fields",
    ("country_distribution" in geoDist &&
      "region_distribution" in geoDist &&
      "city_distribution" in geoDist &&
      "top_regions" in geoDist) as boolean,
  );
  // Step 8: Test empty results for future date range (no orders expected)
  const futureStart = new Date("2030-01-01T00:00:00Z");
  const futureEnd = new Date("2030-01-08T00:00:00Z");
  const emptyAnalytics =
    await api.functional.ecommerce.administrator.analytics.orders.analytics(
      adminConnection,
      {
        body: {
          created_after: futureStart.toISOString(),
          created_before: futureEnd.toISOString(),
        } satisfies IEcommerceOrder.IRequest,
      },
    );
  typia.assert(emptyAnalytics);
  TestValidator.equals(
    "future date range should have zero revenue",
    emptyAnalytics.total_revenue,
    0,
  );
  TestValidator.equals(
    "future date range should have zero orders",
    emptyAnalytics.order_count,
    0 as number & tags.Type<"int32">,
  );
  TestValidator.predicate(
    "future date range should have zero average order value",
    emptyAnalytics.average_order_value === 0,
  );
  // Step 9: Test boundary condition - same start and end date
  const sameDate = new Date("2024-11-22T00:00:00Z");
  const sameDayAnalytics =
    await api.functional.ecommerce.administrator.analytics.orders.analytics(
      adminConnection,
      {
        body: {
          created_after: sameDate.toISOString(),
          created_before: sameDate.toISOString(),
        } satisfies IEcommerceOrder.IRequest,
      },
    );
  typia.assert(sameDayAnalytics);
  // Step 10: Validate hourly distribution covers full day
  const hourlyDist = analyticsResponse.hourly_distribution;
  typia.assert(hourlyDist);
  if (hourlyDist.length > 0) {
    TestValidator.predicate(
      "hour values should be between 0-23",
      hourlyDist.every((hour) => hour.hour >= 0 && hour.hour <= 23),
    );
    TestValidator.predicate(
      "order counts should be non-negative",
      hourlyDist.every((hour) => hour.order_count >= 0),
    );
  }
  // Step 11: Validate business logic consistency
  if (analyticsResponse.order_count > 0) {
    const calculatedAvg =
      analyticsResponse.total_revenue / analyticsResponse.order_count;
    TestValidator.predicate(
      "calculated average matches reported average",
      Math.abs(analyticsResponse.average_order_value - calculatedAvg) < 0.01,
    );
  }
}
