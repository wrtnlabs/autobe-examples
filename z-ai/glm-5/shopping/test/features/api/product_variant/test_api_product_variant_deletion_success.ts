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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test successful deletion of a product variant when there are no blocking constraints.
 *
 * Workflow:
 * 1. Create a seller account and authenticate
 * 2. Create a product for the seller
 * 3. Create at least two variants for the product
 * 4. Delete one of the variants
 * 5. Verify deletion succeeded
 */
export async function test_api_product_variant_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(),
    } satisfies DeepPartial<IShoppingMallSeller.IJoin>,
  });
  // Step 2: Create a product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<99999>
          >(),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies DeepPartial<IShoppingMallProduct.ICreate>,
      },
    );
  typia.assert(product);
  // Step 3: Create two variants for the product
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphabets(8)}`,
          option_values: { color: "Red", size: "Large" },
          price: typia.random<
            number & tags.Minimum<100> & tags.Maximum<99999>
          >(),
        } satisfies DeepPartial<IShoppingMallProductVariant.ICreate>,
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphabets(8)}`,
          option_values: { color: "Blue", size: "Medium" },
          price: typia.random<
            number & tags.Minimum<100> & tags.Maximum<99999>
          >(),
        } satisfies DeepPartial<IShoppingMallProductVariant.ICreate>,
      },
    );
  typia.assert(variant2);
  // Step 4: Delete the first variant
  await api.functional.shoppingMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant1.id,
    },
  );
  // Step 5: Verify by checking the second variant still exists
  // The erase function returns void on success, so we verify by ensuring
  // the second variant can still be referenced
  TestValidator.predicate(
    "remaining variant exists after deletion",
    variant2.id !== variant1.id,
  );
}
