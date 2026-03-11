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
  // Step 1: Register a new seller account to obtain valid refresh token
  const sellerConnection: api.IConnection = { host: connection.host };
  const registeredSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(registeredSeller);
  // Verify seller account has required status
  TestValidator.equals(
    "approval status approved",
    registeredSeller.approval_status,
    "approved",
  );
  TestValidator.predicate("seller not banned", !registeredSeller.is_banned);
  TestValidator.predicate(
    "seller not suspended",
    !registeredSeller.is_suspended,
  );
  // Store old tokens for comparison
  const oldAccessToken = registeredSeller.token.access;
  const oldRefreshToken = registeredSeller.token.refresh;
  const oldAccessExpiration = registeredSeller.token.expired_at;
  const oldRefreshableUntil = registeredSeller.token.refreshable_until;
  // Step 2: Prepare and call refresh endpoint with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedSeller = await authorize_seller_refresh(refreshConnection, {
    body: {
      refresh_token: registeredSeller.token.refresh,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IRefresh,
  });
  typia.assert(refreshedSeller);
  // Step 3: Verify new tokens are generated and different from old tokens
  const newAccessToken = refreshedSeller.token.access;
  const newRefreshToken = refreshedSeller.token.refresh;
  const newAccessExpiration = refreshedSeller.token.expired_at;
  const newRefreshableUntil = refreshedSeller.token.refreshable_until;
  // New access token should be different from old access token
  TestValidator.notEquals(
    "new access token differs from old",
    oldAccessToken,
    newAccessToken,
  );
  // New refresh token should be different from old refresh token (rotation enabled)
  TestValidator.notEquals(
    "new refresh token differs from old",
    oldRefreshToken,
    newRefreshToken,
  );
  // Step 4: Verify token expiration timestamps are valid
  const accessExpiredAtDate = new Date(newAccessExpiration);
  const refreshableUntilDate = new Date(newRefreshableUntil);
  const now = new Date();
  // New access token should expire in the future
  TestValidator.predicate(
    "access token expires in future",
    accessExpiredAtDate > now,
  );
  // Access token expiration should be within reasonable timeframe (15-60 minutes from now)
  const accessExpiryMinutes =
    (accessExpiredAtDate.getTime() - now.getTime()) / (1000 * 60);
  TestValidator.predicate(
    "access token expires within 15-60 minutes",
    accessExpiryMinutes >= 15 && accessExpiryMinutes <= 60,
  );
  // Refreshable until should be after access expiration
  TestValidator.predicate(
    "refreshable until after access expiration",
    refreshableUntilDate > accessExpiredAtDate,
  );
  // Refreshable until should be a reasonable duration (e.g., 7-30 days from now)
  const refreshableDays =
    (refreshableUntilDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "refreshable until within 7-30 days",
    refreshableDays >= 7 && refreshableDays <= 30,
  );
  // Step 5: Verify seller identity remains unchanged
  TestValidator.equals(
    "seller ID unchanged",
    registeredSeller.id,
    refreshedSeller.id,
  );
  TestValidator.equals(
    "seller email unchanged",
    registeredSeller.email,
    refreshedSeller.email,
  );
  TestValidator.equals(
    "approval status unchanged",
    registeredSeller.approval_status,
    refreshedSeller.approval_status,
  );
  TestValidator.equals(
    "suspended status unchanged",
    registeredSeller.is_suspended,
    refreshedSeller.is_suspended,
  );
  TestValidator.equals(
    "banned status unchanged",
    registeredSeller.is_banned,
    refreshedSeller.is_banned,
  );
}
