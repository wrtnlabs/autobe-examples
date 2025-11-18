import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCatalogOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogOverview";

/**
 * Validate that the anonymous ShoppingMall catalog overview respects visibility
 * and governance rules.
 *
 * Business intent:
 *
 * - Ensure that the public catalog dashboard endpoint can be called without
 *   authentication.
 * - Confirm that the returned IShoppingMallCatalogOverview snapshot is
 *   structurally valid and type-safe.
 * - Verify key invariants around visibility-aware counts: visible guest product
 *   count must never exceed total active product count, and basic monotonic
 *   relations between category and SKU counters hold.
 * - Rely on external fixtures for concrete governance scenarios (e.g., products
 *   blocked by visibility rules or block reasons) and focus this test on
 *   invariants observable from a single overview call.
 */
export async function test_api_catalog_overview_reflects_visibility_rules_and_block_reasons(
  connection: api.IConnection,
) {
  // Call the public overview endpoint without additional authentication.
  const unauthenticatedConnection: api.IConnection = { ...connection };

  const overview: IShoppingMallCatalogOverview =
    await api.functional.shoppingMall.catalog.overview.at(
      unauthenticatedConnection,
    );

  // Structural and type validation
  typia.assert(overview);

  // Invariant 1: All core counters are non-negative integers by type, but
  // explicitly assert runtime expectations for clarity.
  TestValidator.predicate(
    "totalCategoryCount should be non-negative",
    overview.totalCategoryCount >= 0,
  );
  TestValidator.predicate(
    "activeProductCount should be non-negative",
    overview.activeProductCount >= 0,
  );
  TestValidator.predicate(
    "activeSkuCount should be non-negative",
    overview.activeSkuCount >= 0,
  );
  TestValidator.predicate(
    "topLevelCategoryCount should be non-negative",
    overview.topLevelCategoryCount >= 0,
  );
  TestValidator.predicate(
    "visibleProductCountForGuests should be non-negative",
    overview.visibleProductCountForGuests >= 0,
  );
  TestValidator.predicate(
    "visibilityRuleCount should be non-negative",
    overview.visibilityRuleCount >= 0,
  );

  // Invariant 2: visibleProductCountForGuests is a subset of activeProductCount
  // once governance rules and block reasons are applied.
  TestValidator.predicate(
    "visibleProductCountForGuests must not exceed activeProductCount",
    overview.visibleProductCountForGuests <= overview.activeProductCount,
  );

  // Invariant 3: There cannot be more top-level categories than total
  // categories.
  TestValidator.predicate(
    "topLevelCategoryCount must not exceed totalCategoryCount",
    overview.topLevelCategoryCount <= overview.totalCategoryCount,
  );

  // Invariant 4: If an averageProductRating exists, it must be between 0 and 5.
  if (
    overview.averageProductRating !== null &&
    overview.averageProductRating !== undefined
  ) {
    TestValidator.predicate(
      "averageProductRating must be between 0 and 5 when present",
      overview.averageProductRating >= 0 && overview.averageProductRating <= 5,
    );
  }

  // Invariant 5: updatedAt must be a valid ISO date-time string that can be
  // parsed by the JS Date constructor.
  const updatedAtDate = new Date(overview.updatedAt);
  TestValidator.predicate(
    "updatedAt should be a parsable ISO date-time string",
    !Number.isNaN(updatedAtDate.getTime()),
  );
}
