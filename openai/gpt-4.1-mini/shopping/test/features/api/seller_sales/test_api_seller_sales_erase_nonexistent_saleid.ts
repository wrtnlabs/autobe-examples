import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sales_erase_nonexistent_saleid(
  connection: api.IConnection,
): Promise<void> {
  // Test the behavior when attempting to delete a sale listing with a non-existent saleId.
  // 1. Authenticate as a new seller using authorize_seller_join utility function.
  // 2. Attempt to delete a sale with a randomly generated UUID that does not exist.
  // 3. Expect an HTTP 404 Not Found error indicating the saleId does not exist.
  // Create seller-specific connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
      shopName: "NonExistentSaleTestShop",
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuth);
  // Set the Authorization header with the returned access token
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // Generate a random UUID that should not exist as saleId
  const nonExistentSaleId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the non-existent sale
  await TestValidator.httpError(
    "Delete non-existent saleId should return 404 Not Found",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sales.erase(sellerConnection, {
        saleId: nonExistentSaleId,
      });
    },
  );
}
