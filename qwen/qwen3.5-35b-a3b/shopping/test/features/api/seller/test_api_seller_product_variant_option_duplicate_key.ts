import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_products_variants_options_create_option } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_options_create_option";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test that duplicate option keys for the same product variant are rejected with 409 Conflict.
 *
 * This test validates the business rule enforced by the @@unique([product_variant_id, key])
 * database constraint, which prevents adding multiple options with the same key to a variant.
 *
 * Test Steps:
 * 1. Seller joins the platform
 * 2. Seller creates a product
 * 3. Seller creates a product variant
 * 4. Seller adds an option with key='size', value='Large'
 * 5. Seller attempts to add another option with key='size', value='Small'
 * 6. System should reject with 409 Conflict due to duplicate key constraint
 */
export async function test_api_seller_product_variant_option_duplicate_key(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuthorized);
  // 2. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphaNumeric(8),
          options: { size: "Large", color: "Red" },
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          status: "active",
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Add first option with key='size', value='Large'
  const firstOption =
    await generate_random_ecommerce_mall_seller_products_variants_options_create_option(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          key: "size",
          value: "Large",
        } satisfies IEcommerceMallProductVariantOption.ICreate,
      },
    );
  typia.assert(firstOption);
  // 5. Attempt to add duplicate option with key='size', value='Small'
  // This should fail with 409 Conflict due to @@unique([product_variant_id, key]) constraint
  await TestValidator.error(
    "duplicate option key should be rejected with 409 Conflict",
    async () => {
      await generate_random_ecommerce_mall_seller_products_variants_options_create_option(
        sellerConnection,
        {
          params: { productId: product.id, variantId: variant.id },
          body: {
            key: "size",
            value: "Small",
          } satisfies IEcommerceMallProductVariantOption.ICreate,
        },
      );
    },
  );
  // 6. Verify that a DIFFERENT option key can still be added (business rule only blocks duplicates)
  const secondDifferentOption =
    await generate_random_ecommerce_mall_seller_products_variants_options_create_option(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          key: "color",
          value: "Blue",
        } satisfies IEcommerceMallProductVariantOption.ICreate,
      },
    );
  typia.assert(secondDifferentOption);
  // 7. Validate that different option keys work normally
  TestValidator.notEquals(
    "different option key creates new record",
    firstOption.id,
    secondDifferentOption.id,
  );
}
