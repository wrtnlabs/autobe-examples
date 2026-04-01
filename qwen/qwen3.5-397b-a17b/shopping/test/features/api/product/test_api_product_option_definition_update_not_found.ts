import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test the error scenario when attempting to update a non-existent option definition.
 *
 * Test Flow:
 * 1. Seller registers and authenticates
 * 2. Seller creates a product (to establish valid product context)
 * 3. Seller attempts to update an option definition using a random UUID that doesn't exist
 * 4. System returns 404 error indicating the option definition was not found
 *
 * This validates proper error handling for invalid resource references and ensures
 * the system correctly verifies option definition existence before attempting updates.
 */
export async function test_api_product_option_definition_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create a product to establish valid product context for the path parameter
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(product);
  // 3. Attempt to update a non-existent option definition with random UUID
  // This should return 404 error as the option definition doesn't exist
  const nonExistentOptionDefinitionId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("option definition not found", async () => {
    await api.functional.shoppingMall.seller.products.option_definitions.update(
      sellerConnection,
      {
        productId: product.id,
        optionDefinitionId: nonExistentOptionDefinitionId,
        body: {
          name: "Updated Option Name",
        } satisfies IShoppingMallProductOptionDefinition.IUpdate,
      },
    );
  });
}
