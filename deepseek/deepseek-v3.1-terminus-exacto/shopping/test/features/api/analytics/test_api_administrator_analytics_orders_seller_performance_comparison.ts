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

/**
 * Test administrator analytics for seller performance comparison.
 * Validates that platform-wide analytics provide comprehensive seller
 * performance metrics including revenue, order count, and average order values.
 */
export async function test_api_administrator_analytics_orders_seller_performance_comparison(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Test analytics with recent time filter (platform-wide)
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const currentTime = new Date().toISOString();
  const platformAnalytics =
    await api.functional.ecommerce.administrator.analytics.orders.analytics(
      adminConnection,
      {
        body: {
          created_after: thirtyDaysAgo,
          created_before: currentTime,
        } satisfies IEcommerceOrder.IRequest,
      },
    );
  typia.assert(platformAnalytics);
  // 3. Validate platform analytics structure
  TestValidator.predicate(
    "has seller performance array",
    platformAnalytics.seller_performance.length >= 0,
  );
  TestValidator.predicate(
    "has status distribution",
    platformAnalytics.status_distribution !== undefined,
  );
  TestValidator.predicate(
    "has valid total revenue",
    platformAnalytics.total_revenue >= 0,
  );
  TestValidator.predicate(
    "has valid order count",
    platformAnalytics.order_count >= 0,
  );
  // 4. Test seller performance metrics accuracy for each seller
  for (const seller of platformAnalytics.seller_performance) {
    TestValidator.predicate(
      "seller has valid revenue",
      seller.total_revenue >= 0,
    );
    TestValidator.predicate(
      "seller has valid order count",
      seller.order_count >= 0,
    );
    TestValidator.predicate(
      "seller has valid average order value",
      seller.average_order_value >= 0,
    );
    // Validate average order value calculation when orders exist
    if (seller.order_count > 0) {
      const calculatedAOV = seller.total_revenue / seller.order_count;
      TestValidator.equals(
        "average order value calculation",
        seller.average_order_value,
        calculatedAOV,
      );
    }
  }
  // 5. Validate comprehensive analytics data structure
  TestValidator.predicate(
    "has geographic distribution",
    platformAnalytics.geographic_distribution !== undefined,
  );
  TestValidator.predicate(
    "has hourly distribution",
    platformAnalytics.hourly_distribution.length >= 0,
  );
  TestValidator.predicate(
    "has category performance",
    platformAnalytics.product_category_performance.length >= 0,
  );
  // 6. Validate status distribution completeness
  const statusDistribution = platformAnalytics.status_distribution;
  TestValidator.predicate(
    "has paid status count",
    statusDistribution.paid >= 0,
  );
  TestValidator.predicate(
    "has shipped status count",
    statusDistribution.shipped >= 0,
  );
  TestValidator.predicate(
    "has delivered status count",
    statusDistribution.delivered >= 0,
  );
  TestValidator.predicate(
    "has cancelled status count",
    statusDistribution.cancelled >= 0,
  );
  TestValidator.predicate(
    "has refunded status count",
    statusDistribution.refunded >= 0,
  );
}
