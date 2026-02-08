import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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

export async function test_api_seller_product_erase_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Attempt to delete a product using a seller account unauthorized for the product.
  // The test flow registers two sellers with independent authentication contexts.
  // The first seller creates a product.
  // The second seller attempts to delete that product, expecting an authorization failure.
  // The test confirms the product remains undeleted and returns an appropriate unauthorized access error.
  // This scenario validates correct security enforcement ensuring that only the owning seller can delete their products.
  // Register first seller
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSellerAuth = await authorize_seller_join(firstSellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(firstSellerAuth);
  // First seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    firstSellerConnection,
    {},
  );
  const typedProduct = typia.assert<IShoppingMallProduct & { id: string }>(product);
  // Register second seller
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSellerAuth = await authorize_seller_join(secondSellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(secondSellerAuth);
  // Second seller tries to delete the first seller's product - expect authorization failure
  await TestValidator.httpError(
    "Unauthorized product deletion attempt by non-owner",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.erase(
        secondSellerConnection,
        {
          productId: typedProduct.id,
        },
      );
    },
  );
  // Confirm the product still exists by attempting deletion with owner (first seller) - should succeed
  const deletedProduct =
    await api.functional.shoppingMall.seller.products.erase(
      firstSellerConnection,
      {
        productId: typedProduct.id,
      },
    );
  const typedDeletedProduct = typia.assert<IShoppingMallProduct & { id: string }>(deletedProduct);
  TestValidator.equals(
    "Deleted product ID matches created product ID",
    typedDeletedProduct.id,
    typedProduct.id,
  );
}
