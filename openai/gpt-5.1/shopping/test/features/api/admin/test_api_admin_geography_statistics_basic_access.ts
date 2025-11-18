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

/**
 * Validate that an authenticated admin can access default geography statistics
 * and that the response structure is stable and business-sane.
 *
 * Business flow:
 *
 * 1. Register a fresh admin via POST /auth/admin/join.
 * 2. Use the same connection (with auto-attached Authorization header) to call GET
 *    /shoppingMall/admin/statistics/geography.
 * 3. Assert that the response matches IShoppingMallGeographyStatistics.
 * 4. For each region, assert key invariants on KPIs and payment method
 *    distributions.
 * 5. Call the geography endpoint twice and assert that both responses are
 *    structurally consistent (we do not enforce identical metrics, only that
 *    both are valid and reasonable).
 */
export async function test_api_admin_geography_statistics_basic_access(
  connection: api.IConnection,
) {
  // 1. Join as a new admin to obtain an authorized context.
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IShoppingMallAdminJoin.ICreate>(),
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);
  typia.assert<IAuthorizationToken>(adminAuth.token);

  // 2. First call to geography statistics as authenticated admin.
  const firstStats: IShoppingMallGeographyStatistics =
    await api.functional.shoppingMall.admin.statistics.geography.index(
      connection,
    );
  typia.assert<IShoppingMallGeographyStatistics>(firstStats);

  // Basic structural assertion using TestValidator.
  TestValidator.predicate(
    "regions should be an array (possibly empty)",
    Array.isArray(firstStats.regions),
  );

  // Helper to validate a single payment method share.
  const assertPaymentMethodShare = (
    share: IShoppingMallGeographyStatisticsPaymentMethodShare,
    index: number,
    regionLabel: string,
  ): void => {
    TestValidator.predicate(
      `payment method ${regionLabel}[${index}] has non-empty code`,
      share.paymentMethodCode.length > 0,
    );
    TestValidator.predicate(
      `payment method ${regionLabel}[${index}] has non-empty name`,
      share.paymentMethodName.length > 0,
    );
    TestValidator.predicate(
      `payment method ${regionLabel}[${index}] usageCount is non-negative`,
      Number.isInteger(share.usageCount) && share.usageCount >= 0,
    );
    TestValidator.predicate(
      `payment method ${regionLabel}[${index}] usageShare within [0,1]`,
      share.usageShare >= 0 && share.usageShare <= 1,
    );
    TestValidator.predicate(
      `payment method ${regionLabel}[${index}] revenueShare within [0,1]`,
      share.revenueShare >= 0 && share.revenueShare <= 1,
    );
  };

  // Helper to validate a single region entry with business invariants.
  const assertRegion = (
    region: IShoppingMallGeographyStatisticsRegion,
    index: number,
  ): void => {
    const label = `region#${index}`;

    TestValidator.predicate(
      `${label} countryCode should be non-empty`,
      region.countryCode.length > 0,
    );
    TestValidator.predicate(
      `${label} countryName should be non-empty`,
      region.countryName.length > 0,
    );

    TestValidator.predicate(
      `${label} totalOrders is non-negative integer`,
      Number.isInteger(region.totalOrders) && region.totalOrders >= 0,
    );
    TestValidator.predicate(
      `${label} totalRevenue is non-negative`,
      region.totalRevenue >= 0,
    );
    TestValidator.predicate(
      `${label} averageOrderValue is non-negative`,
      region.averageOrderValue >= 0,
    );

    if (region.totalOrders === 0) {
      // When there are no orders, averageOrderValue should logically be 0.
      TestValidator.equals(
        `${label} averageOrderValue is 0 when totalOrders is 0`,
        region.averageOrderValue,
        0,
      );
    } else {
      // When there are orders, averageOrderValue should not be 0 unless
      // totalRevenue is also 0; we just check consistency with revenue.
      TestValidator.predicate(
        `${label} averageOrderValue consistent with totalRevenue and totalOrders`,
        region.totalRevenue === 0
          ? region.averageOrderValue === 0
          : region.averageOrderValue > 0,
      );
    }

    // Ratios should be in [0,1]; typia tags guarantee this, but we enforce via
    // TestValidator as explicit business expectations and to ensure no NaN.
    const ratioChecks: Array<{
      name: string;
      value: number;
    }> = [
      { name: "onTimeDeliveryRate", value: region.onTimeDeliveryRate },
      { name: "refundRate", value: region.refundRate },
      { name: "disputeRate", value: region.disputeRate },
    ];

    for (const ratio of ratioChecks) {
      TestValidator.predicate(
        `${label} ${ratio.name} is not NaN`,
        Number.isFinite(ratio.value),
      );
      TestValidator.predicate(
        `${label} ${ratio.name} within [0,1]`,
        ratio.value >= 0 && ratio.value <= 1,
      );
    }

    // Payment method distribution invariants.
    TestValidator.predicate(
      `${label} primaryPaymentMethodDistributions is array`,
      Array.isArray(region.primaryPaymentMethodDistributions),
    );

    let usageShareSum = 0;
    let revenueShareSum = 0;

    region.primaryPaymentMethodDistributions.forEach((share, pIndex) => {
      assertPaymentMethodShare(share, pIndex, label);
      usageShareSum += share.usageShare;
      revenueShareSum += share.revenueShare;
    });

    const EPSILON = 1e-6;
    TestValidator.predicate(
      `${label} sum of usageShare does not exceed 1+epsilon`,
      usageShareSum <= 1 + EPSILON,
    );
    TestValidator.predicate(
      `${label} sum of revenueShare does not exceed 1+epsilon`,
      revenueShareSum <= 1 + EPSILON,
    );
  };

  // Validate all regions in the first response.
  firstStats.regions.forEach((region, index) => {
    typia.assert<IShoppingMallGeographyStatisticsRegion>(region);
    assertRegion(region, index);
  });

  // 3. Make a second call to check structural stability over repeated access.
  const secondStats: IShoppingMallGeographyStatistics =
    await api.functional.shoppingMall.admin.statistics.geography.index(
      connection,
    );
  typia.assert<IShoppingMallGeographyStatistics>(secondStats);

  TestValidator.predicate(
    "second call regions is an array (possibly empty)",
    Array.isArray(secondStats.regions),
  );

  // Structural consistency: we don't demand equality, but ensure that at least
  // the first region (if present) is still well-formed according to the same
  // invariants.
  if (secondStats.regions.length > 0) {
    typia.assert<IShoppingMallGeographyStatisticsRegion>(
      secondStats.regions[0],
    );
    assertRegion(secondStats.regions[0], 0);
  }

  // Optional sanity check: region count should be non-negative (trivial but
  // provides a named assertion for diagnostics).
  TestValidator.predicate(
    "region count is non-negative in first call",
    firstStats.regions.length >= 0,
  );
  TestValidator.predicate(
    "region count is non-negative in second call",
    secondStats.regions.length >= 0,
  );
}
