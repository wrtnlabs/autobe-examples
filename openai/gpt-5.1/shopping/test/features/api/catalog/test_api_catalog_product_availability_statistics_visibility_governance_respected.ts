import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCatalogBlockReason";
import type { IPageIShoppingMallCatalogVisibilityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCatalogVisibilityRule";
import type { IPageIShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSku";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";
import type { IShoppingMallCatalogVisibilityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogVisibilityRule";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAvailabilityByState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAvailabilityByState";
import type { IShoppingMallProductAvailabilityStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAvailabilityStatistics";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Validate that product availability statistics respect catalog visibility and
 * governance rules.
 *
 * Business context:
 *
 * - The shopping mall exposes a public endpoint GET
 *   /shoppingMall/catalog/statistics/productAvailability that aggregates
 *   SKU/product availability metrics for dashboards and reports.
 * - Admins can configure governance via catalog block reasons and catalog
 *   visibility rules that hide or block specific SKUs or broader catalog
 *   scopes.
 * - This test must verify that those governance configurations are respected by
 *   the aggregated statistics and that the statistics payload is internally
 *   consistent.
 *
 * High‑level steps:
 *
 * 1. Bootstrap an admin using POST /auth/admin/join; the SDK wires the
 *    Authorization header into the shared connection.
 * 2. Call the public productAvailability statistics endpoint to take a baseline
 *    snapshot and validate internal invariants (non‑negative counts, sum of
 *    availabilityByState.skuCount == totalSkus, ratios in [0,1]).
 * 3. As admin, search SKUs via PATCH /shoppingMall/admin/skus to pick a target
 *    SKU, if any exist. If no SKUs exist, stop after basic invariant checks
 *    because governance cannot influence statistics.
 * 4. Create a catalog block reason configuration via POST
 *    /shoppingMall/admin/catalogBlockReasons and verify that at least one block
 *    reason is discoverable via the index endpoint; this exercises governance
 *    configuration paths.
 * 5. Create a SKU‑scoped catalog visibility rule of type "hide" via POST
 *    /shoppingMall/admin/catalogVisibilityRules, targeting the chosen SKU.
 *    Confirm via the index endpoint that at least one enabled hide rule exists
 *    for that SKU.
 * 6. Re‑call the productAvailability statistics endpoint to obtain an "after"
 *    snapshot and re‑validate invariants.
 * 7. Compare baseline vs. after snapshots to ensure that blockedOrHiddenSkuCount
 *    does not decrease and that totalSkus does not increase, while the sum of
 *    availabilityByState remains equal to totalSkus in both snapshots.
 *
 * The test focuses on relative changes and invariants rather than exact numeric
 * deltas, making it robust against environment‑specific catalog contents while
 * still validating that visibility/governance configuration influences
 * aggregate availability metrics.
 */
export async function test_api_catalog_product_availability_statistics_visibility_governance_respected(
  connection: api.IConnection,
) {
  // 1. Bootstrap an admin account and authentication context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Helper to assert internal invariants on statistics payload
  const assert_statistics_invariants = (
    titlePrefix: string,
    stats: IShoppingMallProductAvailabilityStatistics,
  ): void => {
    TestValidator.predicate(
      `${titlePrefix} - non-negative totalProducts`,
      stats.totalProducts >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - non-negative totalSkus`,
      stats.totalSkus >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - non-negative availableSkuCount`,
      stats.availableSkuCount >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - non-negative lowStockSkuCount`,
      stats.lowStockSkuCount >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - non-negative outOfStockSkuCount`,
      stats.outOfStockSkuCount >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - non-negative blockedOrHiddenSkuCount`,
      stats.blockedOrHiddenSkuCount >= 0,
    );

    const sumByState = stats.availabilityByState.reduce(
      (acc, state) => acc + state.skuCount,
      0,
    );
    TestValidator.equals(
      `${titlePrefix} - sum of availabilityByState.skuCount equals totalSkus`,
      stats.totalSkus,
      sumByState,
    );

    for (const state of stats.availabilityByState) {
      TestValidator.predicate(
        `${titlePrefix} - skuRatio within [0,1] for state ${state.stateCode}`,
        state.skuRatio >= 0 && state.skuRatio <= 1,
      );
    }
  };

  // 2. Baseline statistics (public endpoint, but Authorization header is harmless)
  const baselineStats: IShoppingMallProductAvailabilityStatistics =
    await api.functional.shoppingMall.catalog.statistics.productAvailability.at(
      connection,
    );
  typia.assert(baselineStats);
  assert_statistics_invariants("baseline", baselineStats);

  // 3. Search SKUs as admin to find a target SKU, if any
  const skuSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallSku.IRequest;

  const skuPage: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.admin.skus.index(connection, {
      body: skuSearchBody,
    });
  typia.assert(skuPage);

  if (skuPage.data.length === 0) {
    // No SKUs available; we already validated statistics invariants.
    // Governance rules cannot be meaningfully exercised without any SKUs.
    TestValidator.predicate(
      "no SKUs in admin search - baseline totalSkus should be zero or more",
      baselineStats.totalSkus >= 0,
    );
    return;
  }

  const targetSku: IShoppingMallSku.ISummary = skuPage.data[0];

  // 4. Create a catalog block reason configuration
  const blockReasonBody = {
    code: `e2e_block_reason_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    severity_level: "high",
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const blockReason: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      { body: blockReasonBody },
    );
  typia.assert(blockReason);

  const blockReasonSearchBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    search: undefined,
    severity_levels: undefined,
    include_deleted: false,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IShoppingMallCatalogBlockReason.IRequest;

  const blockReasonPage: IPageIShoppingMallCatalogBlockReason.ISummary =
    await api.functional.shoppingMall.admin.catalogBlockReasons.index(
      connection,
      { body: blockReasonSearchBody },
    );
  typia.assert(blockReasonPage);
  TestValidator.predicate(
    "at least one catalog block reason exists after creation",
    blockReasonPage.pagination.records >= 1,
  );

  // 5. Create a SKU-scoped catalog visibility rule to hide the selected SKU
  const nowIso = new Date().toISOString();
  const visibilityRuleBody = {
    rule_type: "hide",
    actor_type: null,
    region_code: null,
    enabled: true,
    starts_at: nowIso,
    ends_at: null,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    shopping_mall_seller_id: null,
    shopping_mall_product_id: null,
    shopping_mall_sku_id: targetSku.id,
  } satisfies IShoppingMallCatalogVisibilityRule.ICreate;

  const visibilityRule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.create(
      connection,
      { body: visibilityRuleBody },
    );
  typia.assert(visibilityRule);

  const visibilitySearchBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    enabled: true,
    rule_type: "hide",
    actor_type: null,
    region_code: null,
    shopping_mall_seller_id: null,
    shopping_mall_product_id: null,
    shopping_mall_sku_id: targetSku.id,
    starts_at_from: null,
    starts_at_to: null,
    ends_at_from: null,
    ends_at_to: null,
    reason_query: null,
  } satisfies IShoppingMallCatalogVisibilityRule.IRequest;

  const visibilityPage: IPageIShoppingMallCatalogVisibilityRule.ISummary =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.index(
      connection,
      { body: visibilitySearchBody },
    );
  typia.assert(visibilityPage);
  TestValidator.predicate(
    "at least one visibility rule exists for target SKU",
    visibilityPage.pagination.records >= 1,
  );

  // 6. Post-rule statistics snapshot
  const afterStats: IShoppingMallProductAvailabilityStatistics =
    await api.functional.shoppingMall.catalog.statistics.productAvailability.at(
      connection,
    );
  typia.assert(afterStats);
  assert_statistics_invariants("after", afterStats);

  // 7. Cross-snapshot governance assertions
  TestValidator.predicate(
    "blockedOrHiddenSkuCount should not decrease after adding hide rule",
    afterStats.blockedOrHiddenSkuCount >= baselineStats.blockedOrHiddenSkuCount,
  );

  TestValidator.predicate(
    "totalSkus after governance change is not greater than baseline",
    afterStats.totalSkus <= baselineStats.totalSkus,
  );

  const baselineSumByState = baselineStats.availabilityByState.reduce(
    (acc, state) => acc + state.skuCount,
    0,
  );
  const afterSumByState = afterStats.availabilityByState.reduce(
    (acc, state) => acc + state.skuCount,
    0,
  );

  TestValidator.equals(
    "baseline sum of skuCount by state matches totalSkus",
    baselineStats.totalSkus,
    baselineSumByState,
  );
  TestValidator.equals(
    "after sum of skuCount by state matches totalSkus",
    afterStats.totalSkus,
    afterSumByState,
  );
}
