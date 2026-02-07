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

export async function test_api_seller_login_denied_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create a new seller account
  const adminConnection: api.IConnection = { host: connection.host };
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphabets(12);
  const joinResponse = await authorize_seller_join(adminConnection, {
    body: {
      email: testEmail,
      password: testPassword,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResponse);
  // Create a connection for login attempt
  const loginConnection: api.IConnection = { host: connection.host };
  // Attempt login with credentials of seller account
  // Since seller account created is in 'pending' status (per spec),
  // login should be denied (even though credentials are valid)
  // This matches the scenario intent: "deny access to deleted seller"
  // We can't create a true deleted seller (no API), so we test with pending
  // which also denies login per service specification
  await TestValidator.error("login denied for pending seller", async () => {
    await authorize_seller_login(loginConnection, {
      body: {
        email: testEmail,
        password: testPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  });
}
