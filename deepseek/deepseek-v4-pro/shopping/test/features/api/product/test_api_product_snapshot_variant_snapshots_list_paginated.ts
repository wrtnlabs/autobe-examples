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
 * Test variant snapshot paginated listing within a product snapshot after product edit.
 *
 * Validates that editing a product with multiple variants creates a product snapshot with nested variant snapshots, and that the variant snapshots listing endpoint returns properly paginated results with accurate metadata.
 *
 * The test establishes the full prerequisite chain: an administrator creates a category, a seller registers and creates a product under that category, multiple variants are added with distinct SKU codes and option values, and the product is edited to trigger automatic snapshot creation capturing all variant states before the edit.
 *
 * 1. Administrator joins and creates a top-level category for product classification.
 * 2. Seller joins and creates a product referencing the category.
 * 3. Seller creates two variants with globally unique SKU codes and option values.
 * 4. Seller edits the product to trigger product snapshot creation with nested variant snapshots.
 * 5. Seller calls the variant snapshots index endpoint with page=1 and limit=20 pagination.
 * 6. Validates pagination response structure and metadata correctness.
 */
export async function test_api_product_snapshot_variant_snapshots_list_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup: join and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup: join
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create product under the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Create multiple variants with distinct SKU codes and option values
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant2);
  // 5. Edit product to trigger snapshot creation capturing variant states
  await api.functional.shoppingMall.seller.products.update(sellerConnection, {
    productId: product.id,
    body: {
      name: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      shopping_mall_category_id: category.id,
      base_price: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000>
      >(),
    } satisfies IShoppingMallProduct.IUpdate,
  });
  // 6. Retrieve variant snapshots with pagination
  const snapshotResult =
    await api.functional.shoppingMall.seller.products.snapshots.variant_snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResult);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    snapshotResult.pagination.current,
    1,
  );
  TestValidator.equals("page limit is 20", snapshotResult.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    snapshotResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages computed correctly",
    snapshotResult.pagination.pages ===
      Math.ceil(
        snapshotResult.pagination.records / snapshotResult.pagination.limit,
      ),
  );
  // 8. Validate data records when present
  if (snapshotResult.data.length > 0) {
    TestValidator.predicate(
      "data length within limit",
      snapshotResult.data.length <= 20,
    );
    for (const snapshot of snapshotResult.data) {
      TestValidator.predicate(
        "snapshot has variant reference",
        snapshot.variant !== undefined && snapshot.variant !== null,
      );
      TestValidator.predicate(
        "sku_code is non-empty string",
        snapshot.sku_code.length > 0,
      );
      TestValidator.predicate(
        "option_values is non-empty string",
        snapshot.option_values.length > 0,
      );
      TestValidator.predicate(
        "stock_quantity is integer",
        Number.isInteger(snapshot.stock_quantity),
      );
    }
    if (snapshotResult.data.length > 1) {
      for (let i = 1; i < snapshotResult.data.length; i++) {
        TestValidator.predicate(
          "ordered by created_at descending",
          new Date(snapshotResult.data[i - 1].created_at).getTime() >=
            new Date(snapshotResult.data[i].created_at).getTime(),
        );
      }
    }
  }
}
