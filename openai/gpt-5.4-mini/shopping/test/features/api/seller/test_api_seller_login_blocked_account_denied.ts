import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_blocked_account_denied(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Str0ngP@ssw0rd!",
    href: "https://example.com/register",
    referrer: "https://example.com/",
    ip: "127.0.0.1",
  } satisfies IMallPlatformSeller.IJoin;
  const authorized = await authorize_seller_join(sellerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "seller login should be denied for invalid credentials",
    async () => {
      await authorize_seller_login(loginConnection, {
        body: {
          email: joinBody.email,
          password: "incorrect-password",
        } satisfies IMallPlatformSeller.ILogin,
      });
    },
  );
}
