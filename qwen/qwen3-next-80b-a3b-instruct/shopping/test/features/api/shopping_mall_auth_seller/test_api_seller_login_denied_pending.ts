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

export async function test_api_seller_login_denied_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a pending seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  await authorize_seller_join(sellerConnection, {
    body: { email, password } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Attempt to login as the pending seller - should fail with 403
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "seller login denied for pending account",
    async () => {
      await authorize_seller_login(loginConnection, {
        body: { email, password } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );
}
