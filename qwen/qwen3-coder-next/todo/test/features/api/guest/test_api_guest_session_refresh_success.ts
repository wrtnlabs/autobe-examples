import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
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
  // 1. Create initial guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestDeviceId = typia.random<string & tags.Format<"uuid">>();
  const joinResponse = await authorize_guest_join(guestConnection, {
    body: {
      device_id: guestDeviceId,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      user_agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(joinResponse);
  const initialToken = joinResponse.token;
  // 2. Verify initial token is valid
  TestValidator.predicate(
    "initial access token is valid",
    initialToken.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token is valid",
    initialToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "initial token has expiration",
    initialToken.expired_at.length > 0,
  );
  // 3. Perform guest session refresh
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_guest_refresh(refreshConnection, {
    body: {
      device_id: guestDeviceId,
    } satisfies ITodoAppGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  const refreshedToken = refreshResponse.token;
  // 4. Verify refreshed tokens are issued
  TestValidator.predicate(
    "new access token is issued",
    refreshedToken.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is issued",
    refreshedToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "new token has expiration",
    refreshedToken.expired_at.length > 0,
  );
  // 5. Verify tokens are different from initial tokens (token rotation)
  TestValidator.notEquals(
    "access token changed",
    initialToken.access,
    refreshedToken.access,
  );
  TestValidator.notEquals(
    "refresh token changed",
    initialToken.refresh,
    refreshedToken.refresh,
  );
  // 6. Verify new expiration is later than initial (renewed time)
  const initialExpired = new Date(initialToken.expired_at).getTime();
  const refreshedExpired = new Date(refreshedToken.expired_at).getTime();
  TestValidator.predicate(
    "token expiration renewed",
    refreshedExpired > initialExpired,
  );
}
