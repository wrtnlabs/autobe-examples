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
export async function test_api_seller_profile_retrieval_unauthenticated_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new seller account with a new connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<12>>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Step 2: Create a fresh unauthenticated connection for the test
  const unauthConnection: api.IConnection = { host: connection.host };
  // Step 3: Attempt to retrieve seller profile without authentication
  // This should fail with 401 Unauthorized
  await TestValidator.error(
    "unauthenticated access to seller profile should return 401",
    async () => {
      await api.functional.shoppingMall.seller.sellers.me.at(unauthConnection);
    },
  );
}
