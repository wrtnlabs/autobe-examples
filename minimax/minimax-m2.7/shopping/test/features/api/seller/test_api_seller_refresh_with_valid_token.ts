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

export async function test_api_seller_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller to obtain initial tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_seller_join(sellerConnection, {});
  typia.assert(registered);
  // Store original tokens for comparison
  const originalAccessToken = registered.token.access;
  const originalRefreshToken = registered.token.refresh;
  // 2. Refresh tokens using the valid refresh token
  const refreshed = await authorize_seller_refresh(sellerConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IEcommerceMallSeller.IRefresh,
  });
  typia.assert(refreshed);
  // 3. Verify seller info matches
  TestValidator.equals("seller id matches", refreshed.id, registered.id);
  TestValidator.equals(
    "seller email matches",
    refreshed.email,
    registered.email,
  );
  TestValidator.equals(
    "approval status is pending",
    refreshed.approvalStatus,
    "pending",
  );
  // 4. Verify token rotation occurred (new tokens different from original)
  TestValidator.notEquals(
    "new access token differs",
    refreshed.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs",
    refreshed.token.refresh,
    originalRefreshToken,
  );
  // 5. Verify token expiration timestamps are valid
  TestValidator.predicate(
    "expired_at is valid date-time",
    (() => {
      const date = new Date(refreshed.token.expired_at);
      return !isNaN(date.getTime());
    })(),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    (() => {
      const date = new Date(refreshed.token.refreshable_until);
      return !isNaN(date.getTime());
    })(),
  );
  // 6. Verify refreshable_until is in the future
  TestValidator.predicate(
    "refreshable_until is in future",
    (() => {
      const refreshableUntil = new Date(refreshed.token.refreshable_until);
      const now = new Date();
      return refreshableUntil > now;
    })(),
  );
}
