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
 * Test variant retrieval with mismatched product ID returns 404 Not Found.
 *
 * Validates that the system properly enforces product-variant ownership relationships when retrieving variants. The test ensures that attempting to access a variant using a productId that does not match the variant's actual parent product results in a 404 error, preventing unauthorized cross-product variant access.
 *
 * This security validation is critical for multi-tenant seller platforms where sellers may have multiple products. The endpoint must verify that the variant belongs to the specified product scope before returning data, protecting against accidental or malicious data exposure across product boundaries.
 *
 * 1. Seller registers and authenticates to obtain valid session.
 * 2. Seller creates two distinct products (product A and product B).
 * 3. Seller creates a variant under product A only.
 * 4. Attempt to retrieve the variant using product B's ID with the variant's ID.
 * 5. Verify the API returns 404 Not Found error.
 * 6. Confirm error message indicates variant not found for the given product scope.
 */
export async function test_api_product_variant_mismatched_product_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Create two separate products
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(productA);
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(productB);
  // Verify products are distinct
  TestValidator.notEquals(
    "products have different IDs",
    productA.id,
    productB.id,
  );
  // 3. Create a variant under product A
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productA.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: "Color: Red, Size: Large",
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Verify variant belongs to product A
  TestValidator.equals(
    "variant product ID matches product A",
    variant.product.id,
    productA.id,
  );
  // 4-6. Attempt to retrieve variant using product B's ID (mismatched) - should return 404
  await TestValidator.httpError(
    "mismatched product ID returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.products.variants.at(
        sellerConnection,
        {
          productId: productB.id,
          variantId: variant.id,
        },
      );
    },
  );
}
