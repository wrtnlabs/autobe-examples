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

export async function test_api_seller_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register seller account to get initial tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const registerOutput = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(registerOutput);
  // 2. Extract refresh token from registration response
  const initialRefreshToken = registerOutput.token.refresh;
  // 3. Refresh: Use the refresh token to get new tokens
  const sellerRefreshConnection: api.IConnection = { host: connection.host };
  const refreshBody = {
    refresh_token: initialRefreshToken,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSeller.IRefresh;
  const refreshOutput = await authorize_seller_refresh(
    sellerRefreshConnection,
    {
      body: refreshBody,
    },
  );
  typia.assert(refreshOutput);
  // 4. Verify tokens are returned
  TestValidator.equals(
    "access token exists",
    refreshOutput.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    refreshOutput.token.refresh.length > 0,
    true,
  );
  // 5. Verify new tokens are different from original
  TestValidator.notEquals(
    "access token changed",
    registerOutput.token.access,
    refreshOutput.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    initialRefreshToken,
    refreshOutput.token.refresh,
  );
  // 6. Verify expiration timestamps are valid
  TestValidator.predicate(
    "access expires before refreshable until",
    new Date(refreshOutput.token.expired_at) <=
      new Date(refreshOutput.token.refreshable_until),
  );
}