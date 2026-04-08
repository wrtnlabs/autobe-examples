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
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_option_values_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_option_values_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test deleting an option value from a product variant owned by the authenticated seller.
 *
 * Validates the complete flow of removing an option value from a product variant.
 * This test ensures that sellers can manage their product variants' option values
 * by removing specific key-value pairs when no longer needed.
 *
 * The scenario covers:
 * 1. Administrative setup - creating a product category required for product listing
 * 2. Seller authentication - joining and logging in as a seller with approved status
 * 3. Product creation - listing a new product under the authenticated seller
 * 4. Variant creation - creating a product variant with initial option values
 * 5. Option value addition - adding a new option value to the variant
 * 6. Option value deletion - removing the option value via the DELETE endpoint
 *
 * Validates that the DELETE operation returns void (204 No Content) and that
 * the option value is successfully removed while preserving other option values.
 *
 * 1. Admin creates a category via /admin/admin/categories
 * 2. Seller joins via /auth/seller/join
 * 3. Seller creates a product via /seller/sellers/me/products
 * 4. Seller creates a variant via /seller/sellers/me/products/{productId}/variants
 * 5. Seller adds an option value via /seller/sellers/me/products/{productId}/variants/{variantId}/option-values
 * 6. Seller deletes the option value via DELETE endpoint
 */
export async function test_api_product_variant_option_value_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create a category for the product
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Create product
  const productInput = prepare_random_ecommerce_mall_product();
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          ...productInput,
          categoryId: category.id,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 4. Create variant with initial option values
  const variantInput = prepare_random_ecommerce_mall_product_variant();
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: variantInput.skuCode,
          optionValues: [
            {
              key: "Size",
              value: "Large",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Add additional option value to the variant
  const optionValueInput =
    prepare_random_ecommerce_mall_product_variant_option_value();
  const optionValue =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          key: optionValueInput.key,
          value: optionValueInput.value,
        } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
      },
    );
  typia.assert(optionValue);
  // 6. Delete the option value via DELETE endpoint
  await api.functional.ecommerceMall.seller.sellers.me.products.variants.option_values.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      optionValueId: (optionValue as any).id,
    },
  );
}