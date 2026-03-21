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

export async function test_api_guest_session_refresh_with_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new guest identity to obtain valid tokens
  const guestSession = await authorize_guest_join(connection, {});
  typia.assert(guestSession);
  TestValidator.equals("guest id exists", !!guestSession.id, true);
  TestValidator.equals(
    "access token exists",
    !!guestSession.token.access,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    !!guestSession.token.refresh,
    true,
  );
  // Step 2: Create a new connection and attempt to refresh with an expired/invalid refresh token
  const expiredConnection: api.IConnection = { host: connection.host };
  // Step 3: Validate that expired refresh token is rejected with error status
  // The server should return 401 Unauthorized for expired/invalid refresh tokens
  await TestValidator.httpError(
    "should reject expired refresh token",
    [401],
    async () => {
      await authorize_guest_refresh(expiredConnection, {
        body: {
          refreshToken: "invalid-expired-refresh-token-xyz",
        },
      });
    },
  );
}
