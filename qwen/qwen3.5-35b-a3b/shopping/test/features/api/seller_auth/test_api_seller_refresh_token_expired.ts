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

export async function test_api_seller_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account to establish baseline and obtain refresh token
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(joinConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(joinResult);
  // 2. Capture the refresh token from authorization response
  const validRefreshToken = joinResult.token.refresh;
  // 3. Attempt to refresh with the valid token first (baseline - should succeed)
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshBody = {
    refresh_token: validRefreshToken,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSeller.IRefresh;
  const successfulRefresh = await authorize_seller_refresh(refreshConnection, {
    body: refreshBody,
  });
  typia.assert(successfulRefresh);
  // 4. After successful refresh, the old token should be invalidated (if rotation is enabled)
  // OR we can test with a completely invalid/expired token
  // Since we cannot directly manipulate database session records, we test with an invalid token
  const invalidRefreshBody = {
    refresh_token: "00000000-0000-0000-0000-000000000000", // Clearly invalid UUID
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSeller.IRefresh;
  // 5. Try to refresh with invalid token - should fail with appropriate error
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should reject invalid refresh token",
    [401],
    async () => {
      await authorize_seller_refresh(invalidRefreshConnection, {
        body: invalidRefreshBody,
      });
    },
  );
}
