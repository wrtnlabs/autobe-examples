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

export async function test_api_seller_login_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare a seller account for login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphabets(8)}@test.com`;
  const password = RandomGenerator.alphabets(12);
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: { email, password } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(authorizedSeller);
  // 2. Attempt to login with correct credentials
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const loginSuccess = await authorize_seller_login(sellerLoginConnection, {
    body: { email, password } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginSuccess);
  // Validate that authorization tokens are present
  TestValidator.predicate(
    "access token is non-empty",
    typeof loginSuccess.token.access === "string" &&
      loginSuccess.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    typeof loginSuccess.token.refresh === "string" &&
      loginSuccess.token.refresh.length > 0,
  );
  // 3. Attempt to login with incorrect password
  await TestValidator.error("reject login with invalid password", async () => {
    await authorize_seller_login(
      { host: connection.host },
      {
        body: {
          email,
          password: password + "x",
        } satisfies IShoppingMallSeller.ILogin,
      },
    );
  });
  // 4. Attempt to login with unregistered email
  await TestValidator.error(
    "reject login with unregistered email",
    async () => {
      await authorize_seller_login(
        { host: connection.host },
        {
          body: {
            email: "notfound" + Date.now() + "@test.com",
            password: "any",
          } satisfies IShoppingMallSeller.ILogin,
        },
      );
    },
  );
}
