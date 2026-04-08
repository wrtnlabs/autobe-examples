import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test seller product variant retrieval by owner.
 *
 * Validates that a seller can successfully retrieve detailed information for a variant belonging to their own product. The test verifies the complete workflow from seller registration through variant creation and retrieval, ensuring proper ownership validation and data integrity.
 *
 * The test creates a seller account, establishes a product with category and pricing, adds a variant with specific SKU and option values, then retrieves the variant to confirm all fields are correctly populated and the ownership relationship is maintained.
 *
 * 1. Register and authenticate a new seller account.
 * 2. Create a product with name, description, category, and base price.
 * 3. Create a variant with SKU code, option values, and price override.
 * 4. Retrieve the variant using GET endpoint with productId and variantId.
 * 5. Verify variant response contains all required fields with correct values.
 * 6. Confirm product summary in variant includes seller, category, name, and base_price.
 */
export async function test_api_product_variant_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"])}, Size: ${RandomGenerator.pick(["S", "M", "L", "XL"])}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 4. Retrieve the variant using GET endpoint
  const retrievedVariant =
    await api.functional.shoppingMall.seller.products.variants.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(retrievedVariant);
  // 5. Verify variant contains all required fields
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
    "deleted_at is null for active variant",
    retrievedVariant.deleted_at === null,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedVariant.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedVariant.updated_at !== null,
  );
  // 6. Verify product summary in variant
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
    product.base_price,
  );
  TestValidator.equals(
    "seller id matches",
    retrievedVariant.product.seller.id,
    product.seller.id,
  );
  TestValidator.equals(
    "category id matches",
    retrievedVariant.product.category.id,
    product.category.id,
  );
}
