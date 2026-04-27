import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // Guest authentication E2E test: join, refresh, identity preservation on rejoin,
  // and invalid token rejection.
  //
  // 1. Guest joins with a unique device fingerprint, establishes session.
  // 2. Guest refreshes session tokens successfully.
  // 3. Guest rejoins with the same device fingerprint, retrieves same identity.
  // 4. Guest attempts refresh with an invalid token, receives 401 Unauthorized.
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // Step 1: Guest joins with a device fingerprint
  const guestConnection: api.IConnection = { host: connection.host };
  const firstAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
    },
  });
  typia.assert(firstAuth);
  const guestId = firstAuth.id;
  const refreshToken = firstAuth.token.refresh;
  // Step 2: Refresh the guest session - should succeed
  const refreshedAuth = await authorize_guest_refresh(guestConnection, {
    body: { refresh: refreshToken } satisfies {
      refresh: string;
    },
  });
  typia.assert(refreshedAuth);
  // Step 3: Rejoin with same device fingerprint - should return same guest id
  const rejoinConnection: api.IConnection = { host: connection.host };
  const rejoinAuth = await authorize_guest_join(rejoinConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
    },
  });
  typia.assert(rejoinAuth);
  TestValidator.equals(
    "guest id preserved after rejoin",
    rejoinAuth.id,
    guestId,
  );
  // Step 4: Refresh with invalid token should return 401 Unauthorized
  await TestValidator.httpError(
    "refresh with invalid token returns 401",
    401,
    async () => {
      const badConnection: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(badConnection, {
        body: {
          refresh: "this-is-an-invalid-token-that-should-be-rejected",
        } satisfies {
          refresh: string;
        },
      });
    },
  );
}
