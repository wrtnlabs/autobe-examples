import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoin: IEcommerceMallSeller.IJoin = {
    email: sellerEmail,
    password: correctPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const sellerConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.seller.join(sellerConnection, {
    body: sellerJoin,
  });
  // 2. Attempt to login with wrong password
  // Should return HTTP 401 error with generic message (not revealing email existence)
  await TestValidator.httpError(
    "seller login with wrong password should fail with 401",
    401,
    async () => {
      const loginConnection: api.IConnection = { host: connection.host };
      await api.functional.ecommerceMall.auth.seller.login(loginConnection, {
        body: {
          email: sellerEmail,
          password: "WrongPassword123!",
          href: sellerJoin.href,
          referrer: sellerJoin.referrer,
        } satisfies IEcommerceMallSeller.ILogin,
      });
    },
  );
}
