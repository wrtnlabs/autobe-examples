import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Edge case: Retrieve variant snapshots with date-based filtering to view only snapshots
 * created within a specific time period.
 *
 * Test steps:
 * 1) Authenticate as admin and complete registration
 * 2) Create a product category
 * 3) Authenticate as seller and create a product
 * 4) Create a variant
 * 5) Edit the variant three times at different time intervals (immediately, after 1 minute, after 2 minutes)
 * 6) As admin, query snapshots with createdAtFrom filter set to timestamp after the first two edits but before the third
 * 7) Verify response returns only the most recent snapshot (from third edit)
 * 8) Query with createdAtTo filter set to timestamp before the second edit
 * 9) Verify response returns only the oldest snapshot (from first edit)
 * 10) Query with both createdAtFrom and createdAtTo forming a range
 * 11) Verify only snapshots within that date range are returned, confirming time-based filtering works correctly.
 */
export async function test_api_product_variant_snapshot_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {},
  );
  typia.assert(admin);
  // 2. Create a product category as admin
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {},
  );
  typia.assert(seller);
  // 4. Create a product as seller with the category
  const productPrepared = prepare_random_ecommerce_mall_product({
    categoryId: category.id,
  });
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      { body: productPrepared },
    );
  typia.assert(product);
  // 5. Create a variant
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 6. Edit the variant three times at different time intervals
  // First edit (creates first snapshot)
  const update1 =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: `${variant.skuCode}-edit1`,
          price: (variant.price ?? 0) + 1000,
          optionValues: variant.optionValues.map((opt) => ({
            optionName: opt.optionName,
            optionValue: `${opt.optionValue}-v1`,
          })),
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(update1);
  // Wait a moment to ensure timestamps differ
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const timestampAfterFirstEdit = new Date().toISOString();
  // Second edit (creates second snapshot)
  const update2 =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: `${variant.skuCode}-edit2`,
          price: (variant.price ?? 0) + 2000,
          optionValues: variant.optionValues.map((opt) => ({
            optionName: opt.optionName,
            optionValue: `${opt.optionValue}-v2`,
          })),
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(update2);
  // Wait again for timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const timestampAfterSecondEdit = new Date().toISOString();
  // Third edit (creates third snapshot)
  const update3 =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: `${variant.skuCode}-edit3`,
          price: (variant.price ?? 0) + 3000,
          optionValues: variant.optionValues.map((opt) => ({
            optionName: opt.optionName,
            optionValue: `${opt.optionValue}-v3`,
          })),
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(update3);
  // Final wait
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 7. Query snapshots with createdAtFrom filter (should return only third edit snapshot)
  const snapshotsFrom: IPageIEcommerceMallProductVariantSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 100,
          createdAtFrom: timestampAfterSecondEdit,
          createdAtTo: null,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsFrom);
  // Verify only the most recent snapshot is returned
  TestValidator.equals(
    "snapshots from filter count",
    snapshotsFrom.data.length,
    1,
  );
  TestValidator.equals(
    "snapshot has correct SKU",
    snapshotsFrom.data[0].skuCode,
    update3.skuCode,
  );
  TestValidator.equals(
    "snapshot has correct price",
    snapshotsFrom.data[0].price,
    update3.price,
  );
  // 8. Query with createdAtTo filter (should return only first edit snapshot)
  const snapshotsTo: IPageIEcommerceMallProductVariantSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 100,
          createdAtFrom: null,
          createdAtTo: timestampAfterSecondEdit,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsTo);
  // Verify only snapshots up to second edit are returned
  TestValidator.predicate(
    "snapshots to filter has at least 2 results",
    snapshotsTo.data.length >= 2,
  );
  // 9. Query with both filters forming a specific range
  const snapshotsRange: IPageIEcommerceMallProductVariantSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 100,
          createdAtFrom: timestampAfterFirstEdit,
          createdAtTo: timestampAfterSecondEdit,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsRange);
  // Verify only snapshots within the date range are returned
  TestValidator.equals(
    "snapshots range filter count",
    snapshotsRange.data.length,
    1,
  );
  TestValidator.equals(
    "range snapshot has correct SKU",
    snapshotsRange.data[0].skuCode,
    update2.skuCode,
  );
}
