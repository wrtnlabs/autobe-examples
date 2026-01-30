import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_token_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial guest session to obtain refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {});
  typia.assert(initialAuth);
  // Step 2: Refresh tokens using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      refreshToken: initialAuth.token.refresh,
    } satisfies ITodoAppGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 3: Verify token rotation - new tokens should be different from old ones
  TestValidator.notEquals(
    "access token should be rotated",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );
  // Step 4: Verify guest ID remains consistent
  TestValidator.equals(
    "guest ID should remain the same",
    refreshedAuth.id,
    initialAuth.id,
  );
  // Step 5: Verify expiration timestamps are present
  TestValidator.predicate(
    "access token expiration timestamp should be present",
    refreshedAuth.token.expired_at !== null &&
      refreshedAuth.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refresh token expiration timestamp should be present",
    refreshedAuth.token.refreshable_until !== null &&
      refreshedAuth.token.refreshable_until !== undefined,
  );
}
