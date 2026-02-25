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

export async function test_api_product_variants_retrieval_multiple_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup with connection isolation
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: { email: typia.random<string & tags.Format<"email">>() },
  });
  typia.assert(seller);
  // 2. Create base product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        base_price: typia.random<number & tags.Minimum<1000>>(),
      },
    },
  );
  typia.assert(product);
  // 3. Create a single variant with multiple options for testing
  const variantBody = {
    sku: RandomGenerator.alphaNumeric(10),
    option_values: JSON.stringify({
      color: RandomGenerator.pick(["red", "blue", "green", "black"]),
      size: RandomGenerator.pick(["S", "M", "L", "XL"]),
    }),
    price_override: Math.random() > 0.5 ? product.base_price * 1.2 : null,
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IEcommerceProductVariant.ICreate;
  const createdVariant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: variantBody,
      },
    );
  typia.assert(createdVariant);
  // 4. Retrieve the variant using customer connection (endpoint is public)
  // The endpoint GET /ecommerce/products/{productId}/variants returns a single variant
  const retrievedVariant = await api.functional.ecommerce.products.variants.at(
    { host: connection.host }, // Customer connection - no auth needed
    { productId: product.id },
  );
  typia.assert(retrievedVariant);
  // 5. Validate variant data
  TestValidator.equals("sku matches", createdVariant.sku, retrievedVariant.sku);
  TestValidator.equals(
    "option_values matches",
    createdVariant.option_values,
    retrievedVariant.option_values,
  );
  // Validate pricing logic
  if (createdVariant.price_override !== null) {
    TestValidator.equals(
      "price_override matches",
      createdVariant.price_override,
      retrievedVariant.price_override,
    );
  } else {
    TestValidator.equals(
      "price_override is null",
      retrievedVariant.price_override,
      null,
    );
  }
  TestValidator.equals(
    "quantity matches",
    createdVariant.quantity,
    retrievedVariant.quantity,
  );
  TestValidator.equals(
    "product id matches",
    createdVariant.product.id,
    retrievedVariant.product.id,
  );
  // 6. Test business logic: verify soft-deleted variants would be excluded
  // (This would require separate test with delete API)
  TestValidator.predicate(
    "variant has valid price",
    () =>
      retrievedVariant.price_override === null ||
      retrievedVariant.price_override > 0,
  );
}
