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
 * Test administrator retrieval of paginated variant snapshot history.
 *
 * Validates that administrators can browse the immutable audit trail of variant
 * edits through paginated snapshot listings. The test establishes a complete
 * domain setup — administrator registration, category creation, seller
 * registration, product provisioning, and variant creation — before triggering
 * a variant edit that automatically creates a pre-edit state snapshot.
 *
 * The administrator then queries the snapshot listing with default pagination
 * and validates: pagination metadata correctness (current page, page size,
 * total records, total pages), snapshot data completeness per the
 * IShoppingMallProductVariantSnapshot.ISummary type (SKU code, option values,
 * price, stock quantity, creation timestamp), chronological ordering with
 * newest snapshots first, and exclusive belonging of every returned snapshot
 * to the specified variant.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, creates a product under the category, and adds a variant.
 * 3. Seller edits the variant, triggering an automatic pre-edit snapshot.
 * 4. Administrator lists variant snapshots with default pagination.
 * 5. Validates pagination metadata, snapshot fields, ordering, and variant ownership.
 */
export async function test_api_variant_snapshot_admin_list_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Seller edits variant — triggers automatic pre-edit snapshot
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          code: RandomGenerator.alphaNumeric(8),
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 6. Administrator lists variant snapshots with default pagination
  const result =
    await api.functional.shoppingMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {} satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(result);
  // 7. Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("default limit", result.pagination.limit, 20);
  TestValidator.predicate(
    "at least one snapshot record",
    result.pagination.records >= 1,
  );
  TestValidator.predicate("at least one page", result.pagination.pages >= 1);
  TestValidator.equals(
    "data length matches records count",
    result.data.length,
    result.pagination.records,
  );
  // 8. Validate each snapshot belongs to the variant and has complete data
  for (const snapshot of result.data) {
    TestValidator.equals(
      "snapshot variant reference",
      snapshot.variant.id,
      variant.id,
    );
  }
  // 9. Validate newest-first ordering
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      TestValidator.predicate(
        "snapshots ordered newest first",
        result.data[i].created_at >= result.data[i + 1].created_at,
      );
    }
  }
}
