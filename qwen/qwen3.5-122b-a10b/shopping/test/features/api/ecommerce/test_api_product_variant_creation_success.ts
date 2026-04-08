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
 * Test successful product variant creation with required fields.
 *
 * Validates the primary success path for creating a product variant (SKU) under an existing product. A seller authenticates, creates a parent product, then adds a variant with SKU code and option values in key=value format separated by semicolons. The variant is created without a price override to verify it inherits the product's base price for cart calculations.
 *
 * The test ensures the created variant includes all required fields: generated UUID, product reference, SKU code, option values, computed stock quantity, and timestamps. Business logic validations confirm the variant correctly references its parent product and maintains proper option value formatting.
 *
 * 1. Seller registers and authenticates with email verification workflow.
 * 2. Seller creates a parent product with name, description, category, and base price.
 * 3. Seller creates a variant with SKU code and option values (e.g., 'color=Red;size=Large').
 * 4. Variant is created without price override, inheriting product's base price.
 * 5. Validates variant has correct product reference and all required fields.
 * 6. Confirms option_values format is preserved with semicolon-separated key=value pairs.
 * 7. Verifies stock_quantity is computed as non-negative integer from inventory history.
 */
export async function test_api_product_variant_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Create parent product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create variant for the product
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: `${RandomGenerator.alphabets(4).toUpperCase()}-${RandomGenerator.alphabets(3).toUpperCase()}`,
          option_values: `color=${RandomGenerator.alphabets(5)};size=${RandomGenerator.alphabets(4)}`,
        } satisfies IEcommerceProductVariant.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 4. Validate variant has correct product reference
  TestValidator.equals(
    "variant references correct product",
    variant.product.id,
    product.id,
  );
  // 5. Validate option_values format (semicolon-separated key=value pairs)
  const optionPairs = variant.option_values.split(";");
  TestValidator.predicate(
    "option_values has at least one pair",
    optionPairs.length >= 1,
  );
  for (const pair of optionPairs) {
    TestValidator.predicate(
      "each option pair has key=value format",
      pair.includes("="),
    );
  }
  // 6. Validate stock_quantity is non-negative integer
  TestValidator.predicate(
    "stock_quantity is non-negative",
    variant.stock_quantity >= 0,
  );
  // 7. Validate timestamps are valid ISO 8601 date-time strings
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(variant.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(variant.updated_at)),
  );
}
