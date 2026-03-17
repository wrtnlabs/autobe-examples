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
 * Test that a seller cannot delete options from another seller's product variant.
 *
 * This test verifies the hierarchical ownership validation that prevents unauthorized
 * sellers from accessing or modifying product variant options belonging to other sellers.
 * The validation chain ensures: seller → product → variant → option ownership.
 *
 * Setup:
 * 1. Register first seller account (owner)
 * 2. Owner creates a product
 * 3. Owner creates a variant with options under the product
 * 4. Owner adds an option key-value pair to the variant
 * 5. Register second seller account (attacker)
 *
 * Execution:
 * - Second seller (attacker) attempts to DELETE the option using their own auth token
 *
 * Validation:
 * - Verify 403 Forbidden response using TestValidator.httpError
 * - Confirm hierarchical ownership validation prevents cross-seller access
 */
export async function test_api_product_variant_option_deletion_unauthorized_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first seller (owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_seller_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Owner creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    ownerConnection,
    {
      body: {
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Owner creates a variant with options under the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      ownerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            {
              key: "color",
              value: "Red",
            } satisfies IShoppingMallProductVariantOption.ICreate,
          ],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Owner adds an additional option to the variant
  const option =
    await generate_random_shopping_mall_seller_products_variants_options_create(
      ownerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          key: "size",
          value: "Large",
        } satisfies IShoppingMallProductVariantOption.ICreate,
      },
    );
  typia.assert(option);
  // 5. Register second seller (attacker)
  const attackerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(attackerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 6. Attacker attempts to delete the option - should fail with 403 Forbidden
  await TestValidator.httpError(
    "unauthorized seller cannot delete option from another seller's product",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.variants.options.erase(
        attackerConnection,
        {
          productId: product.id,
          variantId: variant.id,
          optionId: option.id,
        },
      );
    },
  );
}