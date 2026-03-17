import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new guest-specific connection and join as a guest
  const guestConnection: api.IConnection = { host: connection.host };
  const deviceToken = RandomGenerator.alphaNumeric(32);
  const joinResult = await authorize_guest_join(guestConnection, {
    body: {
      token: deviceToken,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // Store original values for comparison
  const originalAccessToken = joinResult.token.access;
  const originalRefreshToken = joinResult.token.refresh;
  const originalGuestId = joinResult.id;
  const originalGuestToken = joinResult.guest.token;
  const originalCreatedAt = joinResult.created_at;
  // Step 2: Perform the token refresh using a new connection (no Authorization header needed)
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_guest_refresh(refreshConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IShoppingMallGuest.IRefresh,
  });
  typia.assert(refreshResult);
  // Step 3: Validate - new access token differs from original (new JWT issued)
  TestValidator.notEquals(
    "access token rotated",
    refreshResult.token.access,
    originalAccessToken,
  );
  // Validate - new refresh token differs from original (token rotation enforced)
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResult.token.refresh,
    originalRefreshToken,
  );
  // Validate - expired_at is a future timestamp
  const now = new Date().toISOString();
  TestValidator.predicate(
    "token.expired_at is in the future",
    refreshResult.token.expired_at > now,
  );
  // Validate - refreshable_until is a future timestamp
  TestValidator.predicate(
    "token.refreshable_until is in the future",
    refreshResult.token.refreshable_until > now,
  );
  // Step 4: Business rule - guest identity preserved
  TestValidator.equals("guest id preserved", refreshResult.id, originalGuestId);
  // Validate - device fingerprint token is unchanged
  TestValidator.equals(
    "guest device token unchanged",
    refreshResult.guest.token,
    originalGuestToken,
  );
  // Validate - guest sessions array is non-empty (new session created)
  TestValidator.predicate(
    "sessions array non-empty",
    refreshResult.guest.sessions.length > 0,
  );
  // Validate - guest created_at matches original join timestamp
  TestValidator.equals(
    "guest created_at unchanged",
    refreshResult.created_at,
    originalCreatedAt,
  );
}
