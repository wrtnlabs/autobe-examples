import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test successful modification of a product variant by an authenticated seller.
 * 1. Authenticate as seller
 * 2. Create a product
 * 3. Add a variant to the product
 * 4. Update the variant with new properties
 * 5. Validate the update succeeds and returns correct information
 */
export async function test_api_product_variant_update_successful_modification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create a product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Add a variant to the product
  const variantBody = {
    sku: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
    option_values: typia.random<string>(),
    price_override: typia.random<number & tags.Minimum<0>>(),
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IEcommerceProductVariant.ICreate;
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        body: variantBody,
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Update the variant with new properties
  const updateBody = {
    sku: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
    option_values: typia.random<string>(),
    price_override: typia.random<number & tags.Minimum<0>>(),
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IEcommerceProductVariant.IUpdate;
  const updatedVariant =
    await api.functional.ecommerce.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: updateBody,
      },
    );
  typia.assert(updatedVariant);
  // 5. Validate the update succeeds and returns correct information
  TestValidator.equals(
    "variant ID remains the same",
    updatedVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "product ID remains the same",
    updatedVariant.product.id,
    product.id,
  );
  TestValidator.equals("SKU is updated", updatedVariant.sku, updateBody.sku);
  TestValidator.equals(
    "option values are updated",
    updatedVariant.option_values,
    updateBody.option_values,
  );
  TestValidator.equals(
    "price override is updated",
    updatedVariant.price_override,
    updateBody.price_override,
  );
  TestValidator.equals(
    "quantity is updated",
    updatedVariant.quantity,
    updateBody.quantity,
  );
  TestValidator.predicate(
    "updated_at timestamp should be newer",
    new Date(updatedVariant.updated_at) > new Date(variant.updated_at),
  );
}
