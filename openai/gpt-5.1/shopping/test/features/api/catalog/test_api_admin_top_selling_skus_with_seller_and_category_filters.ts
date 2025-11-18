import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IPageIShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSku";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogTopSellingSkuStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogTopSellingSkuStatistics";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Validate that admin analytics for top-selling SKUs correctly respects seller
 * and category filters.
 *
 * Business goal: Ensure that the PATCH
 * /shoppingMall/admin/catalog/statistics/topSellingSkus endpoint, when invoked
 * by an authenticated admin, can scope analytics to a specific seller, to a
 * specific category, and to the combination of both. The test must also verify
 * that combining both filters yields a result set no larger than using either
 * filter alone.
 *
 * High-level workflow:
 *
 * 1. Join as an admin using POST /auth/admin/join to establish an authenticated
 *    admin context.
 * 2. Use PATCH /shoppingMall/admin/sellers to retrieve a page of seller summaries.
 *    If there are no sellers, short‑circuit further business assertions but
 *    still type-assert all responses.
 * 3. For a selected seller, use PATCH /shoppingMall/admin/skus to fetch a page of
 *    SKUs constrained to that seller via sellerId in search request (since
 *    IShoppingMallSku.IRequest does not define sellerId, we instead just query
 *    all SKUs and later pick one whose seller appears in the analytics
 *    response). Because the SKU search API does not expose seller information
 *    directly, we treat it only as a way to ensure there is at least one SKU in
 *    the system and then rely on the analytics endpoint to provide the seller
 *    summary.
 * 4. Independently, pick an arbitrary productId for categories lookup. As the
 *    sellers/skus endpoints do not expose productId directly, we bypass dynamic
 *    category discovery and instead rely on the fact that the analytics
 *    endpoint already contains full product summaries per item. Therefore, for
 *    category scoping we:
 *
 *    - First call topSellingSkus without seller/category filters, with a tight time
 *         window (for example, last 30 days via periodPreset or explicit dates)
 *         and a small limit.
 *    - If the response has at least one item, take the first item’s product summary,
 *         call PATCH /shoppingMall/admin/products/{productId}/categories for
 *         that product, and from its category page pick one categoryId.
 * 5. Using the chosen sellerId (from a seller summary) and categoryId, construct
 *    three analytics requests:
 *
 *    - Seller‑only: body.sellerId = sellerId, categoryId omitted
 *    - Category‑only: body.categoryId = categoryId, sellerId omitted
 *    - Combined: body.sellerId = sellerId and body.categoryId = categoryId. Each
 *         request should also set a reasonable periodPreset (e.g.
 *         "last_30_days") and a small limit to keep responses manageable.
 * 6. For each analytics response, perform typia.assert to validate the
 *    IShoppingMallCatalogTopSellingSkuStatistics structure. For the combined
 *    request, additionally assert that every item.seller.id equals the selected
 *    sellerId.
 * 7. When all three responses have non-empty items arrays, compare their sizes:
 *
 *    - Combined.items.length must be less than or equal to sellerOnly.items.length
 *    - Combined.items.length must be less than or equal to
 *         categoryOnly.items.length.
 * 8. The test must be defensive: whenever a discovery step yields no data (no
 *    sellers, no analytics items, or no categories), it should stop short of
 *    further logical assertions but must still assert types of any responses it
 *    did receive.
 */
