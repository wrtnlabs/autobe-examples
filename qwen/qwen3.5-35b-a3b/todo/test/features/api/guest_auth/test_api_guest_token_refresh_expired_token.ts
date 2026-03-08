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

export async function test_api_guest_token_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new guest account to obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(joinConnection, {
    body: typia.random<ITodoAppGuest.IJoin>(),
  });
  typia.assert(joinResponse);
  // 2. Attempt to refresh with a clearly invalid/expired token
  // We'll use a malformed token to simulate expiration scenario
  const expiredRefreshToken = "expired_token_123456789";
  const invalidRefreshBody = {
    refresh: expiredRefreshToken,
  } satisfies ITodoAppGuest.IRefresh;
  // 3. Create a connection for the refresh attempt
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Attempt to refresh with the expired/invalid token
  // This should fail with 401 Unauthorized
  await TestValidator.error(
    "refresh with expired token returns 401",
    async () => {
      await authorize_guest_refresh(refreshConnection, {
        body: invalidRefreshBody,
      });
    },
  );
  // 5. Validate that the client must re-register to get new tokens
  // Create a new registration to verify re-authentication works
  const rejoinConnection: api.IConnection = { host: connection.host };
  const rejoinResponse = await authorize_guest_join(rejoinConnection, {
    body: typia.random<ITodoAppGuest.IJoin>(),
  });
  typia.assert(rejoinResponse);
  // 6. Confirm that the fresh refresh token works
  const freshRefreshConnection: api.IConnection = { host: connection.host };
  const freshRefreshResponse = await authorize_guest_refresh(
    freshRefreshConnection,
    {
      body: {
        refresh: rejoinResponse.token.refresh,
      } satisfies ITodoAppGuest.IRefresh,
    },
  );
  typia.assert(freshRefreshResponse);
}
