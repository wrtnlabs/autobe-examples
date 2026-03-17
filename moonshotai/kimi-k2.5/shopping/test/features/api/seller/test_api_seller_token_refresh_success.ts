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

export async function test_api_seller_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register seller to obtain initial tokens
  const initialAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(initialAuth);
  // 3. Refresh token using the refresh token from initial authentication
  const refreshedAuth = await authorize_seller_refresh(sellerConnection, {
    body: {
      refreshToken: initialAuth.token.refresh,
    } satisfies IEcommerceMallSeller.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 4. Validate that new tokens are different from old tokens
  TestValidator.notEquals(
    "access token should be different",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
}
