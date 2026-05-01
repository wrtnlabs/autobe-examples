import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test variant snapshot filtering by SKU code partial match and price range with null-price exclusion.
 *
 * Validates the variant snapshots listing endpoint's filtering capabilities through the seller-scoped API. The test creates three variants with distinct SKU codes and pricing strategies — one with a price override, one with a null price using the product base price, and one with a different price override — then triggers a product snapshot via an update and queries the variant snapshots with various filter combinations.
 *
 * 1. Administrator creates a top-level category for product classification.
 * 2. Seller registers and creates a product with a base price of 200.
 * 3. Seller creates three variants:
 *    - "SHO-RED-S" with price override 150 and options (color: Red, size: Small).
 *    - "SHO-BLK-M" with null price using base price and options (color: Black, size: Medium).
 *    - "SHO-BLU-L" with price override 250 and options (color: Blue, size: Large).
 * 4. Product update triggers snapshot creation capturing all variant states.
 * 5. SKU code filter "RED" verifies case-insensitive partial matching.
 * 6. Price range filter (100-200) confirms null-price variants are excluded from range comparisons.
 * 7. Combined SKU + price filter validates intersection behavior.
 * 8. No-filter query confirms all variant snapshots — including null-price ones — are returned.
 */
export async function test_api_product_snapshot_variant_snapshots_filter_by_sku_and_price(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup — create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup — register
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create product with base price 200
  const basePrice = 200;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
        base_price: basePrice,
      },
    },
  );
  typia.assert(product);
  // 4. Create three variants with distinct SKU codes and prices
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          code: "SHO-RED-S",
          price: 150,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Small" },
          ],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          code: "SHO-BLK-M",
          price: null,
          optionValues: [
            { key: "color", value: "Black" },
            { key: "size", value: "Medium" },
          ],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant2);
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          code: "SHO-BLU-L",
          price: 250,
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Large" },
          ],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant3);
  // 5. Update product to trigger snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        shopping_mall_category_id: category.id,
        base_price: basePrice + 10,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 6. Test SKU code partial match filter
  const resultBySku =
    await api.functional.shoppingMall.seller.products.snapshots.variant_snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId,
        body: {
          sku_code: "RED",
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(resultBySku);
  // 7. Test price range filter — null-price variants should be excluded
  const resultByPrice =
    await api.functional.shoppingMall.seller.products.snapshots.variant_snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId,
        body: {
          price_min: 100,
          price_max: 200,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(resultByPrice);
  // 8. Test combined SKU + price filter — intersection behavior
  const resultCombined =
    await api.functional.shoppingMall.seller.products.snapshots.variant_snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId,
        body: {
          sku_code: "SHO",
          price_min: 100,
          price_max: 200,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(resultCombined);
  // 9. Test no filters — all variant snapshots (including null-price) returned
  const resultAll =
    await api.functional.shoppingMall.seller.products.snapshots.variant_snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId,
        body: {} satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(resultAll);
}
