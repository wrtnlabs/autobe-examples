import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCatalogOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogOverview";

/**
 * Validate public, unauthenticated access to the ShoppingMall catalog overview
 * and verify the integrity of the aggregated counters.
 *
 * Business goals validated by this test:
 *
 * 1. The catalog overview endpoint is publicly accessible without any
 *    Authorization header or authentication flow.
 * 2. The response strictly conforms to IShoppingMallCatalogOverview and passes
 *    typia structural validation.
 * 3. All aggregate counters are non-negative 32-bit integers as tagged, and the
 *    optional averageProductRating, when present, lies between 0 and 5
 *    inclusive.
 * 4. Two invocations (baseline connection and explicit "guest" connection with
 *    empty headers) both succeed and return logically consistent aggregate
 *    values, demonstrating that the endpoint behaves as a read-only,
 *    aggregation-style, public dashboard API.
 */
export async function test_api_catalog_overview_public_access_and_shape(
  connection: api.IConnection,
) {
  // 1. Call catalog overview with the provided base connection.
  const overview: IShoppingMallCatalogOverview =
    await api.functional.shoppingMall.catalog.overview.at(connection);
  // Strictly validate shape and tagged constraints.
  typia.assert(overview);

  // 2. Basic non-negativity invariants for aggregate counters.
  TestValidator.predicate(
    "totalCategoryCount is non-negative",
    overview.totalCategoryCount >= 0,
  );
  TestValidator.predicate(
    "activeProductCount is non-negative",
    overview.activeProductCount >= 0,
  );
  TestValidator.predicate(
    "activeSkuCount is non-negative",
    overview.activeSkuCount >= 0,
  );
  TestValidator.predicate(
    "topLevelCategoryCount is non-negative",
    overview.topLevelCategoryCount >= 0,
  );
  TestValidator.predicate(
    "visibleProductCountForGuests is non-negative",
    overview.visibleProductCountForGuests >= 0,
  );
  TestValidator.predicate(
    "visibilityRuleCount is non-negative",
    overview.visibilityRuleCount >= 0,
  );

  // 3. Validate optional averageProductRating semantics when present.
  if (
    overview.averageProductRating !== null &&
    overview.averageProductRating !== undefined
  ) {
    TestValidator.predicate(
      "averageProductRating is within [0, 5] when present",
      overview.averageProductRating >= 0 && overview.averageProductRating <= 5,
    );
  }

  // 4. Derive an explicit guest connection with empty headers, ensuring we do
  // not mutate the original connection.headers (forbidden by policy).
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const guestOverview: IShoppingMallCatalogOverview =
    await api.functional.shoppingMall.catalog.overview.at(guestConnection);
  typia.assert(guestOverview);

  // 5. Re-validate invariants for the guest call.
  TestValidator.predicate(
    "guest totalCategoryCount is non-negative",
    guestOverview.totalCategoryCount >= 0,
  );
  TestValidator.predicate(
    "guest activeProductCount is non-negative",
    guestOverview.activeProductCount >= 0,
  );
  TestValidator.predicate(
    "guest activeSkuCount is non-negative",
    guestOverview.activeSkuCount >= 0,
  );
  TestValidator.predicate(
    "guest topLevelCategoryCount is non-negative",
    guestOverview.topLevelCategoryCount >= 0,
  );
  TestValidator.predicate(
    "guest visibleProductCountForGuests is non-negative",
    guestOverview.visibleProductCountForGuests >= 0,
  );
  TestValidator.predicate(
    "guest visibilityRuleCount is non-negative",
    guestOverview.visibilityRuleCount >= 0,
  );

  if (
    guestOverview.averageProductRating !== null &&
    guestOverview.averageProductRating !== undefined
  ) {
    TestValidator.predicate(
      "guest averageProductRating is within [0, 5] when present",
      guestOverview.averageProductRating >= 0 &&
        guestOverview.averageProductRating <= 5,
    );
  }

  // 6. Ensure that key aggregate counters match between base and explicit
  // guest calls, reflecting that the endpoint is public and read-only.
  TestValidator.equals(
    "totalCategoryCount matches between base and guest calls",
    overview.totalCategoryCount,
    guestOverview.totalCategoryCount,
  );
  TestValidator.equals(
    "activeProductCount matches between base and guest calls",
    overview.activeProductCount,
    guestOverview.activeProductCount,
  );
  TestValidator.equals(
    "activeSkuCount matches between base and guest calls",
    overview.activeSkuCount,
    guestOverview.activeSkuCount,
  );
  TestValidator.equals(
    "topLevelCategoryCount matches between base and guest calls",
    overview.topLevelCategoryCount,
    guestOverview.topLevelCategoryCount,
  );
  TestValidator.equals(
    "visibleProductCountForGuests matches between base and guest calls",
    overview.visibleProductCountForGuests,
    guestOverview.visibleProductCountForGuests,
  );
  TestValidator.equals(
    "visibilityRuleCount matches between base and guest calls",
    overview.visibilityRuleCount,
    guestOverview.visibilityRuleCount,
  );
}
