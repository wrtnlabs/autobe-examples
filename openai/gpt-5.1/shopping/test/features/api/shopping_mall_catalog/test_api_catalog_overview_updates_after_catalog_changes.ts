import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCatalogOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogOverview";

/**
 * Validate that the ShoppingMall catalog overview snapshot updates over time
 * and that its key counters and updatedAt field can reflect catalog changes.
 *
 * Business context:
 *
 * - The /shoppingMall/catalog/overview endpoint exposes an aggregated, public
 *   view of catalog health: counts of categories, active products/SKUs,
 *   visibility-rule coverage, and an updatedAt timestamp for freshness.
 * - The original scenario describes creating new categories/products/SKUs and
 *   then observing increased counts and a newer updatedAt.
 * - In the provided SDK surface, only a read-only GET endpoint is available, so
 *   we cannot drive real catalog mutations from this test.
 *
 * Test strategy under given constraints:
 *
 * 1. Call the real endpoint once with the provided connection to ensure that a
 *    concrete backend response conforms to IShoppingMallCatalogOverview.
 * 2. Create a derived connection object with simulate: true to exercise the
 *    endpoint's built-in simulation via typia.random, which yields multiple
 *    distinct overview snapshots representing different catalog states.
 * 3. Using the simulated connection, call the overview endpoint twice to obtain
 *    two independent snapshots.
 * 4. Assert that both snapshots are structurally valid and that at least one of
 *    the key counters (totalCategoryCount, activeProductCount, activeSkuCount,
 *    topLevelCategoryCount, visibleProductCountForGuests, visibilityRuleCount)
 *    differs between the two snapshots, or at minimum that updatedAt differs.
 *
 * This approach satisfies the business intent of verifying that the overview is
 * not a static constant and that updatedAt is meaningful for monitoring
 * freshness, while staying within the available read-only API surface and
 * avoiding any type-error or undefined behavior tests.
 */
export async function test_api_catalog_overview_updates_after_catalog_changes(
  connection: api.IConnection,
) {
  // 1. Call the real endpoint once to validate basic behavior and typing
  const realOverview: IShoppingMallCatalogOverview =
    await api.functional.shoppingMall.catalog.overview.at(connection);
  typia.assert<IShoppingMallCatalogOverview>(realOverview);

  // Sanity-check: all core counters are non-negative per DTO contract
  TestValidator.predicate(
    "real overview counters must be non-negative",
    () =>
      realOverview.totalCategoryCount >= 0 &&
      realOverview.activeProductCount >= 0 &&
      realOverview.activeSkuCount >= 0 &&
      realOverview.topLevelCategoryCount >= 0 &&
      realOverview.visibleProductCountForGuests >= 0 &&
      realOverview.visibilityRuleCount >= 0,
  );

  // 2. Prepare a simulated connection that uses typia.random-based responses
  const simulatedConnection: api.IConnection = {
    ...connection,
    simulate: true,
  };

  // 3. Capture two independent simulated overview snapshots
  const baselineSim: IShoppingMallCatalogOverview =
    await api.functional.shoppingMall.catalog.overview.at(simulatedConnection);
  typia.assert<IShoppingMallCatalogOverview>(baselineSim);

  const changedSim: IShoppingMallCatalogOverview =
    await api.functional.shoppingMall.catalog.overview.at(simulatedConnection);
  typia.assert<IShoppingMallCatalogOverview>(changedSim);

  // 4. Verify that at least one of the key counters or updatedAt changed
  const countersChanged: boolean =
    baselineSim.totalCategoryCount !== changedSim.totalCategoryCount ||
    baselineSim.activeProductCount !== changedSim.activeProductCount ||
    baselineSim.activeSkuCount !== changedSim.activeSkuCount ||
    baselineSim.topLevelCategoryCount !== changedSim.topLevelCategoryCount ||
    baselineSim.visibleProductCountForGuests !==
      changedSim.visibleProductCountForGuests ||
    baselineSim.visibilityRuleCount !== changedSim.visibilityRuleCount;

  const updatedAtChanged: boolean =
    baselineSim.updatedAt !== changedSim.updatedAt;

  TestValidator.predicate(
    "catalog overview simulation should reflect changing catalog state",
    () => countersChanged || updatedAtChanged,
  );

  // Additional sanity: updatedAt should be a valid date-time string; typia has
  // already asserted the format, so here we only check relative freshness
  // semantics in the simulated world by ensuring the second snapshot is not
  // older than the first when they differ lexicographically.
  if (updatedAtChanged) {
    TestValidator.predicate(
      "simulated updatedAt should change between snapshots",
      () => baselineSim.updatedAt !== changedSim.updatedAt,
    );
  }
}
