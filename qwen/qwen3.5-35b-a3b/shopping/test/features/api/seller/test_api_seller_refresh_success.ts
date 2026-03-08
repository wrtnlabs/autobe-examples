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
  // 1. Setup: Create seller account with known credentials
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(joinResult);
  // 2. Setup: Login seller to obtain tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: joinPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(loginResult);
  // 3. Test: Refresh token using refresh endpoint
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_seller_refresh(refreshConnection, {
    body: {
      refresh_token: loginResult.token.refresh,
    } satisfies IEcommerceMallSeller.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Validate: Response contains seller identity
  TestValidator.equals("seller id matches", refreshResult.id, loginResult.id);
  TestValidator.equals(
    "seller email matches",
    refreshResult.email,
    loginResult.email,
  );
  TestValidator.equals(
    "approval status",
    refreshResult.approval_status,
    loginResult.approval_status,
  );
  TestValidator.equals(
    "is suspended",
    refreshResult.is_suspended,
    loginResult.is_suspended,
  );
  TestValidator.equals(
    "is banned",
    refreshResult.is_banned,
    loginResult.is_banned,
  );
  // 5. Validate: New tokens generated (token exists and non-empty)
  TestValidator.notEquals(
    "access token present",
    refreshResult.token.access,
    "",
  );
  TestValidator.notEquals(
    "refresh token present",
    refreshResult.token.refresh,
    "",
  );
  // 6. Validate: Token expiration timestamps present and valid
  TestValidator.notEquals(
    "expired_at present",
    refreshResult.token.expired_at,
    "",
  );
  TestValidator.notEquals(
    "refreshable_until present",
    refreshResult.token.refreshable_until,
    "",
  );
  // 7. Validate: Token rotation - old refresh token is invalidated
  await TestValidator.error("old refresh token invalidated", async () => {
    const invalidRefreshConnection: api.IConnection = { host: connection.host };
    await authorize_seller_refresh(invalidRefreshConnection, {
      body: {
        refresh_token: loginResult.token.refresh,
      } satisfies IEcommerceMallSeller.IRefresh,
    });
  });
}
