import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_options_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_options_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test updating an existing product variant option value with a new value.
 *
 * Steps:
 * 1. Authenticate as a seller using POST /ecommerceMall/auth/seller/join
 * 2. Create a product using POST /ecommerceMall/seller/products
 * 3. Create a product variant with initial option values
 * 4. Update the option value using PUT /ecommerceMall/seller/products/{productId}/variants/{variantId}/options/{optionKey}
 *
 * Validation points:
 * - Response returns updated option record
 * - The value field is updated to the new value
 * - The option key remains unchanged
 * - The updated_at timestamp is refreshed
 * - Response includes id, key, value, created_at, updated_at fields
 */
export async function test_api_product_variant_option_value_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create product using generation function
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create product variant with initial option values
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Create an initial option value that will be updated
  const initialOptionValue =
    await generate_random_ecommerce_mall_seller_products_variants_options_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
      },
    );
  typia.assert(initialOptionValue);
  // Store original values for validation
  const originalCreatedAt = initialOptionValue.created_at;
  const optionKey = initialOptionValue.key;
  const originalValue = initialOptionValue.value;
  const newValue = RandomGenerator.paragraph({ sentences: 1 });
  // 5. Update the option value using PUT endpoint
  const updatedOptionValue =
    await api.functional.ecommerceMall.seller.products.variants.options.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        optionKey: optionKey,
        body: {
          value: newValue,
        } satisfies IEcommerceMallProductVariantOptionValue.IUpdate,
      },
    );
  typia.assert(updatedOptionValue);
  // Validation: value field is updated to the new value
  TestValidator.equals(
    "updated value matches new value",
    updatedOptionValue.value,
    newValue,
  );
  // Validation: option key remains unchanged
  TestValidator.equals(
    "option key unchanged",
    updatedOptionValue.key,
    optionKey,
  );
  // Validation: id remains the same
  TestValidator.equals(
    "id unchanged",
    updatedOptionValue.id,
    initialOptionValue.id,
  );
  // Validation: created_at remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedOptionValue.created_at,
    originalCreatedAt,
  );
  // Validation: updated_at is refreshed (should be different from original)
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedOptionValue.updated_at,
    initialOptionValue.created_at,
  );
  // Validation: value is different from original
  TestValidator.notEquals(
    "value changed from original",
    updatedOptionValue.value,
    originalValue,
  );
  // Validation: Response includes all required fields
  TestValidator.predicate("has id", !!updatedOptionValue.id);
  TestValidator.predicate("has key", !!updatedOptionValue.key);
  TestValidator.predicate("has value", !!updatedOptionValue.value);
  TestValidator.predicate("has created_at", !!updatedOptionValue.created_at);
  TestValidator.predicate("has updated_at", !!updatedOptionValue.updated_at);
}
