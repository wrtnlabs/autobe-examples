import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest token refresh with invalid/expired refresh token.
 *
 * 1. Register guest account to obtain initial tokens
 * 2. Test that valid token refresh works correctly
 * 3. Test that invalid (non-existent) token returns 401 Unauthorized
 * 4. Validate token rotation on successful refresh
 * 5. Verify security boundary: invalid tokens cannot be used
 */
export async function test_api_guest_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest to obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      ip_address: typia.random<string & tags.Format<"ipv4">>(),
      user_agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(initialAuth);
  // 2. Test that valid token refresh works correctly
  const guestConnection2: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(guestConnection2, {
    body: {
      refresh_token: initialAuth.token.refresh,
    } satisfies IRedditCloneGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Validate token rotation on successful refresh
  TestValidator.notEquals(
    "access token should be rotated",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
  // 4. Validate that guest ID remains the same
  TestValidator.equals(
    "guest ID should remain consistent",
    initialAuth.id,
    refreshedAuth.id,
  );
  // 5. Test that invalid (non-existent) token returns 401 Unauthorized
  // This simulates the security boundary where expired/invalid tokens are rejected
  const invalidToken = "invalid_refresh_token_that_does_not_exist";
  await TestValidator.httpError(
    "invalid refresh token should return 401",
    401,
    async () => {
      const guestConnection3: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(guestConnection3, {
        body: {
          refresh_token: invalidToken,
        } satisfies IRedditCloneGuest.IRefresh,
      });
    },
  );
  // 6. Test that already-used (rotated) token cannot be reused
  // The initial refresh token should be invalid after rotation
  await TestValidator.httpError(
    "rotated refresh token should return 401",
    401,
    async () => {
      const guestConnection4: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(guestConnection4, {
        body: {
          refresh_token: initialAuth.token.refresh,
        } satisfies IRedditCloneGuest.IRefresh,
      });
    },
  );
}
