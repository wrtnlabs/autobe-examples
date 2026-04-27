import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test token reuse detection for guest sessions.
 *
 * Validates the security feature where a previously rotated (already consumed) refresh token triggers invalidation of all active sessions for that guest. This prevents token theft by ensuring stolen tokens cannot be reused after a legitimate rotation.
 *
 * 1. Registers a guest with a known device identifier to obtain TokenSet A.
 * 2. Refreshes the session using TokenSet A's refresh token to get TokenSet B, which rotates the token.
 * 3. Attempts to reuse TokenSet A's already-rotated refresh token -> expects HTTP 401.
 * 4. Attempts to use TokenSet B's refresh token after the reuse trigger -> expects HTTP 401, confirming all sessions were invalidated.
 * 5. Registers a fresh session with the same device identifier to confirm the device fingerprint is not permanently locked.
 */
export async function test_api_guest_session_token_reuse_detection(
  connection: api.IConnection,
): Promise<void> {
  // Generate stable identifiers for the test
  const deviceId = RandomGenerator.alphaNumeric(32);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Step 1: Register a guest to obtain TokenSet A
  const joinConnectionA: api.IConnection = { host: connection.host };
  const tokenA = await authorize_guest_join(joinConnectionA, {
    body: {
      device_identifier: deviceId,
      href,
      referrer,
    } satisfies Partial<IECommerceMallGuest.IJoin>,
  });
  typia.assert(tokenA);
  const refreshTokenA: string = tokenA.token.refresh;
  // Step 2: Refresh the session to obtain TokenSet B
  const refreshConnection: api.IConnection = { host: connection.host };
  const tokenB = await authorize_guest_refresh(refreshConnection, {
    body: {
      refreshToken: refreshTokenA,
      href,
      referrer,
    } satisfies IECommerceMallGuest.IRefresh,
  });
  typia.assert(tokenB);
  const refreshTokenB: string = tokenB.token.refresh;
  // Step 3: Reuse TokenSet A's rotated refresh token -> expect 401
  const reuseConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "reuse of rotated refresh token",
    401,
    async () => {
      await authorize_guest_refresh(reuseConnection, {
        body: {
          refreshToken: refreshTokenA,
          href,
          referrer,
        } satisfies IECommerceMallGuest.IRefresh,
      });
    },
  );
  // Step 4: TokenSet B's token should also be invalidated -> expect 401
  const invalidatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "all guest sessions invalidated on token reuse",
    401,
    async () => {
      await authorize_guest_refresh(invalidatedConnection, {
        body: {
          refreshToken: refreshTokenB,
          href,
          referrer,
        } satisfies IECommerceMallGuest.IRefresh,
      });
    },
  );
  // Step 5: Device can still register a fresh session
  const freshJoinConnection: api.IConnection = { host: connection.host };
  const freshToken = await authorize_guest_join(freshJoinConnection, {
    body: {
      device_identifier: deviceId,
      href,
      referrer,
    } satisfies Partial<IECommerceMallGuest.IJoin>,
  });
  typia.assert(freshToken);
}
