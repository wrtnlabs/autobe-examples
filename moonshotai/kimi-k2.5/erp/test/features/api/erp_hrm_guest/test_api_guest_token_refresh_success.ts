import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Initialize guest session to obtain valid refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmGuest.IJoin,
  });
  typia.assert(initialAuth);
  // Store original tokens for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  const originalExpiredAt = initialAuth.token.expired_at;
  const originalRefreshableUntil = initialAuth.token.refreshable_until;
  // 2. Call refresh endpoint with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IErpHrmGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Verify new tokens are different from original
  TestValidator.notEquals(
    "access token should be different after refresh",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );
  // 4. Verify guest ID remains the same
  TestValidator.equals(
    "guest ID should remain the same after refresh",
    refreshedAuth.id,
    initialAuth.id,
  );
  // 5. Verify expiration timestamps are in the future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "access token expiration should be in the future",
    refreshedAuth.token.expired_at > now,
  );
  TestValidator.predicate(
    "refresh token expiration should be in the future",
    refreshedAuth.token.refreshable_until > now,
  );
  // 6. Verify new expiration is different from original (tokens were regenerated)
  TestValidator.notEquals(
    "access token expiration should be different",
    refreshedAuth.token.expired_at,
    originalExpiredAt,
  );
  TestValidator.notEquals(
    "refresh token expiration should be different",
    refreshedAuth.token.refreshable_until,
    originalRefreshableUntil,
  );
}
