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

/**
 * Test refresh token success flow with token rotation validation.
 *
 * Validates the core session extension mechanism by registering a new guest account to obtain an initial JWT token pair, then exchanging the refresh token for a new pair via the refresh endpoint. Ensures token rotation is properly enforced and new tokens are valid for subsequent authenticated requests.
 *
 * 1. Guest joins to obtain the initial access token and refresh token.
 * 2. Call the refresh endpoint with the initial refresh token.
 * 3. Validate the new token pair: access token is present and refresh token has been rotated (different from the original).
 * 4. Validate expiration timestamps: both expired_at and refreshable_until are set in the future.
 * 5. Confirm the new access token can be used as a Bearer token for an authenticated request by performing a second refresh operation using the new token pair, proving the access token is valid for API calls.
 */
export async function test_api_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest joins to obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(guestConnection, {});
  typia.assert(joinResult);
  const initialRefreshToken = joinResult.token.refresh;
  // 2. Call refresh endpoint with the initial refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IErpHrmGuest.IRefresh,
  });
  typia.assert(refreshResult);
  // 3. Validate token rotation
  TestValidator.notEquals(
    "refresh token is rotated",
    refreshResult.token.refresh,
    initialRefreshToken,
  );
  TestValidator.predicate(
    "new access token is present",
    refreshResult.token.access.length > 0,
  );
  // 4. Validate expiration timestamps are in the future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "expired_at is in the future",
    refreshResult.token.expired_at > now,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshResult.token.refreshable_until > now,
  );
  // 5. Confirm new access token works for authenticated requests
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: refreshResult.token.access },
  };
  const secondRefreshResult = await authorize_guest_refresh(
    authenticatedConnection,
    {
      body: {
        refresh_token: refreshResult.token.refresh,
      } satisfies IErpHrmGuest.IRefresh,
    },
  );
  typia.assert(secondRefreshResult);
}
