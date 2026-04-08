import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test error handling when retrieving a non-existent option value or when
 * the option value does not belong to the specified snapshot.
 *
 * Prerequisites setup:
 * 1. Authenticate as admin and create a product category
 * 2. Authenticate as seller and create a product
 * 3. Create a product variant with options (generates snapshot)
 * 4. Obtain valid snapshotId and optionValueId from the created resources
 *
 * Test execution:
 * Test case 1 - Non-existent optionValueId:
 * 1. Call GET with a valid snapshotId but a random/non-existent optionValueId (valid UUID format that doesn't exist)
 * 2. Verify response returns HTTP 404 Not Found
 *
 * Test case 2 - Mismatched snapshot-option relationship:
 * 1. Create a second product variant (generates separate snapshot with separate option values)
 * 2. Call GET using snapshotId from first variant's snapshot but optionValueId from second variant's options
 * 3. Verify response returns HTTP 404 Not Found (system should not expose that the option value exists under different snapshot)
 *
 * Validation points:
 * - Both scenarios return 404 Not Found to prevent information leakage
 * - Error responses do not distinguish between 'option value not found' vs 'option value exists in different snapshot'
 * - Parent-child relationship validation is strictly enforced
 */
export async function test_api_product_variant_snapshot_option_value_not_found_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    { body: {} },
  );
  // 2. Seller authentication and first product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: { categoryId: category.id },
    },
  );
  // 3. Create first product variant with options (generates snapshot with option values)
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {
          options: ArrayUtil.repeat(randint(2, 4), () => ({
            optionName: RandomGenerator.pick([
              "Color",
              "Size",
              "Material",
              "Style",
            ] as const),
            optionValue: RandomGenerator.name(1),
          })),
        },
      },
    );
  typia.assert<IEcommerceMallProductVariant>(variant1);
  // Extract snapshot info and option value from first variant
  // Note: The variant's ID is the snapshot ID in this system
  const firstSnapshotId = variant1.id;
  const firstOptionValues = variant1.variantOptions;
  if (firstOptionValues.length === 0) {
    throw new Error("First variant has no option values");
  }
  const firstOptionValueId = firstOptionValues[0].id;
  // 4. Create second product to generate separate snapshot
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: { categoryId: category.id },
    },
  );
  // 5. Create second product variant with different options (generates separate snapshot)
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: {
          options: ArrayUtil.repeat(randint(2, 4), () => ({
            optionName: RandomGenerator.pick([
              "Color",
              "Size",
              "Material",
              "Style",
            ] as const),
            optionValue: RandomGenerator.name(1),
          })),
        },
      },
    );
  typia.assert<IEcommerceMallProductVariant>(variant2);
  // Extract option value from second variant's snapshot
  const secondSnapshotId = variant2.id;
  const secondOptionValues = variant2.variantOptions;
  if (secondOptionValues.length === 0) {
    throw new Error("Second variant has no option values");
  }
  const secondOptionValueId = secondOptionValues[0].id;
  // Test case 1 - Non-existent optionValueId
  const nonExistentOptionValueId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent optionValueId should return 404",
    [404],
    async () => {
      await api.functional.ecommerceMall.seller.productVariantSnapshots.optionValues.at(
        sellerConnection,
        {
          snapshotId: firstSnapshotId,
          optionValueId: nonExistentOptionValueId,
        },
      );
    },
  );
  // Test case 2 - Mismatched snapshot-option relationship
  await TestValidator.httpError(
    "option value from different snapshot should return 404 to prevent information leakage",
    [404],
    async () => {
      await api.functional.ecommerceMall.seller.productVariantSnapshots.optionValues.at(
        sellerConnection,
        {
          snapshotId: firstSnapshotId,
          optionValueId: secondOptionValueId,
        },
      );
    },
  );
  // Verify that valid access works correctly
  const validOptionValue =
    await api.functional.ecommerceMall.seller.productVariantSnapshots.optionValues.at(
      sellerConnection,
      {
        snapshotId: firstSnapshotId,
        optionValueId: firstOptionValueId,
      },
    );
  typia.assert(validOptionValue);
}