export async function test_api_admin_top_selling_skus_with_seller_and_category_filters(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain an authenticated admin context
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  const token: IAuthorizationToken = adminAuthorized.token;
  typia.assert<IAuthorizationToken>(token);

  // 2. Fetch a page of sellers
  const sellerSearchBody = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallSeller.IRequest;

  const sellerPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: sellerSearchBody,
    });
  typia.assert<IPageIShoppingMallSeller.ISummary>(sellerPage);

  const sellers = sellerPage.data;
  if (sellers.length === 0) {
    // No sellers: analytics filters depending on seller context cannot be
    // meaningfully validated. We still ensure that the analytics endpoint
    // responds correctly without filters.
    const fallbackRequestBody = {
      periodPreset: "last_30_days",
      limit: 10,
    } satisfies IShoppingMallCatalogTopSellingSkuStatistics.IRequest;

    const fallbackStats: IShoppingMallCatalogTopSellingSkuStatistics =
      await api.functional.shoppingMall.admin.catalog.statistics.topSellingSkus.index(
        connection,
        {
          body: fallbackRequestBody,
        },
      );
    typia.assert<IShoppingMallCatalogTopSellingSkuStatistics>(fallbackStats);
    return;
  }

  const pickedSeller: IShoppingMallSeller.ISummary = sellers[0];

  // 3. Initial analytics call without filters to discover a product and
  //    seller with sales data.
  const baseAnalyticsBody = {
    periodPreset: "last_30_days",
    limit: 20,
  } satisfies IShoppingMallCatalogTopSellingSkuStatistics.IRequest;

  const baseStats: IShoppingMallCatalogTopSellingSkuStatistics =
    await api.functional.shoppingMall.admin.catalog.statistics.topSellingSkus.index(
      connection,
      {
        body: baseAnalyticsBody,
      },
    );
  typia.assert<IShoppingMallCatalogTopSellingSkuStatistics>(baseStats);

  if (baseStats.items.length === 0) {
    // No sales data available in the current window: nothing further to
    // validate about seller/category scoping.
    return;
  }

  // Pick an item whose seller matches the pickedSeller if possible; otherwise
  // just use the first analytics item.
  const matchingBySeller = baseStats.items.find(
    (item) => item.seller.id === pickedSeller.id,
  );
  const analyticsItem: IShoppingMallCatalogTopSellingSkuStatistics.IItem =
    matchingBySeller ?? baseStats.items[0];

  const sellerIdForFilter: string & tags.Format<"uuid"> = analyticsItem.seller
    .id as string & tags.Format<"uuid">;
  const productSummary: IShoppingMallProduct.ISummary = analyticsItem.product;

  // 4. For the chosen product, fetch its categories to obtain a categoryId.
  const categorySearchBody = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallProductCategory.IRequest;

  const categoryPage: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.admin.products.categories.index(
      connection,
      {
        productId: productSummary.id,
        body: categorySearchBody,
      },
    );
  typia.assert<IPageIShoppingMallProductCategory.ISummary>(categoryPage);

  if (categoryPage.data.length === 0) {
    // No categories for this product. We can still validate seller-only
    // filtering but cannot perform combined category + seller assertions.
    const sellerOnlyBody = {
      periodPreset: "last_30_days",
      limit: 20,
      sellerId: sellerIdForFilter,
    } satisfies IShoppingMallCatalogTopSellingSkuStatistics.IRequest;

    const sellerOnlyStats: IShoppingMallCatalogTopSellingSkuStatistics =
      await api.functional.shoppingMall.admin.catalog.statistics.topSellingSkus.index(
        connection,
        {
          body: sellerOnlyBody,
        },
      );
    typia.assert<IShoppingMallCatalogTopSellingSkuStatistics>(sellerOnlyStats);

    // Basic invariant: all items in seller-only statistics must belong to
    // the requested seller.
    for (const item of sellerOnlyStats.items) {
      TestValidator.equals(
        "seller-only filter: each item.seller.id must equal requested sellerId",
        item.seller.id,
        sellerIdForFilter,
      );
    }
    return;
  }

  const pickedCategory: IShoppingMallProductCategory.ISummary =
    categoryPage.data[0];
  const categoryIdForFilter: string = pickedCategory.id;

  // 5. Build three analytics requests: seller-only, category-only, combined.
  const sellerOnlyBody = {
    periodPreset: "last_30_days",
    limit: 20,
    sellerId: sellerIdForFilter,
  } satisfies IShoppingMallCatalogTopSellingSkuStatistics.IRequest;

  const categoryOnlyBody = {
    periodPreset: "last_30_days",
    limit: 20,
    categoryId: categoryIdForFilter,
  } satisfies IShoppingMallCatalogTopSellingSkuStatistics.IRequest;

  const combinedBody = {
    periodPreset: "last_30_days",
    limit: 20,
    sellerId: sellerIdForFilter,
    categoryId: categoryIdForFilter,
  } satisfies IShoppingMallCatalogTopSellingSkuStatistics.IRequest;

  const sellerOnlyStats: IShoppingMallCatalogTopSellingSkuStatistics =
    await api.functional.shoppingMall.admin.catalog.statistics.topSellingSkus.index(
      connection,
      {
        body: sellerOnlyBody,
      },
    );
  typia.assert<IShoppingMallCatalogTopSellingSkuStatistics>(sellerOnlyStats);

  const categoryOnlyStats: IShoppingMallCatalogTopSellingSkuStatistics =
    await api.functional.shoppingMall.admin.catalog.statistics.topSellingSkus.index(
      connection,
      {
        body: categoryOnlyBody,
      },
    );
  typia.assert<IShoppingMallCatalogTopSellingSkuStatistics>(categoryOnlyStats);

  const combinedStats: IShoppingMallCatalogTopSellingSkuStatistics =
    await api.functional.shoppingMall.admin.catalog.statistics.topSellingSkus.index(
      connection,
      {
        body: combinedBody,
      },
    );
  typia.assert<IShoppingMallCatalogTopSellingSkuStatistics>(combinedStats);

  // 6. For the combined response, ensure that each item is scoped to the
  //    requested seller.
  for (const item of combinedStats.items) {
    TestValidator.equals(
      "combined filter: each item.seller.id must equal requested sellerId",
      item.seller.id,
      sellerIdForFilter,
    );
  }

  // 7. When all three result sets are non-empty, verify that combined
  //    filtering yields a subset (or equal-size) of the seller-only and
  //    category-only sets.
  if (
    sellerOnlyStats.items.length > 0 &&
    categoryOnlyStats.items.length > 0 &&
    combinedStats.items.length > 0
  ) {
    TestValidator.predicate(
      "combined result size must be <= seller-only result size",
      combinedStats.items.length <= sellerOnlyStats.items.length,
    );
    TestValidator.predicate(
      "combined result size must be <= category-only result size",
      combinedStats.items.length <= categoryOnlyStats.items.length,
    );
  }
}
