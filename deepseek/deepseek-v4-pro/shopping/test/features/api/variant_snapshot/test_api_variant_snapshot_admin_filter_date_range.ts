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
 * Test administrator filtering of variant snapshots by creation date range.
 *
 * Validates that the admin snapshot listing endpoint correctly applies
 * `created_at_from` and `created_at_to` filters to return only snapshots
 * created within the specified inclusive time window. After the seller
 * performs three sequential variant edits spanning distinct time points —
 * each edit automatically triggering a snapshot — the administrator
 * applies a date range filter that should include only the first two
 * edit snapshots while excluding the third.
 *
 * Special attention is given to verifying that pagination metadata
 * reflects the filtered count rather than the total count across all
 * snapshots for the variant, and that every returned snapshot's
 * `created_at` falls within the requested date boundaries.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, creates a product under the category, and
 *    creates a variant with a unique SKU code and option values.
 * 3. After a delay, the seller performs the first variant edit
 *    (snapshot 1 is created automatically).
 * 4. After another delay, the seller performs the second variant edit
 *    (snapshot 2 is created automatically). The `toDate` is captured
 *    immediately after.
 * 5. After a final delay, the seller performs the third variant edit
 *    (snapshot 3 is created — intentionally outside the date range).
 * 6. Administrator queries all snapshots without filters to obtain
 *    total count.
 * 7. Administrator queries snapshots with `created_at_from` set before
 *    the first edit and `created_at_to` set after the second edit.
 * 8. Validates that filtered results are a proper subset of all
 *    snapshots, that pagination metadata matches the filtered count,
 *    and that each returned snapshot falls within the date range.
 */
export async function test_api_variant_snapshot_admin_filter_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Create product under the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Create variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 6. Delay to ensure distinct timestamps, then record fromDate
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const fromDate = new Date().toISOString();
  // 7. First edit (snapshot 1)
  await api.functional.shoppingMall.seller.products.variants.update(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      body: {
        code: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Minimum<1>>(),
      } satisfies IShoppingMallProductVariant.IUpdate,
    },
  );
  // 8. Delay then second edit (snapshot 2)
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await api.functional.shoppingMall.seller.products.variants.update(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      body: {
        code: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Minimum<1>>(),
      } satisfies IShoppingMallProductVariant.IUpdate,
    },
  );
  // 9. Record toDate immediately after second edit
  const toDate = new Date().toISOString();
  // 10. Delay then third edit (snapshot 3 — outside range)
  await new Promise((resolve) => setTimeout(resolve, 2000));
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
  // 11. Query all snapshots without filter
  const allSnapshots =
    await api.functional.shoppingMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {},
      },
    );
  typia.assert(allSnapshots);
  // 12. Query snapshots with date range filter
  const filteredSnapshots =
    await api.functional.shoppingMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          created_at_from: fromDate,
          created_at_to: toDate,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  // 13. Validate filtered results are a proper subset
  TestValidator.predicate(
    "filtered count less than total count",
    filteredSnapshots.data.length < allSnapshots.data.length,
  );
  // 14. Validate pagination metadata reflects filtered count
  TestValidator.equals(
    "pagination records matches filtered data length",
    filteredSnapshots.pagination.records,
    filteredSnapshots.data.length,
  );
  // 15. Validate every filtered snapshot falls within the date range
  const fromTime = new Date(fromDate).getTime();
  const toTime = new Date(toDate).getTime();
  for (const snapshot of filteredSnapshots.data) {
    const snapshotTime = new Date(snapshot.created_at).getTime();
    TestValidator.predicate(
      "snapshot created_at within date range",
      snapshotTime >= fromTime && snapshotTime <= toTime,
    );
  }
}
