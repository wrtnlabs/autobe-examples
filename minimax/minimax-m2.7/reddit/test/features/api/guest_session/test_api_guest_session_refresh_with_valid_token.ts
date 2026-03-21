import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial guest session to obtain valid tokens
  const initialSession = await authorize_guest_join(connection, {});
  // Step 2: Refresh the guest session using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedSession = await authorize_guest_refresh(refreshConnection, {
    body: {
      refreshToken: initialSession.token.refresh,
    } satisfies IRedditCloneGuestSession.IRefresh,
  });
  // Step 3: Validate the refreshed session contains new tokens
  typia.assert(refreshedSession);
  // Step 4: Verify token rotation - new access token should be different from original
  TestValidator.notEquals(
    "new access token differs from original",
    refreshedSession.token.access,
    initialSession.token.access,
  );
  // Step 5: Verify token rotation - new refresh token should be different from original
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshedSession.token.refresh,
    initialSession.token.refresh,
  );
  // Step 6: Validate expiration timestamps are properly set
  TestValidator.predicate(
    "new access token has expiration",
    refreshedSession.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "new refresh token has refreshable_until",
    refreshedSession.token.refreshable_until.length > 0,
  );
  // Step 7: Verify guest session ID remains the same (same guest identity)
  TestValidator.equals(
    "guest session ID preserved after refresh",
    refreshedSession.id,
    initialSession.id,
  );
}
