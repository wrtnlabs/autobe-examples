import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test product variant creation with custom price override.
 *
 * Validates that sellers can create product variants with custom pricing that differs from the product's base price. The variant's price override should be correctly stored and returned, enabling premium or discounted pricing for specific option combinations.
 *
 * The test workflow authenticates a seller, creates a parent product, then creates a variant with an explicit price override. It validates that the variant's price is correctly set and differs from the base price, confirming the price override mechanism works as expected.
 *
 * 1. Register and authenticate a seller account.
 * 2. Create a parent product with a base price.
 * 3. Create a variant with custom price override (different from base price).
 * 4. Validate the variant's SKU code, option values, and custom price are correctly stored.
 * 5. Validate the variant's price differs from the product's base_price.
 * 6. Validate the variant includes the product summary reference.
 */
export async function test_api_product_variant_creation_with_price_override(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create parent product with base price
  const basePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        base_price: basePrice,
      } satisfies Partial<IEcommerceProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 3. Create variant with custom price override (different from base price)
  const variantPrice =
    basePrice +
    typia.random<number & tags.Type<"uint32"> & tags.Minimum<500>>();
  const skuCode = `SKU-${RandomGenerator.alphabets(6).toUpperCase()}`;
  const optionValues = `color=${RandomGenerator.alphabets(5)};size=${RandomGenerator.alphabets(4)}`;
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: skuCode,
          option_values: optionValues,
          price: variantPrice,
        } satisfies IEcommerceProductVariant.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 4. Validate variant properties
  TestValidator.equals("SKU code matches", variant.sku_code, skuCode);
  TestValidator.predicate(
    "has option values",
    variant.option_values.length > 0,
  );
  TestValidator.predicate(
    "option values format correct",
    variant.option_values.includes("="),
  );
  TestValidator.predicate(
    "price override set",
    variant.price !== null && variant.price !== undefined,
  );
  // 5. Validate price override differs from base price
  TestValidator.equals(
    "variant price matches override",
    variant.price,
    variantPrice,
  );
  TestValidator.notEquals("price differs from base", variant.price, basePrice);
  // 6. Validate product reference
  TestValidator.equals("product ID matches", variant.product.id, product.id);
  TestValidator.equals(
    "product base price preserved",
    variant.product.base_price,
    basePrice,
  );
}
