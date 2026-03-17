import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest token refresh workflow.
 *
 * 1. Create initial guest session using POST /ecommerceMall/auth/guest/join
 * 2. Capture the refresh_token from the initial session
 * 3. Call POST /ecommerceMall/auth/guest/refresh with the refresh_token
 * 4. Validate the response returns IEcommerceMallGuest.IAuthorized structure
 * 5. Verify new tokens are different from original tokens
 * 6. Verify expiration timestamps are in the future
 * 7. Verify original refresh_token is invalidated and cannot be reused
 */
export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial guest session to obtain refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const initialSession = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(initialSession);
  const originalAccessToken = initialSession.token.access;
  const originalRefreshToken = initialSession.token.refresh;
  // Step 2: Call refresh endpoint with the captured refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedSession = await authorize_guest_refresh(refreshConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IEcommerceMallGuest.IRefresh,
  });
  typia.assert(refreshedSession);
  // Step 3: Verify response structure (typia.assert validates IEcommerceMallGuest.IAuthorized)
  // Validates: id (UUID), createdAt/updatedAt (date-time), deletedAt (null), sessions array, token object
  // Step 4: Verify new tokens are different from original ones
  TestValidator.notEquals(
    "access token is refreshed",
    refreshedSession.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token is refreshed",
    refreshedSession.token.refresh,
    originalRefreshToken,
  );
  // Step 5: Verify token expiration timestamps are in the future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "access token expiration is in the future",
    refreshedSession.token.expired_at > now,
  );
  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshedSession.token.refreshable_until > now,
  );
  // Step 6: Verify original refresh token is invalidated (cannot be used again)
  await TestValidator.error(
    "original refresh token should be invalidated",
    async () => {
      const invalidConnection: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(invalidConnection, {
        body: {
          refreshToken: originalRefreshToken,
        } satisfies IEcommerceMallGuest.IRefresh,
      });
    },
  );
}
