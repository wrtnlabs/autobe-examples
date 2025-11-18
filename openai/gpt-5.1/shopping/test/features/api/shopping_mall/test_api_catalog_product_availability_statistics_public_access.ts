import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallProductAvailabilityByState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAvailabilityByState";
import type { IShoppingMallProductAvailabilityStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAvailabilityStatistics";

/**
 * Validate public access and structural consistency of product availability
 * statistics.
 *
 * Business purpose:
 *
 * - Ensure that aggregated product availability metrics for the ShoppingMall
 *   catalog are exposed as a public, read-only GET endpoint that requires no
 *   authentication.
 * - Validate that the response conforms to the analytical DTO
 *   IShoppingMallProductAvailabilityStatistics and that key aggregate fields
 *   are structurally consistent.
 *
 * Test steps:
 *
 * 1. Clone the incoming connection into an unauthenticated connection by providing
 *    an empty headers object. Do not touch headers afterward.
 * 2. Call GET /shoppingMall/catalog/statistics/productAvailability via
 *    api.functional.shoppingMall.catalog.statistics.productAvailability.at
 *    using the unauthenticated connection.
 * 3. Assert that the response structurally matches
 *    IShoppingMallProductAvailabilityStatistics using typia.assert.
 * 4. Perform additional structural and business-level consistency checks:
 *
 *    - Top level counters (totalProducts, totalSkus, availableSkuCount,
 *         lowStockSkuCount, outOfStockSkuCount, blockedOrHiddenSkuCount) are
 *         non-negative integers.
 *    - The sum of availability counters does not exceed totalSkus, and each
 *         individual counter is less than or equal to totalSkus.
 *    - AvailabilityByState is an array; each entry has:
 *
 *         - Non-empty stateCode,
 *         - SkuCount as a non-negative integer,
 *         - SkuRatio in the inclusive range [0, 1]. The sum of skuCount across all states
 *                   does not exceed totalSkus.
 *    - UpdatedAt can be parsed as a valid ISO 8601 date-time string.
 *
 * This test does not attempt to validate HTTP status codes explicitly and does
 * not create any type error scenarios. All type validation relies on
 * typia.assert, while TestValidator is used for business-rule-level consistency
 * assertions.
 */
export async function test_api_catalog_product_availability_statistics_public_access(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection (public access)
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  // 2. Call the public statistics endpoint without any Authorization header
  const stats: IShoppingMallProductAvailabilityStatistics =
    await api.functional.shoppingMall.catalog.statistics.productAvailability.at(
      publicConnection,
    );

  // 3. Type-level validation for the entire DTO
  typia.assert<IShoppingMallProductAvailabilityStatistics>(stats);

  // 4. Top-level integer counters must be non-negative
  const topLevelCounters: Array<[string, number]> = [
    ["totalProducts", stats.totalProducts],
    ["totalSkus", stats.totalSkus],
    ["availableSkuCount", stats.availableSkuCount],
    ["lowStockSkuCount", stats.lowStockSkuCount],
    ["outOfStockSkuCount", stats.outOfStockSkuCount],
    ["blockedOrHiddenSkuCount", stats.blockedOrHiddenSkuCount],
  ];

  for (const [name, value] of topLevelCounters) {
    TestValidator.predicate(
      `top-level counter '${name}' must be a non-negative integer`,
      Number.isInteger(value) && value >= 0,
    );
  }

  const totalSkus: number = stats.totalSkus;
  const sumAvailabilityCounters: number =
    stats.availableSkuCount +
    stats.lowStockSkuCount +
    stats.outOfStockSkuCount +
    stats.blockedOrHiddenSkuCount;

  TestValidator.predicate(
    "sum of availability counters must not exceed totalSkus",
    sumAvailabilityCounters <= totalSkus,
  );

  for (const [name, value] of topLevelCounters.filter(
    ([key]) => key !== "totalProducts" && key !== "totalSkus",
  )) {
    TestValidator.predicate(
      `availability counter '${name}' must not exceed totalSkus`,
      value <= totalSkus,
    );
  }

  // 5. Validate availabilityByState entries
  const byState: IShoppingMallProductAvailabilityByState[] =
    stats.availabilityByState;

  TestValidator.predicate(
    "availabilityByState must be an array",
    Array.isArray(byState),
  );

  let aggregatedSkuCount = 0;
  for (const state of byState) {
    // stateCode must be a non-empty string
    TestValidator.predicate(
      `stateCode must be a non-empty string (stateCode='${state.stateCode}')`,
      typeof state.stateCode === "string" && state.stateCode.length > 0,
    );

    // skuCount must be a non-negative integer
    TestValidator.predicate(
      `skuCount for state '${state.stateCode}' must be a non-negative integer`,
      Number.isInteger(state.skuCount) && state.skuCount >= 0,
    );

    // skuRatio must be within [0, 1]
    TestValidator.predicate(
      `skuRatio for state '${state.stateCode}' must be between 0 and 1`,
      state.skuRatio >= 0 && state.skuRatio <= 1,
    );

    aggregatedSkuCount += state.skuCount;
  }

  TestValidator.predicate(
    "sum of skuCount across availabilityByState must not exceed totalSkus",
    aggregatedSkuCount <= totalSkus,
  );

  // 6. Validate updatedAt as a parseable ISO 8601 date-time string
  const updatedDate = new Date(stats.updatedAt);
  TestValidator.predicate(
    "updatedAt must be a valid date-time string",
    !Number.isNaN(updatedDate.getTime()),
  );
}
