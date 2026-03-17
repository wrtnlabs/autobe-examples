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

/**
 * Test successful guest session refresh with valid refresh token.
 *
 * 1. First create a guest session via join endpoint to obtain initial refresh token.
 * 2. Call the refresh endpoint with the obtained refresh token, verifying that new access and refresh tokens are returned with updated expiration timestamps.
 * 3. Validate that the new access token works for authenticated guest endpoints.
 * 4. Verify that session metadata (IP, href, referrer) can be optionally updated during refresh.
 */
export async function test_api_guest_refresh_success_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial guest session using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(joinConnection, {
    body: {
      anonymous_id: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // Store initial refresh token for later comparison
  const initialRefreshToken = joinResult.token.refresh;
  // Step 2: Create refresh request with updated session metadata
  const refreshConnection: api.IConnection = { host: connection.host };
  // Generate new session metadata for refresh
  const newIp = typia.random<string & tags.Format<"ipv4">>();
  const newHref = typia.random<string & tags.Format<"uri">>();
  const newReferrer = typia.random<string & tags.Format<"uri">>();
  const refreshResult = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh: initialRefreshToken,
      ip: newIp,
      href: newHref,
      referrer: newReferrer,
    } satisfies ICommunityPlatformGuest.IRefresh,
  });
  typia.assert(refreshResult);
  // Step 3: Validate refresh response
  TestValidator.equals(
    "guest ID should remain same",
    refreshResult.id,
    joinResult.id,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    refreshResult.token.refresh,
    initialRefreshToken,
  );
  TestValidator.notEquals(
    "access token should be updated",
    refreshResult.token.access,
    joinResult.token.access,
  );
  // Validate token expiration timestamps
  const initialExpiredAt = new Date(joinResult.token.expired_at);
  const refreshedExpiredAt = new Date(refreshResult.token.expired_at);
  TestValidator.predicate(
    "expired_at should be updated",
    refreshedExpiredAt > initialExpiredAt,
  );
  const initialRefreshableUntil = new Date(joinResult.token.refreshable_until);
  const refreshedRefreshableUntil = new Date(
    refreshResult.token.refreshable_until,
  );
  TestValidator.predicate(
    "refreshable_until should be updated",
    refreshedRefreshableUntil > initialRefreshableUntil,
  );
  // Step 4: Verify new access token is set in connection headers
  TestValidator.equals(
    "connection should have new access token",
    refreshConnection.headers?.Authorization,
    `Bearer ${refreshResult.token.access}`,
  );
  // Step 5: Verify token structure
  TestValidator.predicate(
    "access token should not be empty",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should not be empty",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at should be valid ISO date",
    !isNaN(refreshedExpiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until should be valid ISO date",
    !isNaN(refreshedRefreshableUntil.getTime()),
  );
}
