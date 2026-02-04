import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_customer_token_refresh_expired(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a valid customer account using authorize_customer_join
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(authorized);
  // Step 2: Extract the refresh token from the authorization response
  const refreshTokenValue: string = authorized.token.refresh;
  // Step 3: Use the refresh token to obtain a new access token
  // This is the first refresh - should succeed
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_refresh(refreshConnection, {
      body: { refreshToken: refreshTokenValue },
    });
  typia.assert(refreshed);
  // Step 4: Attempt to use the same refresh token again
  // According to RFC 6749, using a refresh token once invalidates it
  // This second attempt should return 401 Unauthorized
  await TestValidator.error(
    "previous refresh token should be invalidated after use and return 401 Unauthorized",
    async () => {
      await authorize_customer_refresh(refreshConnection, {
        body: { refreshToken: refreshTokenValue },
      });
    },
  );
}
