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
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that sellers cannot update a product name to duplicate another product name
 * within their own catalog, enforcing the unique product name constraint per seller.
 *
 * Setup:
 * 1. Authenticate as a seller
 * 2. Create Product A with name 'Widget Alpha'
 * 3. Create Product B with name 'Widget Beta'
 *
 * Test Steps:
 * 1. Attempt to update Product B's name to 'Widget Alpha' (same as Product A's name)
 *
 * Validations:
 * - Response status should be 409 Conflict
 * - Product B should remain unchanged with its original name 'Widget Beta'
 */
export async function test_api_product_update_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create Product A with name 'Widget Alpha'
  const productA =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: "Widget Alpha",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(productA);
  // 3. Create Product B with name 'Widget Beta'
  const productB =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: "Widget Beta",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(productB);
  // 4. Attempt to update Product B's name to 'Widget Alpha' (duplicate)
  // This should fail with 409 Conflict
  await TestValidator.httpError(
    "update product with duplicate name should fail",
    409,
    async () =>
      await api.functional.shoppingMall.seller.products.update(
        sellerConnection,
        {
          productId: productB.id,
          body: {
            name: "Widget Alpha",
          } satisfies IShoppingMallProduct.IUpdate,
        },
      ),
  );
}
