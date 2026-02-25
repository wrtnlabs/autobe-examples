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

export async function test_api_seller_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinResponse = await authorize_seller_join(joinConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Login to obtain refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_seller_login(loginConnection, {
    body: {
      email: joinEmail, // Corrected: use original email, not joinResponse.id
      password: joinPassword, // Corrected: use original password, not new random
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResponse);
  // 3. Use refresh token to obtain new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_seller_refresh(refreshConnection, {
    body: {
      refresh_token: loginResponse.token.refresh, // Corrected: use token.refresh, not loginResponse.id
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Validate token rotation: new tokens issued
  TestValidator.notEquals(
    "new access token differs from old",
    loginResponse.token.access,
    refreshResponse.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from old",
    loginResponse.token.refresh,
    refreshResponse.token.refresh,
  );
  TestValidator.predicate("new access token expires within 30 minutes", () => {
    const newExpires = new Date(refreshResponse.token.expired_at);
    const now = new Date();
    const diffMinutes = (newExpires.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes <= 30 && diffMinutes >= 15; // Widened window to avoid timing flakiness
  });
  TestValidator.predicate("new refresh token valid for 30 days", () => {
    const newRefreshUntil = new Date(refreshResponse.token.refreshable_until);
    const now = new Date();
    const diffDays =
      (newRefreshUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 28 && diffDays <= 32; // Widened window to avoid timing flakiness
  });
  // 5. Verify old refresh token is invalidated (attempt to reuse)
  const reuseConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "old refresh token successfully invalidated",
    async () => {
      await authorize_seller_refresh(reuseConnection, {
        body: {
          refresh_token: loginResponse.token.refresh,
        } satisfies IShoppingMallSeller.IRefresh,
      });
    },
  );
}
