import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the primary success path for guest token refresh.
 * 1. Register a new guest and obtain initial tokens
 * 2. Extract refresh token from authorization response
 * 3. Refresh the guest session with the refresh token
 * 4. Validate new tokens are returned with updated expiration
 * 5. Verify guest ID consistency between join and refresh
 */
export async function test_api_guest_refresh_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest and obtain initial tokens
  const guestConnection1: api.IConnection = { host: connection.host };
  const initialAuth: IHrmPlatformGuest.IAuthorized = await authorize_guest_join(
    guestConnection1,
    {},
  );
  typia.assert(initialAuth);
  // 2. Extract refresh token and guest ID
  const guestId: string = initialAuth.id;
  const refreshToken: string = initialAuth.token.refresh;
  // 3. Create new connection for refresh operation
  const guestConnection2: api.IConnection = { host: connection.host };
  // 4. Refresh the guest session
  const refreshedAuth: IHrmPlatformGuest.IAuthorized =
    await authorize_guest_refresh(guestConnection2, {
      body: {
        refresh_token: refreshToken,
      } satisfies IHrmPlatformGuest.IRefresh,
    });
  typia.assert(refreshedAuth);
  // 5. Verify guest ID consistency
  TestValidator.equals("guest ID consistent", refreshedAuth.id, guestId);
  // 6. Verify new tokens are returned
  TestValidator.predicate(
    "access token exists",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    refreshedAuth.token.refresh.length > 0,
  );
  // 7. Verify expiration timestamps are present
  TestValidator.predicate(
    "expired_at exists",
    refreshedAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    refreshedAuth.token.refreshable_until.length > 0,
  );
  // 8. Verify new refresh token is different from old one (token rotation)
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    refreshToken,
  );
}
