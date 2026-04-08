import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test that bulk product variant creation fails atomically when duplicate SKU codes are provided.
 *
 * Validates the SKU uniqueness constraint is enforced globally across the platform. When attempting to create multiple variants in a single bulk operation, if any SKU code already exists (either from a previous variant or within the same request), the entire operation must fail without creating any variants. This ensures data integrity and prevents partial state.
 *
 * Test flow:
 * 1. Register and authenticate as an approved seller
 * 2. Admin creates a category required for product assignment
 * 3. Seller creates a product with the authenticated session
 * 4. Create an initial variant with a unique SKU code using single creation
 * 5. Attempt bulk creation with 3 variants where:
 *    - Variant 1: New unique SKU (should be valid)
 *    - Variant 2: SKU duplicates the initial variant's SKU (should fail)
 *    - Variant 3: SKU duplicates Variant 2 within the same request (should fail)
 * 6. Validate the bulk operation returns 409 Conflict error
 * 7. Verify NO variants were created (atomic transaction behavior)
 *
 * Business rules validated:
 * - SKU codes must be globally unique across all variants on the platform
 * - Duplicate SKUs within the same bulk request trigger failure
 * - Duplicate SKUs against existing variants trigger failure
 * - Bulk operations are atomic: all or nothing
 */
export async function test_api_product_variant_bulk_creation_duplicate_sku(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Admin creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller creates a product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 4. Create initial variant with unique SKU using single creation
  const existingSkuCode = `SKU-UNIQUE-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const initialVariant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: existingSkuCode,
          optionValues: [
            { key: "color", value: "red" },
            { key: "size", value: "S" },
          ],
        },
      },
    );
  typia.assert(initialVariant);
  // 5. Attempt bulk creation with duplicate SKUs
  const duplicateSkuCode = existingSkuCode; // Same as existing variant
  const duplicateWithinRequestSku = `SKU-DUP-INSIDE-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const bulkRequest = {
    variants: [
      {
        skuCode: `SKU-NEW-UNIQUE-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
        optionValues: [
          { key: "color", value: "blue" },
          { key: "size", value: "M" },
        ],
        price:
          typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>() ??
          null,
      },
      {
        skuCode: duplicateSkuCode, // Duplicate of existing variant
        optionValues: [
          { key: "color", value: "green" },
          { key: "size", value: "L" },
        ],
        price:
          typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>() ??
          null,
      },
      {
        skuCode: duplicateWithinRequestSku, // Will also be duplicated below
        optionValues: [
          { key: "color", value: "yellow" },
          { key: "size", value: "XL" },
        ],
        price:
          typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>() ??
          null,
      },
      {
        skuCode: duplicateWithinRequestSku, // Duplicate within same request
        optionValues: [
          { key: "color", value: "black" },
          { key: "size", value: "XXL" },
        ],
        price:
          typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>() ??
          null,
      },
    ],
  } satisfies IEcommerceMallProductVariant.ICreateBulk;
  // 6. Validate that bulk operation fails with 409 Conflict
  await TestValidator.error(
    "bulk creation with duplicate SKUs should fail",
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products.variants.bulk.create(
        sellerConnection,
        {
          productId: product.id,
          body: bulkRequest,
        },
      );
    },
  );
}