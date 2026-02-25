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

export async function test_api_seller_login_unapproved_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new seller with pending approval status
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    shopName: `Shop_${RandomGenerator.alphabets(5)}`,
    shopDescription: null,
    logoUri: null,
  } satisfies IShoppingMallSeller.IJoin;
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: joinInput,
  });
  typia.assert(authorizedSeller);
  // 2. Attempt to login with the unapproved seller account
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  // Login credentials
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IShoppingMallSeller.ILogin;
  // The login is expected to fail due to unapproved status (pending)
  await TestValidator.error(
    "login rejected for unapproved seller",
    async () => {
      await authorize_seller_login(sellerLoginConnection, { body: loginInput });
    },
  );
}
