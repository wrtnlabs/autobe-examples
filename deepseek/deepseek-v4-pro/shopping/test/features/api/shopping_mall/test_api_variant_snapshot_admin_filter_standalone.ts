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
 * Test administrator filtering of variant snapshot records by standalone edits.
 *
 * Validates that an administrator can use the `has_parent_snapshot` parameter to filter variant snapshots that were created from variant-only edits (standalone edits without a parent product snapshot). When a seller edits a variant independently without modifying the parent product, the resulting snapshot has no reference to a product-level snapshot.
 *
 * The test creates a product with a variant, then performs a standalone variant edit. The admin queries snapshots with `has_parent_snapshot: false` to retrieve only the standalone variant snapshot. Validates that pagination metadata accurately reflects only the filtered subset, and that querying with `has_parent_snapshot: true` returns zero results — confirming product-level edit snapshots are properly excluded.
 *
 * 1. Administrator registers and authenticates via `authorize_admin_join`.
 * 2. Seller registers and authenticates via `authorize_seller_join`.
 * 3. Administrator creates a category for product organization.
 * 4. Seller creates a product under the created category.
 * 5. Seller creates a variant with SKU code and option values.
 * 6. Seller updates the variant independently (price change) — triggers a standalone variant snapshot.
 * 7. Administrator queries variant snapshots with `has_parent_snapshot: false` and validates the filtered results.
 * 8. Administrator queries with `has_parent_snapshot: true` and confirms zero results — no product-level snapshots exist.
 */
export async function test_api_variant_snapshot_admin_filter_standalone(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Admin creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 4. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Seller creates a variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 6. Seller updates the variant independently (standalone edit — not editing parent product)
  const newPrice = (variant.price ?? product.base_price) + 100;
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: newPrice,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 7. Admin queries variant snapshots with has_parent_snapshot: false
  const standalonePage =
    await api.functional.shoppingMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          has_parent_snapshot: false,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(standalonePage);
  // Validate that standalone snapshots exist
  TestValidator.predicate(
    "has standalone variant snapshots",
    standalonePage.data.length >= 1,
  );
  // Validate pagination accuracy
  TestValidator.equals(
    "pagination records count matches data length for standalone filter",
    standalonePage.pagination.records,
    standalonePage.data.length,
  );
  // 8. Admin queries with has_parent_snapshot: true — should return zero results
  const productLevelPage =
    await api.functional.shoppingMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          has_parent_snapshot: true,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(productLevelPage);
  // Confirm no product-level snapshots exist (only standalone edits were made)
  TestValidator.equals(
    "no product-level snapshots exist",
    productLevelPage.data.length,
    0,
  );
  TestValidator.equals(
    "product-level pagination records is zero",
    productLevelPage.pagination.records,
    0,
  );
}
