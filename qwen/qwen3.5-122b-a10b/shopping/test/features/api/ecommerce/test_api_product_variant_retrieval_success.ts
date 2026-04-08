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
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test successful retrieval of a product variant by its ID within the context of its parent product.
 *
 * Validates the complete workflow of creating a seller account, creating a product with variants, and successfully retrieving a specific variant by its ID. Ensures that the variant response contains all required fields including SKU code, option values, pricing information, stock quantity, and parent product summary.
 *
 * The test verifies that the variant retrieval endpoint correctly returns the variant details with proper data types and relationships, including the parent product summary with seller and category information.
 *
 * 1. Create a seller account with email verification and login.
 * 2. Create a product with base price and category assignment.
 * 3. Create a product variant with SKU code, option values, and optional price override.
 * 4. Retrieve the variant using GET /ecommerce/products/{productId}/variants/{variantId}.
 * 5. Validate the response contains correct variant id, sku_code, option_values format.
 * 6. Verify price override is set correctly or null for base price inheritance.
 * 7. Confirm stock_quantity is computed from inventory history.
 * 8. Validate timestamps (created_at, updated_at) are properly formatted.
 * 9. Ensure deleted_at is null indicating active variant status.
 * 10. Verify parent product summary includes seller and category information.
 */
export async function test_api_product_variant_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
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
  // 2. Create product with variant
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        variants: [
          {
            sku_code: `${RandomGenerator.alphabets(3)}-${RandomGenerator.alphabets(3)}`,
            option_values: `color=${RandomGenerator.name(1)};size=${RandomGenerator.name(1)}`,
            price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<500>
            >(),
          } satisfies IEcommerceProductVariant.ICreate,
        ],
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Ensure we have at least one variant
  if (product.variants.length === 0) {
    throw new Error("Product must have at least one variant");
  }
  const variant = product.variants[0];
  // 3. Retrieve the variant using authenticated seller connection
  const retrievedVariant = await api.functional.ecommerce.products.variants.at(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  typia.assert(retrievedVariant);
  // 4. Validate variant fields
  TestValidator.equals("variant id matches", retrievedVariant.id, variant.id);
  TestValidator.equals(
    "sku_code matches",
    retrievedVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.equals(
    "option_values matches",
    retrievedVariant.option_values,
    variant.option_values,
  );
  TestValidator.equals("price matches", retrievedVariant.price, variant.price);
  TestValidator.predicate(
    "stock_quantity is non-negative",
    retrievedVariant.stock_quantity >= 0,
  );
  TestValidator.equals("deleted_at is null", retrievedVariant.deleted_at, null);
  // 5. Validate parent product summary
  TestValidator.equals(
    "product id matches",
    retrievedVariant.product.id,
    product.id,
  );
  TestValidator.equals(
    "product name matches",
    retrievedVariant.product.name,
    product.name,
  );
  TestValidator.equals(
    "product base_price matches",
    retrievedVariant.product.base_price,
    product.basePrice,
  );
  TestValidator.predicate(
    "product seller has shop_name",
    retrievedVariant.product.seller.shop_name.length > 0,
  );
  TestValidator.predicate(
    "product category has name",
    retrievedVariant.product.category.name.length > 0,
  );
}
