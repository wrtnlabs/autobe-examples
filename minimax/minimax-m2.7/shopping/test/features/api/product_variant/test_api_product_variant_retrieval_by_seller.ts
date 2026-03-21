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
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_product_variant_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a variant with option values
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          option_values: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ] satisfies IEcommerceMallProductVariantOptionValue.ICreate[],
        },
      },
    );
  typia.assert(variant);
  // 4. Retrieve the variant by productId and variantId
  const retrievedVariant =
    await api.functional.ecommerceMall.seller.products.variants.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(retrievedVariant);
  // 5. Validate response
  TestValidator.equals("variant ID matches", retrievedVariant.id, variant.id);
  TestValidator.equals(
    "SKU code matches",
    retrievedVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.equals("price matches", retrievedVariant.price, variant.price);
  TestValidator.equals(
    "quantity matches",
    retrievedVariant.quantity,
    variant.quantity,
  );
  TestValidator.equals(
    "option values count",
    retrievedVariant.optionValues.length,
    2,
  );
  // Verify option values
  const colorOption = retrievedVariant.optionValues.find(
    (o) => o.key === "color",
  );
  const sizeOption = retrievedVariant.optionValues.find(
    (o) => o.key === "size",
  );
  TestValidator.predicate("color option exists", colorOption !== undefined);
  TestValidator.equals("color value is Red", colorOption?.value, "Red");
  TestValidator.predicate("size option exists", sizeOption !== undefined);
  TestValidator.equals("size value is Large", sizeOption?.value, "Large");
  TestValidator.predicate(
    "created_at exists",
    retrievedVariant.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedVariant.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", retrievedVariant.deleted_at, null);
}
