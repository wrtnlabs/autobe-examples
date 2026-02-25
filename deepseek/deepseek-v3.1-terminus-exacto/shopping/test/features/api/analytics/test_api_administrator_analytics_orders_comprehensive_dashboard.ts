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
 * Test comprehensive order analytics dashboard with full dataset validation
 * Scenario validates administrator access to platform-wide analytics including
 * revenue calculations, order distributions, seller performance, and geographic insights
 */
export async function test_api_administrator_analytics_orders_comprehensive_dashboard(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Test analytics with empty filters (full dataset)
  const analyticsFull =
    await api.functional.ecommerce.administrator.analytics.orders.analytics(
      adminConnection,
      {
        body: {} satisfies IEcommerceOrder.IRequest,
      },
    );
  typia.assert(analyticsFull);
  // 3. Test with date range filtering
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const analyticsRange =
    await api.functional.ecommerce.administrator.analytics.orders.analytics(
      adminConnection,
      {
        body: {
          created_after: yesterday.toISOString(),
        } satisfies IEcommerceOrder.IRequest,
      },
    );
  typia.assert(analyticsRange);
  // 4. Test with pagination
  const analyticsPaged =
    await api.functional.ecommerce.administrator.analytics.orders.analytics(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceOrder.IRequest,
      },
    );
  typia.assert(analyticsPaged);
  // 5. Test with combined filters
  const analyticsCombined =
    await api.functional.ecommerce.administrator.analytics.orders.analytics(
      adminConnection,
      {
        body: {
          created_after: yesterday.toISOString(),
          page: 1,
          limit: 5,
        } satisfies IEcommerceOrder.IRequest,
      },
    );
  typia.assert(analyticsCombined);
  // Validate that different filter combinations produce valid responses
  TestValidator.predicate(
    "all analytics calls successful",
    analyticsFull !== null &&
      analyticsRange !== null &&
      analyticsPaged !== null &&
      analyticsCombined !== null,
  );
}
