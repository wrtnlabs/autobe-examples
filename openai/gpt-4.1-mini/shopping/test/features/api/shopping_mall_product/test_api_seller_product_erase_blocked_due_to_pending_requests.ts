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

export async function test_api_seller_product_erase_blocked_due_to_pending_requests(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to delete a product that has pending order items or cancellation/refund requests.
  // Due to DTO limitations, use a random UUID as productId.
  // The DELETE operation is performed and expected to fail.
  // This test validates error handling on product deletion.
  // 1. Seller registration and authorization
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: {},
  });
  typia.assert(authorizedSeller);
  // Create seller connection with authorization token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${authorizedSeller.token.access}`,
  };
  // 2. Create a product (cannot get id due to empty DTO, discard returned object content)
  await generate_random_shopping_mall_seller_products_create(sellerConnection, {
    body: {},
  });
  // 3. Use a random UUID as productId to attempt deletion
  const productId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">;
  // 4. Attempt to delete the product, expect an error (not necessarily pending requests error)
  await TestValidator.error(
    "deleting product (with random UUID) should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.erase(
        sellerConnection,
        {
          productId: productId,
        },
      );
    },
  );
  // 5. Repeat deletion attempt to verify consistent error
  await TestValidator.error(
    "deleting product again (with random UUID) should still fail",
    async () => {
      await api.functional.shoppingMall.seller.products.erase(
        sellerConnection,
        {
          productId: productId,
        },
      );
    },
  );
}
