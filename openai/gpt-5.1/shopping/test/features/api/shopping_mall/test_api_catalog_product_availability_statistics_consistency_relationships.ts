import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallProductAvailabilityByState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAvailabilityByState";
import type { IShoppingMallProductAvailabilityStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAvailabilityStatistics";

/**
 * Validate internal consistency relationships in ShoppingMall catalog product
 * availability statistics.
 *
 * Business goal: Ensure that the read-only analytics endpoint GET
 * /shoppingMall/catalog/statistics/productAvailability returns an
 * IShoppingMallProductAvailabilityStatistics object whose aggregate counters
 * and per-state breakdown are numerically consistent.
 *
 * Steps:
 *
 * 1. Call the public endpoint without any explicit Authorization header.
 * 2. Validate the response structure using typia.assert.
 * 3. Check intra-field numerical invariants on counts and ratios.
 * 4. Optionally perform a second call to sanity-check updatedAt freshness and
 *    non-regressive behavior.
 */
export async function test_api_catalog_product_availability_statistics_consistency_relationships(
  connection: api.IConnection,
) {
  // 1. Call the public endpoint (no extra headers, rely on SDK behavior)
  const stats: IShoppingMallProductAvailabilityStatistics =
    await api.functional.shoppingMall.catalog.statistics.productAvailability.at(
      connection,
    );

  // 2. Basic structural validation
  typia.assert<IShoppingMallProductAvailabilityStatistics>(stats);

  // 3. Bucket sum vs totalSkus
  const bucketSum: number =
    stats.availableSkuCount +
    stats.lowStockSkuCount +
    stats.outOfStockSkuCount +
    stats.blockedOrHiddenSkuCount;

  TestValidator.predicate(
    "bucketSum must be less than or equal to totalSkus",
    () => bucketSum <= stats.totalSkus,
  );

  // 4. availabilityByState invariants
  const totalStateSkuCount: number = stats.availabilityByState.reduce(
    (sum: number, state: IShoppingMallProductAvailabilityByState) =>
      sum + state.skuCount,
    0,
  );

  TestValidator.predicate(
    "sum of availabilityByState.skuCount must be <= totalSkus",
    () => totalStateSkuCount <= stats.totalSkus,
  );

  const totalStateSkuRatio: number = stats.availabilityByState.reduce(
    (sum: number, state: IShoppingMallProductAvailabilityByState) =>
      sum + state.skuRatio,
    0,
  );

  const ratioEpsilon: number = 1e-6;
  TestValidator.predicate(
    "sum of availabilityByState.skuRatio must be <= 1 (with epsilon)",
    () => totalStateSkuRatio <= 1 + ratioEpsilon,
  );

  // 5. Per-state vs global bucket bounds for OUT_OF_STOCK and BLOCKED
  const uppercasedStates: IShoppingMallProductAvailabilityByState[] =
    stats.availabilityByState.map(
      (
        state: IShoppingMallProductAvailabilityByState,
      ): IShoppingMallProductAvailabilityByState => ({
        ...state,
        stateCode: state.stateCode.toUpperCase(),
      }),
    );

  const outOfStockStates: IShoppingMallProductAvailabilityByState[] =
    uppercasedStates.filter(
      (state: IShoppingMallProductAvailabilityByState): boolean =>
        state.stateCode === "OUT_OF_STOCK",
    );

  const blockedStates: IShoppingMallProductAvailabilityByState[] =
    uppercasedStates.filter(
      (state: IShoppingMallProductAvailabilityByState): boolean =>
        state.stateCode === "BLOCKED" ||
        state.stateCode === "BLOCKED_OR_HIDDEN",
    );

  const totalOutOfStockStateSkuCount: number = outOfStockStates.reduce(
    (sum: number, state: IShoppingMallProductAvailabilityByState) =>
      sum + state.skuCount,
    0,
  );

  const totalBlockedStateSkuCount: number = blockedStates.reduce(
    (sum: number, state: IShoppingMallProductAvailabilityByState) =>
      sum + state.skuCount,
    0,
  );

  TestValidator.predicate(
    "OUT_OF_STOCK state skuCount must be <= outOfStockSkuCount",
    () => totalOutOfStockStateSkuCount <= stats.outOfStockSkuCount,
  );

  TestValidator.predicate(
    "BLOCKED/BLOCKED_OR_HIDDEN state skuCount must be <= blockedOrHiddenSkuCount",
    () => totalBlockedStateSkuCount <= stats.blockedOrHiddenSkuCount,
  );

  // 6. Optional second call to validate updatedAt monotonicity/freshness
  const firstUpdatedAt: Date = new Date(stats.updatedAt);

  // Ensure updatedAt is a valid date
  TestValidator.predicate(
    "first updatedAt must be a valid date",
    () => !Number.isNaN(firstUpdatedAt.getTime()),
  );

  const secondStats: IShoppingMallProductAvailabilityStatistics =
    await api.functional.shoppingMall.catalog.statistics.productAvailability.at(
      connection,
    );
  typia.assert<IShoppingMallProductAvailabilityStatistics>(secondStats);

  const secondUpdatedAt: Date = new Date(secondStats.updatedAt);
  TestValidator.predicate(
    "second updatedAt must be a valid date",
    () => !Number.isNaN(secondUpdatedAt.getTime()),
  );

  // Monotonic or at least not significantly older than the first call
  TestValidator.predicate(
    "second updatedAt should not be significantly older than first updatedAt",
    () => secondUpdatedAt.getTime() + 5 * 60 * 1000 >= firstUpdatedAt.getTime(),
  );
}
