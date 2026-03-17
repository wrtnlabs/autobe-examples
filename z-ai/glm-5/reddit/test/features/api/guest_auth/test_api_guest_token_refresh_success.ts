import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
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
  // Step 1: Create initial guest account to obtain refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(initialAuth);
  // Store original tokens for comparison
  const originalGuestId = initialAuth.id;
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  // Step 2: Call refresh endpoint with the refresh token
  const refreshedAuth = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies ICommunityPlatformGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 3: Verify session continuity (same guest ID)
  TestValidator.equals(
    "guest ID remains the same",
    refreshedAuth.id,
    originalGuestId,
  );
  // Step 4: Verify token rotation (new tokens are different)
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );
  // Step 5: Verify expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(refreshedAuth.token.expired_at);
  const refreshableUntil = new Date(refreshedAuth.token.refreshable_until);
  TestValidator.predicate(
    "access token expires in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refreshable until is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable until extends beyond token expiry",
    refreshableUntil > expiredAt,
  );
}
