import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallGeographyStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGeographyStatistics";
import type { IShoppingMallGeographyStatisticsPaymentMethodShare } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGeographyStatisticsPaymentMethodShare";
import type { IShoppingMallGeographyStatisticsRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGeographyStatisticsRegion";

export async function test_api_admin_geography_statistics_response_stability_shape(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authenticated context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Call geography statistics endpoint as the authenticated admin
  const stats: IShoppingMallGeographyStatistics =
    await api.functional.shoppingMall.admin.statistics.geography.index(
      connection,
    );
  typia.assert<IShoppingMallGeographyStatistics>(stats);

  // 3. Basic structural checks on top-level statistics object
  TestValidator.predicate(
    "geography statistics: regions array is always defined",
    Array.isArray(stats.regions),
  );

  // 4. Iterate over each region and validate structural guarantees
  for (const region of stats.regions) {
    typia.assert<IShoppingMallGeographyStatisticsRegion>(region);

    // Required scalar KPIs should be usable directly (non-null, non-undefined)
    TestValidator.predicate(
      "region totalOrders is non-negative",
      region.totalOrders >= 0,
    );
    TestValidator.predicate(
      "region totalRevenue is non-negative",
      region.totalRevenue >= 0,
    );
    TestValidator.predicate(
      "region averageOrderValue is non-negative",
      region.averageOrderValue >= 0,
    );

    TestValidator.predicate(
      "region onTimeDeliveryRate within [0,1]",
      region.onTimeDeliveryRate >= 0 && region.onTimeDeliveryRate <= 1,
    );
    TestValidator.predicate(
      "region refundRate within [0,1]",
      region.refundRate >= 0 && region.refundRate <= 1,
    );
    TestValidator.predicate(
      "region disputeRate within [0,1]",
      region.disputeRate >= 0 && region.disputeRate <= 1,
    );

    TestValidator.predicate(
      "region averageDeliveryDays is non-negative",
      region.averageDeliveryDays >= 0,
    );

    // Optional, nullable fields must be safe to read; typia already validated
    // types, but we ensure reading them does not throw and shape is tolerant
    const _regionCode = region.regionCode ?? null;
    const _regionName = region.regionName ?? null;
    const _notes = region.notes ?? null;

    TestValidator.predicate(
      "region optional fields are either null or string when present",
      (_regionCode === null || typeof _regionCode === "string") &&
        (_regionName === null || typeof _regionName === "string") &&
        (_notes === null || typeof _notes === "string"),
    );

    // primaryPaymentMethodDistributions must always be an array (can be empty)
    TestValidator.predicate(
      "region primaryPaymentMethodDistributions is an array",
      Array.isArray(region.primaryPaymentMethodDistributions),
    );

    for (const share of region.primaryPaymentMethodDistributions) {
      typia.assert<IShoppingMallGeographyStatisticsPaymentMethodShare>(share);

      TestValidator.predicate(
        "payment method usageCount is non-negative",
        share.usageCount >= 0,
      );
      TestValidator.predicate(
        "payment method usageShare within [0,1]",
        share.usageShare >= 0 && share.usageShare <= 1,
      );
      TestValidator.predicate(
        "payment method revenueShare within [0,1]",
        share.revenueShare >= 0 && share.revenueShare <= 1,
      );
    }
  }
}
