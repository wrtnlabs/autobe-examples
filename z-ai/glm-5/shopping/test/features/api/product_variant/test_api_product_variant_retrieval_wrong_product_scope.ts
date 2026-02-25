import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test that attempting to retrieve a variant using a productId that does not own the variant returns 404 Not Found.
 *
 * Scenario:
 * 1. Seller joins and gets authenticated
 * 2. Create Product A
 * 3. Create Product B
 * 4. Create a variant under Product A
 * 5. Verify variant can be retrieved with correct productId (Product A)
 * 6. Attempt to retrieve the same variant using Product B's productId
 * 7. Expect 404 Not Found error because variant doesn't belong to Product B
 *
 * This validates the product scope validation in the variant lookup -
 * the WHERE clause includes shopping_mall_product_id = productId to ensure
 * variant belongs to the specified product.
 */
export async function test_api_product_variant_retrieval_wrong_product_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create Product A
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(productA);
  // 3. Create Product B
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(productB);
  // 4. Create variant under Product A
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productA.id },
      },
    );
  typia.assert(variant);
  // 5. Verify variant can be retrieved with correct productId (Product A)
  const retrievedVariant =
    await api.functional.shoppingMall.seller.products.variants.at(
      sellerConnection,
      {
        productId: productA.id,
        variantId: variant.id,
      },
    );
  typia.assert(retrievedVariant);
  TestValidator.equals("variant id matches", retrievedVariant.id, variant.id);
  // 6. Attempt to retrieve variant using wrong productId (Product B)
  // This should return 404 because the variant does not belong to Product B
  await TestValidator.httpError(
    "variant retrieval with wrong product scope",
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
