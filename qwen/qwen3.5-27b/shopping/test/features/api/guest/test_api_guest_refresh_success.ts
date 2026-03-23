import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session refresh success path.
 * 1. Create initial guest session to obtain valid refresh token
 * 2. Use refresh token to call refresh endpoint
 * 3. Validate new tokens and expiration timestamps are returned
 */
export async function test_api_guest_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Extract refresh token from join response
  const refreshToken = joinResult.token.refresh;
  // 3. Create new guest connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Call refresh endpoint with refresh token
  const refreshResult = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallGuest.IRefresh,
  });
  typia.assert(refreshResult);
  // 5. Validate response structure
  TestValidator.equals("guest id preserved", refreshResult.id, joinResult.id);
  TestValidator.equals(
    "device fingerprint preserved",
    refreshResult.device_fingerprint,
    joinResult.device_fingerprint,
  );
  // 6. Validate new tokens are issued
  TestValidator.notEquals(
    "new access token issued",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token issued",
    refreshResult.token.refresh,
    joinResult.token.refresh,
  );
  // 7. Validate expiration timestamps are updated
  TestValidator.notEquals(
    "access token expiration updated",
    refreshResult.token.expired_at,
    joinResult.token.expired_at,
  );
  TestValidator.predicate("refreshable_until is valid date-time", () => {
    const date = new Date(refreshResult.token.refreshable_until);
    return !isNaN(date.getTime());
  });
}
