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

export async function test_api_seller_refresh_token_session_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joined);
  const validRefresh = joined.token.refresh;
  const tamperedRefresh = `${validRefresh}-session-mismatch`;
  TestValidator.notEquals(
    "tampered refresh token must differ from original",
    tamperedRefresh,
    validRefresh,
  );
  TestValidator.equals(
    "original refresh token remains available",
    joined.token.refresh,
    validRefresh,
  );
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh rejects non-resolvable seller session token",
    [400, 401, 403],
    async () => {
      await authorize_seller_refresh(refreshConnection, {
        body: {
          refresh: tamperedRefresh,
        } satisfies IShoppingMallSeller.IRefresh,
      });
    },
  );
}
