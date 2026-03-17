import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // Step 1: Create initial guest session to obtain refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const originalAuth = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallGuest.IJoin,
  });
  typia.assert(originalAuth);
  // Capture original tokens for comparison
  const originalAccessToken = originalAuth.token.access;
  const originalRefreshToken = originalAuth.token.refresh;
  // Step 2: Refresh the session using the captured refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IEcommerceMallGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 3: Validate guest identity is preserved
  TestValidator.equals(
    "guest id unchanged after refresh",
    refreshedAuth.id,
    originalAuth.id,
  );
  // Step 4: Verify new tokens are different from original (token rotation)
  TestValidator.notEquals(
    "access token should be new",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should be new",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );
  // Step 5: Verify expiration timestamps are in the future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "access token expired_at is in future",
    refreshedAuth.token.expired_at > now,
  );
  TestValidator.predicate(
    "refresh token refreshable_until is in future",
    refreshedAuth.token.refreshable_until > now,
  );
}
