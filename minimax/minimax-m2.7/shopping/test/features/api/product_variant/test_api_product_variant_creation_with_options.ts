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

export async function test_api_product_variant_creation_with_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product that the variant will belong to
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a variant with SKU code, price override, quantity, and option values
  const variant =
    await api.functional.ecommerceMall.seller.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(12)}`,
          price: product.base_price + 5000,
          quantity: 10,
          option_values: [
            {
              key: "color",
              value: "Red",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
            {
              key: "size",
              value: "Large",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Validate the variant response
  TestValidator.equals("variant has valid id", variant.id.length > 0, true);
  TestValidator.equals(
    "variant has valid sku code",
    variant.sku_code.startsWith("SKU-"),
    true,
  );
  TestValidator.equals(
    "price override is applied",
    variant.price,
    product.base_price + 5000,
  );
  TestValidator.equals("quantity is set to 10", variant.quantity, 10);
  TestValidator.equals("has two option values", variant.optionValues.length, 2);
  // Validate option values with null checks
  const colorOption = variant.optionValues.find((ov) => ov.key === "color");
  const sizeOption = variant.optionValues.find((ov) => ov.key === "size");
  if (colorOption !== undefined) {
    TestValidator.equals("color option value is Red", colorOption.value, "Red");
  }
  if (sizeOption !== undefined) {
    TestValidator.equals(
      "size option value is Large",
      sizeOption.value,
      "Large",
    );
  }
  // Validate timestamps
  TestValidator.equals(
    "variant has created_at",
    variant.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "variant has updated_at",
    variant.updated_at.length > 0,
    true,
  );
  TestValidator.equals("variant is not deleted", variant.deleted_at, null);
}
