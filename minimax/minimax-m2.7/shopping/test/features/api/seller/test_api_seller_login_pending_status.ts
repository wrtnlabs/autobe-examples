import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account (creates seller with 'pending' status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const registeredSeller = await authorize_seller_join(sellerConnection, {
    body: {
      password: password as string & tags.Format<"password">,
    },
  });
  // Extract email from the registered seller
  const email = registeredSeller.email;
  // 2. Attempt login WITHOUT admin approval - seller remains in 'pending' status
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login fails for pending seller",
    403,
    async () => {
      await api.functional.ecommerceMall.auth.seller.login(loginConnection, {
        body: {
          email,
          password,
        } satisfies IEcommerceMallSeller.ILogin,
      });
    },
  );
}
