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

export async function test_api_seller_login_incorrect_password(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Failed seller login with incorrect password
  // 1. Register a new seller
  // 2. Attempt login with correct email but incorrect password
  // 3. Expect error for authentication failure, no JWT tokens issued
  const sellerConnection: api.IConnection = { host: connection.host };
  // 1. Register new seller using utility function
  const sellerJoinInput: Partial<IShoppingMallSeller.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPass123",
    shopName: RandomGenerator.name(1),
  };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: sellerJoinInput,
  });
  typia.assert(authorizedSeller);
  // 2. Attempt login with correct email but incorrect password
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput: IShoppingMallSeller.ILogin = {
    email: sellerJoinInput.email as string,
    password: "WrongPassword",
  };
  // 3. Expect error thrown by login call due to incorrect password
  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await authorize_seller_login(loginConnection, { body: loginInput });
    },
  );
}
