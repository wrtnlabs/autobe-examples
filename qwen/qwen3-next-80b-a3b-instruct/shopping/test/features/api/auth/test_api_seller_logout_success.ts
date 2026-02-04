import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_logout_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // sellerConnection.headers is now updated internally by authorize_seller_join function
  // Step 2: Call the logout endpoint with the authenticated connection
  await api.functional.shoppingMall.seller.auth.sellers.logout.erase(
    sellerConnection,
  );
  // Step 3: Try to make another API call with the same connection to verify token is invalidated
  await TestValidator.error("logout should invalidate token", async () => {
    await api.functional.shoppingMall.seller.auth.sellers.logout.erase(
      sellerConnection,
    );
  });
}
