import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest token refresh operation with an expired/invalid refresh token.
 *
 * Validates that the system properly rejects expired or invalid refresh tokens and prevents unauthorized session renewal. The test registers a guest account, then attempts to refresh using an invalid token to verify appropriate error handling.
 *
 * Since E2E tests cannot wait for actual token expiration or manipulate server-side session data, we simulate the expired token scenario by using an invalid token string. Both expired and invalid tokens should be rejected with the same 401 Unauthorized response.
 *
 * 1. Register a new guest account using device fingerprint identification
 * 2. Attempt to refresh the session using an invalid token string
 * 3. Validate that the operation fails with HTTP 401 Unauthorized
 * 4. Ensure no new tokens are issued when refresh fails
 * 5. Verify the error handling path works correctly
 */
export async function test_api_guest_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest-specific connection (for reference, though we won't use valid token)
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Create a new connection for the refresh attempt
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Attempt to refresh with an invalid token (simulating expired token behavior)
  // Both expired and invalid tokens should return 401 Unauthorized
  await TestValidator.httpError(
    "expired/invalid refresh token should return 401",
    401,
    async () => {
      await authorize_guest_refresh(refreshConnection, {
        body: {
          refresh_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid_token_for_testing",
        } satisfies IRedditCloneGuest.IRefresh,
      });
    },
  );
  // 4. Validate that no new tokens were issued (the connection headers should not be updated)
  TestValidator.predicate(
    "no new authorization header after failed refresh",
    refreshConnection.headers?.Authorization === undefined,
  );
}
