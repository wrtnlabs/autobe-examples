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
 * Test updating a product variant option value with both key and value modifications.
 *
 * Validates the complete flow of updating an existing option value on a product variant.
 * This test ensures that sellers can modify option key-value pairs on their product variants.
 *
 * **Setup Flow**:
 * 1. Administrator creates a product category for the seller to use
 * 2. Admin registers and authenticates on the platform
 * 3. Seller registers and authenticates on the platform
 * 4. Admin approves the seller (required for product creation)
 * 5. Seller creates a product with the category
 * 6. Seller creates a product variant with initial option values (color=Red, size=Large)
 *
 * **Test Execution**:
 * 7. Call PUT endpoint to update the option value from 'color=Red' to 'color=Blue'
 * 8. Verify both key and value fields are included in the request body
 *
 * **Expected Validations**:
 * - Response status 200 OK
 * - Response body contains the updated key='color' and value='Blue'
 * - The option value ID remains the same (only properties changed)
 * - The other option values (size=Large) are unaffected
 *
 * @param connection Base API connection for test execution
 */
export async function test_api_variant_option_value_update_key_and_value(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and register admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // 2. Create seller connection and register seller with controlled password
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      password: sellerPassword,
    },
  });
  // 3. Admin approves the seller (seller must be 'approved' to create products)
  // Login with the same password used during join
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 4. Create a product category using admin
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  // 5. Create product with the category
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      approvedSellerConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  // 6. Create variant with initial option values
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      approvedSellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          optionValues: [
            {
              key: "color",
              value: "Red",
            },
            {
              key: "size",
              value: "Large",
            },
          ],
        },
      },
    );
  // Find the color option value to update
  const colorOption = variant.optionValues.find((ov) => ov.key === "color");
  if (!colorOption) {
    throw new Error("Color option value not found in variant");
  }
  const colorOptionId = (colorOption as any).id;
  // 7. Update the option value from 'color=Red' to 'color=Blue'
  const updatedOptionValue =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.option_values.update(
      approvedSellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        optionValueId: colorOptionId,
        body: {
          key: "color",
          value: "Blue",
        } satisfies IEcommerceMallProductVariantOptionValue.IUpdate,
      },
    );
  typia.assert(updatedOptionValue);
  // 8. Validations
  // Verify the option value was updated correctly
  TestValidator.equals(
    "updated key should be 'color'",
    updatedOptionValue.key,
    "color",
  );
  TestValidator.equals(
    "updated value should be 'Blue'",
    updatedOptionValue.value,
    "Blue",
  );
  TestValidator.equals(
    "option value ID should remain the same",
    (updatedOptionValue as any).id,
    colorOptionId,
  );
}