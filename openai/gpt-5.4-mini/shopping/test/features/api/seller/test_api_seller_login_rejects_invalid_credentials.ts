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

export async function test_api_seller_login_rejects_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: `https://example.com/seller/register/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/${RandomGenerator.alphabets(8)}`,
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(joined);
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  const wrongPasswordError = await TestValidator.httpError(
    "seller login with wrong password should be rejected",
    [400, 401, 403],
    async () => {
      await api.functional.mallPlatform.auth.seller.login(
        wrongPasswordConnection,
        {
          body: {
            email: sellerEmail,
            password: typia.random<string & tags.Format<"password">>(),
          } satisfies IMallPlatformSeller.ILogin,
        },
      );
    },
  );
  void wrongPasswordError;
  const unknownEmailConnection: api.IConnection = { host: connection.host };
  const unknownEmailError = await TestValidator.httpError(
    "seller login with unknown email should be rejected",
    [400, 401, 403],
    async () => {
      await api.functional.mallPlatform.auth.seller.login(
        unknownEmailConnection,
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: sellerPassword,
          } satisfies IMallPlatformSeller.ILogin,
        },
      );
    },
  );
  void unknownEmailError;
}
