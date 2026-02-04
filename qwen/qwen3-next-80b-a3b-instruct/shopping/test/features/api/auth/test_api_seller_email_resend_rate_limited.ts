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
export async function test_api_seller_email_resend_rate_limited(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new connection and register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Step 2: Use authenticated seller connection for resend requests
  // First request should succeed
  await api.functional.shoppingMall.seller.auth.sellers.email.resend(
    sellerConnection,
  );
  // Second request should succeed
  await api.functional.shoppingMall.seller.auth.sellers.email.resend(
    sellerConnection,
  );
  // Third request should trigger rate limiting (429)
  await TestValidator.error(
    "rate limit should trigger on third request",
    async () => {
      await api.functional.shoppingMall.seller.auth.sellers.email.resend(
        sellerConnection,
      );
    },
  );
}
