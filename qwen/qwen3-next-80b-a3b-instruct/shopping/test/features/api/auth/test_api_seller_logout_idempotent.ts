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
export async function test_api_seller_logout_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate seller to establish session using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<12>>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(authResult);
  // Step 2: Use the sellerConnection with auth token for logout
  // First logout call - should succeed with 204
  await api.functional.shoppingMall.seller.auth.sellers.logout.erase(
    sellerConnection,
  );
  // Step 3: Second logout call - identical session token - should also succeed with 204 (idempotent)
  // Connection still has same headers from first logout
  await api.functional.shoppingMall.seller.auth.sellers.logout.erase(
    sellerConnection,
  );
  // No validation needed as both operations return 204 No Content
  // Success is confirmed by absence of error thrown
}
