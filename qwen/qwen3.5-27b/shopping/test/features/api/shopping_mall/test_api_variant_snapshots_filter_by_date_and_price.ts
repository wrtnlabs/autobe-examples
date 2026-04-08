import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallVariantSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test variant snapshots filtering by date range and price range for a product variant.
 *
 * This test validates the complete variant snapshots filtering workflow including seller authentication, product and variant creation, multiple variant updates to generate snapshots, and comprehensive filter testing. The test verifies that date range filters (created_at_from, created_at_to), price range filters (price_min, price_max), and SKU code search (search parameter) work correctly together with pagination parameters.
 *
 * Special attention is given to verifying that filters are inclusive on both ends, pagination metadata is accurate even for empty result sets, and the search parameter performs case-insensitive partial matching on SKU codes.
 *
 * 1. Seller authenticates via registration endpoint.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller creates a variant with SKU code and initial price.
 * 4. Seller updates the variant multiple times with different prices to generate snapshots.
 * 5. Test date range filtering with created_at_from and created_at_to parameters.
 * 6. Test price range filtering with price_min and price_max parameters.
 * 7. Test SKU code search with partial matching.
 * 8. Test pagination parameters (page, limit, sortBy, sortOrder).
 * 9. Verify empty result sets return proper pagination metadata.
 */
export async function test_api_variant_snapshots_filter_by_date_and_price(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create variant with initial price
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "TEST-VARIANT-001",
          price: 10000,
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // 4. Update variant multiple times to create snapshots with different prices
  // First update - price 15000
  const update1 =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: 15000,
        },
      },
    );
  typia.assert(update1);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Second update - price 12000
  const update2 =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: 12000,
        },
      },
    );
  typia.assert(update2);
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Third update - price 18000
  const update3 =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: 18000,
        },
      },
    );
  typia.assert(update3);
  // 5. Test retrieving all snapshots
  const allSnapshots =
    await api.functional.shoppingMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {},
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate(
    "should have at least 3 snapshots",
    () => allSnapshots.data.length >= 3,
  );
  // 6. Test price range filtering - get snapshots with price between 12000 and 16000
  const priceFiltered =
    await api.functional.shoppingMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price_min: 12000,
          price_max: 16000,
        },
      },
    );
  typia.assert(priceFiltered);
  TestValidator.predicate("price filter should return snapshots in range", () =>
    priceFiltered.data.every(
      (snapshot) => snapshot.price >= 12000 && snapshot.price <= 16000,
    ),
  );
  // 7. Test SKU code search with partial matching
  const searchFiltered =
    await api.functional.shoppingMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          search: "TEST",
        },
      },
    );
  typia.assert(searchFiltered);
  TestValidator.predicate("search should match SKU codes containing TEST", () =>
    searchFiltered.data.every((snapshot) =>
      snapshot.sku_code.toUpperCase().includes("TEST"),
    ),
  );
  // 8. Test date range filtering
  const firstSnapshot = allSnapshots.data[allSnapshots.data.length - 1];
  const lastSnapshot = allSnapshots.data[0];
  const dateFiltered =
    await api.functional.shoppingMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          created_at_from: firstSnapshot.created_at,
          created_at_to: lastSnapshot.created_at,
        },
      },
    );
  typia.assert(dateFiltered);
  TestValidator.equals(
    "date range should return all snapshots in range",
    dateFiltered.data.length,
    allSnapshots.data.length,
  );
  // 9. Test pagination parameters
  const paginated =
    await api.functional.shoppingMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 2,
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "pagination limit should be respected",
    paginated.data.length,
    Math.min(2, allSnapshots.data.length),
  );
  TestValidator.equals(
    "pagination current page should be 1",
    paginated.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 2",
    paginated.pagination.limit,
    2,
  );
  // 10. Test empty result set with strict filters
  const emptyResult =
    await api.functional.shoppingMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price_min: 1000000,
          price_max: 2000000,
        },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result set should have zero data",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result set should have zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result set should have zero pages",
    emptyResult.pagination.pages,
    0,
  );
}
