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
 * Test refresh token reuse detection and replay attack prevention.
 *
 * Validates the single-use nature of refresh tokens through a token rotation
 * replay scenario. The test first obtains an initial refresh token (R1) via
 * guest registration, then consumes it through a successful refresh that issues
 * a new token (R2). Finally, it replays the already-consumed R1 and asserts
 * that the server rejects the replay with 401 Unauthorized.
 *
 * 1. Register a guest account to obtain the initial refresh token R1.
 * 2. Refresh using R1 — succeeds and returns a rotated refresh token R2.
 * 3. Verify R2 differs from R1, confirming token rotation occurred.
 * 4. Replay R1 — the server must detect the rotated token and return 401.
 */
export async function test_api_refresh_token_reuse_detection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as guest to obtain initial refresh token R1
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {});
  typia.assert(initialAuth);
  const r1: string = initialAuth.token.refresh;
  // 2. Refresh with R1 — succeeds and issues rotated token R2
  const refreshConnection1: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection1, {
    body: { refresh_token: r1 } satisfies IErpHrmGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  TestValidator.notEquals(
    "R2 must differ from R1 after rotation",
    refreshedAuth.token.refresh,
    r1,
  );
  // 3. Replay R1 — server must detect rotated token and return 401
  const refreshConnection2: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "reuse of rotated refresh token is rejected with 401",
    401,
    async () => {
      await authorize_guest_refresh(refreshConnection2, {
        body: { refresh_token: r1 } satisfies IErpHrmGuest.IRefresh,
      });
    },
  );
}
