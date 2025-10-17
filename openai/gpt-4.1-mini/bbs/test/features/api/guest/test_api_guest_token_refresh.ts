import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function test_api_guest_token_refresh(
  connection: api.IConnection,
) {
  // 1. Create a new guest session using joinGuest to get authorized tokens
  const createBody = {
    session_token: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardGuest.ICreate;
  const authorized: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join.joinGuest(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2. Prepare refresh request using the refresh token data from the authorized token
  const token = authorized.token;
  const refreshBody = {
    refresh_token: token.refresh,
    token_type: "guest_refresh",
    version: 1,
    signature: RandomGenerator.alphaNumeric(32),
    fingerprint: RandomGenerator.alphaNumeric(16),
    expire: new Date(Date.now() + 3600 * 1000).toISOString(),
    issued_at: new Date().toISOString(),
  } satisfies IDiscussionBoardGuest.IRefresh;

  // 3. Call refreshGuest to renew tokens
  const refreshed: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh.refreshGuest(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 4. Validate that the authorized guest ID remains the same
  TestValidator.equals(
    "guest session ID should remain the same",
    refreshed.id,
    authorized.id,
  );

  // 5. Validate that new tokens are different from the original tokens
  TestValidator.notEquals(
    "access token should be refreshed",
    refreshed.token.access,
    authorized.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be refreshed",
    refreshed.token.refresh,
    authorized.token.refresh,
  );

  // 6. Validate expiration timestamps of refreshed tokens are in the future
  TestValidator.predicate(
    "refreshed access expired_at should be in the future",
    new Date(refreshed.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshed refresh refreshable_until should be in the future",
    new Date(refreshed.token.refreshable_until).getTime() > Date.now(),
  );
}
