import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { generate_random_shopping_mall_seller_products_variants_options_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_options_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test adding multiple option attributes to a product variant.
 *
 * This test validates the seller workflow of defining variant characteristics
 * by adding multiple option key-value pairs (e.g., color=Red, size=Large) to
 * the same variant. Each option is stored as a separate record in the normalized
 * child table, and all options must reference the same parent variant.
 *
 * Workflow:
 * 1. Seller registers and authenticates
 * 2. Seller creates a product
 * 3. Seller creates a variant under the product
 * 4. Seller adds first option (color=Red)
 * 5. Seller adds second option (size=Large)
 * 6. Validate both options exist with unique IDs and correct key-value pairs
 */
export async function test_api_product_variant_option_multiple_attributes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create a variant under the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Add first option (color=Red)
  const colorOption =
    await generate_random_shopping_mall_seller_products_variants_options_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          key: "color",
          value: "Red",
        } satisfies IShoppingMallProductVariantOption.ICreate,
      },
    );
  typia.assert(colorOption);
  // 5. Add second option (size=Large)
  const sizeOption =
    await generate_random_shopping_mall_seller_products_variants_options_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          key: "size",
          value: "Large",
        } satisfies IShoppingMallProductVariantOption.ICreate,
      },
    );
  typia.assert(sizeOption);
  // 6. Validate both options
  TestValidator.notEquals(
    "option IDs are unique",
    colorOption.id,
    sizeOption.id,
  );
  TestValidator.equals("color option key", colorOption.key, "color");
  TestValidator.equals("color option value", colorOption.value, "Red");
  TestValidator.equals("size option key", sizeOption.key, "size");
  TestValidator.equals("size option value", sizeOption.value, "Large");
  TestValidator.equals(
    "both options reference same variant",
    colorOption.variant.id,
    sizeOption.variant.id,
  );
  TestValidator.equals(
    "color option variant ID matches",
    colorOption.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "size option variant ID matches",
    sizeOption.variant.id,
    variant.id,
  );
  TestValidator.predicate(
    "color option has created_at",
    colorOption.created_at !== undefined,
  );
  TestValidator.predicate(
    "size option has created_at",
    sizeOption.created_at !== undefined,
  );
  TestValidator.predicate(
    "color option has updated_at",
    colorOption.updated_at !== undefined,
  );
  TestValidator.predicate(
    "size option has updated_at",
    sizeOption.updated_at !== undefined,
  );
}