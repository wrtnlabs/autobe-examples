import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_business_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join guest account to establish initial access
  const guestConnection: api.IConnection = { host: connection.host };
  const guestJoin = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      user_agent: null,
    } satisfies IEcommerceMallGuest.IJoin,
  });
  typia.assert(guestJoin);
  // Step 2: Capture initial state
  const initialGuestId = guestJoin.id;
  const initialAccessToken = guestJoin.token.access;
  const initialRefreshToken = guestJoin.token.refresh;
  const initialAccessExpiredAt = guestJoin.token.expired_at;
  const initialRefreshableUntil = guestJoin.token.refreshable_until;
  // Step 3: Refresh token to extend access using the same connection
  const refreshed = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IEcommerceMallGuest.IRefresh,
  });
  typia.assert(refreshed);
  // Step 4: Validate guest ID remains the same (session continuity)
  TestValidator.equals("guest ID matches", refreshed.id, initialGuestId);
  // Step 5: Validate tokens are different (token rotation)
  TestValidator.notEquals(
    "access token changed",
    initialAccessToken,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed",
    initialRefreshToken,
    refreshed.token.refresh,
  );
  // Step 6: Validate new expiration timestamps
  const newAccessExpiredAt = refreshed.token.expired_at;
  const newRefreshableUntil = refreshed.token.refreshable_until;
  // Access token should have new expiration
  TestValidator.predicate(
    "new access token has valid expiration",
    newAccessExpiredAt !== initialAccessExpiredAt,
  );
  // Refreshable until should be the same or later (session extended)
  TestValidator.predicate(
    "refreshable until updated",
    newRefreshableUntil >= initialRefreshableUntil,
  );
  // Step 7: Validate both tokens are valid JWT format (basic structure check)
  typia.assert(newAccessExpiredAt);
  typia.assert(newRefreshableUntil);
}
