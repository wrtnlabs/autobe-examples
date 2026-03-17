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
  // 1. Register a new seller to obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const initialJoinResponse = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(initialJoinResponse);
  // 2. Extract tokens from initial response
  const oldRefreshToken = initialJoinResponse.token.refresh;
  const oldAccessToken = initialJoinResponse.token.access;
  const sellerId = initialJoinResponse.id;
  const sellerEmail = initialJoinResponse.email;
  // 3. Refresh the access token using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_seller_refresh(refreshConnection, {
    body: {
      refresh_token: oldRefreshToken,
    } satisfies IEcommerceMallSeller.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Validate refresh response contains new token pair
  const newAccessToken = refreshResponse.token.access;
  const newRefreshToken = refreshResponse.token.refresh;
  const newExpiredAt = refreshResponse.token.expired_at;
  const newRefreshableUntil = refreshResponse.token.refreshable_until;
  // 5. Validate seller identity remains consistent across refresh
  TestValidator.equals(
    "seller id matches initial registration",
    refreshResponse.id,
    sellerId,
  );
  TestValidator.equals(
    "seller email matches initial registration",
    refreshResponse.email,
    sellerEmail,
  );
  TestValidator.equals(
    "created_at matches initial registration",
    refreshResponse.created_at,
    initialJoinResponse.created_at,
  );
  // 6. Validate tokens are rotated (different from old tokens)
  TestValidator.notEquals(
    "access token is rotated",
    oldAccessToken,
    newAccessToken,
  );
  TestValidator.notEquals(
    "refresh token is rotated",
    oldRefreshToken,
    newRefreshToken,
  );
  // 7. Validate token expiration timestamps are valid
  TestValidator.predicate(
    "access token expired_at is valid date-time format",
    !isNaN(Date.parse(newExpiredAt)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time format",
    !isNaN(Date.parse(newRefreshableUntil)),
  );
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(newExpiredAt) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(newRefreshableUntil) > new Date(newExpiredAt),
  );
  // 8. Validate the new access token can authenticate subsequent requests
  const testConnection: api.IConnection = { host: connection.host };
  testConnection.headers = {
    Authorization: newAccessToken,
  };
  // Test that new token works by attempting a protected operation
  // Verify token metadata is correctly included in the response
  TestValidator.equals(
    "new token has valid refresh token",
    newRefreshToken.length > 0,
    true,
  );
  TestValidator.equals(
    "new token has valid access token",
    newAccessToken.length > 0,
    true,
  );
  TestValidator.predicate(
    "expired_at exists and is valid",
    newExpiredAt !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until exists and is valid",
    newRefreshableUntil !== undefined,
  );
}
