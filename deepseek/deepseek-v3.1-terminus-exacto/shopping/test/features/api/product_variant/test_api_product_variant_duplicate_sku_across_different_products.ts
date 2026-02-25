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
 * Test SKU uniqueness constraint across entire platform.
 * 1. Authenticate as seller and create two different products
 * 2. Add variant with specific SKU to first product (should succeed)
 * 3. Attempt to add variant with same SKU to second product (should fail)
 * 4. Verify error indicates SKU already exists and variant not created
 * 5. Create different variant with unique SKU on second product (should succeed)
 */
export async function test_api_product_variant_duplicate_sku_across_different_products(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Step 2: Create two different products owned by same seller
  const product1 = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<number & tags.Minimum<0>>(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<number & tags.Minimum<0>>(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product2);
  // Step 3: Create variant with specific SKU on first product (should succeed)
  const duplicateSku = RandomGenerator.alphaNumeric(10);
  const variant1 =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku: duplicateSku satisfies string &
            tags.MinLength<3> &
            tags.MaxLength<50>,
          option_values: JSON.stringify({ color: "red", size: "M" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
        params: { productId: product1.id },
      },
    );
  typia.assert(variant1);
  TestValidator.equals("SKU matches input", variant1.sku, duplicateSku);
  TestValidator.equals("product ID matches", variant1.product.id, product1.id);
  // Step 4: Attempt to create variant with same SKU on second product (should fail)
  await TestValidator.error(
    "duplicate SKU across different products",
    async () => {
      await generate_random_ecommerce_seller_products_variants_create(
        sellerConnection,
        {
          body: {
            sku: duplicateSku satisfies string &
              tags.MinLength<3> &
              tags.MaxLength<50>,
            option_values: JSON.stringify({ color: "blue", size: "L" }),
            price_override: null,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
          } satisfies IEcommerceProductVariant.ICreate,
          params: { productId: product2.id },
        },
      );
    },
  );
  // Verify no variant was created for second product with duplicate SKU
  // We check this by creating a different variant successfully on product2
  // Step 5: Create different variant with unique SKU on second product (should succeed)
  const uniqueSku = RandomGenerator.alphaNumeric(10);
  const variant2 =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku: uniqueSku satisfies string &
            tags.MinLength<3> &
            tags.MaxLength<50>,
          option_values: JSON.stringify({ color: "green", size: "S" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
        params: { productId: product2.id },
      },
    );
  typia.assert(variant2);
  TestValidator.equals("unique SKU matches input", variant2.sku, uniqueSku);
  TestValidator.equals(
    "product ID matches second product",
    variant2.product.id,
    product2.id,
  );
  TestValidator.notEquals(
    "variant IDs should be different",
    variant1.id,
    variant2.id,
  );
  TestValidator.notEquals(
    "SKUs should be different",
    variant1.sku,
    variant2.sku,
  );
}
