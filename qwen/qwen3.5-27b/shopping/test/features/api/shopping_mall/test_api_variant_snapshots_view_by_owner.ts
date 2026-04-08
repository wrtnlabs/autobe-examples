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
 * Test that an authenticated seller can view the complete history of snapshots for their own product variant.
 *
 * Validates the complete variant snapshot viewing workflow including seller authentication, product creation, variant creation with multiple updates to generate snapshots, and snapshot retrieval with pagination. Ensures that snapshots are created when variants are modified and returned in chronological order (newest first).
 *
 * Special attention is given to verifying that each snapshot captures the SKU code and price at the time of modification, that the variant reference is included in each snapshot, and that pagination metadata accurately reflects the total number of snapshots created.
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller creates a variant with SKU code, price, and option values.
 * 4. Seller updates the variant (first update creates first snapshot).
 * 5. Seller updates the variant again (second update creates second snapshot).
 * 6. Seller retrieves all snapshots for the variant.
 * 7. Validates snapshots are ordered newest first and contain correct data.
 */
export async function test_api_variant_snapshots_view_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create variant with initial data
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "VAR-001-INITIAL",
          price: 50000,
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // 4. First update (creates first snapshot)
  const updateBody1 = {
    sku_code: "VAR-001-UPDATED-1",
    price: 55000,
  } satisfies IShoppingMallProductVariant.IUpdate;
  const updatedVariant1 =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: updateBody1,
      },
    );
  typia.assert(updatedVariant1);
  // 5. Second update (creates second snapshot)
  const updateBody2 = {
    sku_code: "VAR-001-UPDATED-2",
    price: 60000,
  } satisfies IShoppingMallProductVariant.IUpdate;
  const updatedVariant2 =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: updateBody2,
      },
    );
  typia.assert(updatedVariant2);
  // 6. Retrieve snapshots
  const snapshotsRequestBody = {
    page: 1,
    limit: 20,
    sortBy: "created_at",
    sortOrder: "desc",
  } satisfies IShoppingMallVariantSnapshot.IRequest;
  const snapshotsResponse =
    await api.functional.shoppingMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: snapshotsRequestBody,
      },
    );
  typia.assert(snapshotsResponse);
  // 7. Validate pagination
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "total snapshots count",
    snapshotsResponse.pagination.records,
    2,
  );
  TestValidator.equals("total pages", snapshotsResponse.pagination.pages, 1);
  // 8. Validate snapshots data
  TestValidator.predicate("has snapshots", snapshotsResponse.data.length === 2);
  // 9. Validate snapshot order (newest first)
  TestValidator.predicate(
    "snapshots ordered newest first",
    snapshotsResponse.data[0].created_at > snapshotsResponse.data[1].created_at,
  );
  // 10. Validate first snapshot (most recent update)
  TestValidator.equals(
    "first snapshot sku_code",
    snapshotsResponse.data[0].sku_code,
    "VAR-001-UPDATED-2",
  );
  TestValidator.equals(
    "first snapshot price",
    snapshotsResponse.data[0].price,
    60000,
  );
  TestValidator.equals(
    "first snapshot variant reference",
    snapshotsResponse.data[0].productVariant.id,
    variant.id,
  );
  // 11. Validate second snapshot (earlier update)
  TestValidator.equals(
    "second snapshot sku_code",
    snapshotsResponse.data[1].sku_code,
    "VAR-001-UPDATED-1",
  );
  TestValidator.equals(
    "second snapshot price",
    snapshotsResponse.data[1].price,
    55000,
  );
  TestValidator.equals(
    "second snapshot variant reference",
    snapshotsResponse.data[1].productVariant.id,
    variant.id,
  );
}
