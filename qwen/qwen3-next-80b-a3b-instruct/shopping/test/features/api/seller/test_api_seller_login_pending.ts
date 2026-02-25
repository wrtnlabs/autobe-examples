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

export async function test_api_seller_login_pending(
  connection: api.IConnection,
): Promise<void> {
  // Create a pending seller account
  const pendingSellerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(pendingSellerConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Attempt to login with the pending seller credentials
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "seller login with pending status should return 403",
    403,
    async () => {
      await authorize_seller_login(loginConnection, {
        body: {
          email,
          password,
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );
}
