import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session first (using connection isolation pattern)
  const guestConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    device_fingerprint: RandomGenerator.alphaNumeric(32),
    ip_address: `${RandomGenerator.pick([192, 10, 172])}.${RandomGenerator.pick([168, 0, 1])}.${RandomGenerator.pick([1, 254])}.${RandomGenerator.pick([1, 254])}`,
  } satisfies IDiscussionBoardGuest.IJoin;
  const initialSession = await authorize_guest_join(guestConnection, {
    body: joinInput,
  });
  typia.assert(initialSession);
  // 2. Extract current session token for refresh request
  const currentSessionToken = initialSession.token.access;
  const refreshTokenPayload = {
    session_token: currentSessionToken,
  } satisfies IDiscussionBoardGuest.IRefresh;
  // 3. Create fresh guest connection for refresh operation (connection isolation)
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedSession = await authorize_guest_refresh(refreshConnection, {
    body: refreshTokenPayload,
  });
  typia.assert(refreshedSession);
  // 4. Validate session refresh results
  // Verify new session token is different from original
  TestValidator.notEquals(
    "new session token differs from original",
    refreshedSession.token.access,
    currentSessionToken,
  );
  // Verify guest identity is preserved
  TestValidator.equals(
    "guest ID preserved",
    refreshedSession.id,
    initialSession.id,
  );
  TestValidator.equals(
    "IP address preserved",
    refreshedSession.ip_address,
    initialSession.ip_address,
  );
  TestValidator.equals(
    "device fingerprint preserved",
    refreshedSession.device_fingerprint,
    initialSession.device_fingerprint,
  );
  // Verify timestamps are updated (refreshed_at should be after initial created_at)
  TestValidator.predicate(
    "updated_at refreshed",
    new Date(refreshedSession.updated_at).getTime() >=
      new Date(initialSession.created_at).getTime(),
  );
  // Verify expiration time is extended
  TestValidator.predicate(
    "expiration time extended",
    new Date(refreshedSession.expires_at).getTime() >
      new Date(initialSession.expires_at).getTime(),
  );
}
