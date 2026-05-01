import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test administrator listing of variant snapshots filtered by partial SKU code.
 *
 * Validates that the variant snapshot listing endpoint correctly filters by a
 * partial, case-insensitive sku_code match. Two variants with distinct SKU codes
 * ("VARIANT-ALPHA-001" and "VARIANT-BETA-002") are created under the same product,
 * and a product edit triggers automatic snapshot creation capturing both variant
 * states. Filtering by the lowercase substring "alpha" must return only the ALPHA
 * variant snapshot while excluding the BETA one.
 *
 * Additionally confirms that pagination metadata — total records and total pages —
 * reflects the filtered count rather than the total unfiltered snapshot count.
 *
 * 1. Administrator registers and authenticates via join.
 * 2. Seller registers and authenticates via join.
 * 3. Seller creates a product with randomized name, description, and base price.
 * 4. Seller adds a first variant with SKU code "VARIANT-ALPHA-001".
 * 5. Seller adds a second variant with SKU code "VARIANT-BETA-002".
 * 6. Seller edits the product to trigger snapshot creation capturing both variants.
 * 7. Administrator retrieves product snapshot history to obtain the snapshot ID.
 * 8. Administrator queries variant snapshots filtered by sku_code "alpha".
 * 9. Validates only one matching snapshot is returned with correct pagination metadata.
 */
export async function test_api_variant_snapshot_admin_list_filter_by_sku(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller join
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Create variant 1 with distinctive SKU code
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          code: "VARIANT-ALPHA-001",
          optionValues: [{ key: "color", value: "Red" }],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant1);
  // 5. Create variant 2 with different SKU code
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          code: "VARIANT-BETA-002",
          optionValues: [{ key: "color", value: "Blue" }],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant2);
  // 6. Edit product to trigger snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: product.category.id,
        base_price: 25000,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 7. Admin retrieves product snapshot history to get snapshot ID
  const snapshots =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.predicate(
    "at least one snapshot exists after product edit",
    snapshots.data.length > 0,
  );
  const snapshotId = snapshots.data[0].id;
  // 8. Query variant snapshots filtered by case-insensitive partial SKU code
  const filteredResult =
    await api.functional.shoppingMall.admin.products.snapshots.variant_snapshots.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId,
        body: {
          sku_code: "alpha",
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(filteredResult);
  // 9. Validate filtering and pagination metadata
  TestValidator.equals(
    "only matching variant snapshot returned",
    filteredResult.data.length,
    1,
  );
  TestValidator.equals(
    "pagination records reflects filtered count, not total",
    filteredResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages reflects filtered count",
    filteredResult.pagination.pages,
    1,
  );
  TestValidator.predicate(
    "matching snapshot SKU code contains ALPHA",
    filteredResult.data[0].sku_code.toUpperCase().includes("ALPHA"),
  );
  TestValidator.predicate(
    "matching snapshot SKU code does NOT contain BETA",
    !filteredResult.data[0].sku_code.toUpperCase().includes("BETA"),
  );
}
