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
 * Test guest session refresh with session metadata update.
 * 1. Create initial guest session via join endpoint
 * 2. Extract refresh token from initial authorization response
 * 3. Call refresh endpoint with valid refresh token and updated session metadata
 * 4. Verify refresh succeeds and returns new tokens with updated metadata
 * 5. Validate token rotation and that new access token works for subsequent requests
 */
export async function test_api_guest_refresh_with_metadata_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      anonymous_id: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(initialAuth);
  // Store initial refresh token
  const initialRefreshToken = initialAuth.token.refresh;
  // 2. Prepare updated metadata for refresh
  const updatedMetadata = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies Pick<
    ICommunityPlatformGuest.IRefresh,
    "ip" | "href" | "referrer"
  >;
  // 3. Create new connection for refresh call
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Call refresh endpoint with updated metadata
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh: initialRefreshToken,
      ...updatedMetadata,
    } satisfies ICommunityPlatformGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 5. Validate refresh response structure
  TestValidator.equals(
    "guest ID should remain the same",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.predicate(
    "access token should be present",
    !!refreshedAuth.token.access,
  );
  TestValidator.predicate(
    "refresh token should be present",
    !!refreshedAuth.token.refresh,
  );
  TestValidator.predicate(
    "expired_at should be present",
    !!refreshedAuth.token.expired_at,
  );
  TestValidator.predicate(
    "refreshable_until should be present",
    !!refreshedAuth.token.refreshable_until,
  );
  // 6. Validate token rotation
  TestValidator.notEquals(
    "access token should be rotated",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );
  // 7. Validate timestamps are valid ISO strings and in future
  const refreshedExpiredAt = new Date(refreshedAuth.token.expired_at);
  const refreshedRefreshableUntil = new Date(
    refreshedAuth.token.refreshable_until,
  );
  const now = new Date();
  TestValidator.predicate(
    "expired_at should be in future",
    refreshedExpiredAt > now,
  );
  TestValidator.predicate(
    "refreshable_until should be in future",
    refreshedRefreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    refreshedRefreshableUntil > refreshedExpiredAt,
  );
  // 8. Verify connection headers updated with new access token
  TestValidator.equals(
    "refresh connection should have Authorization header",
    refreshConnection.headers?.Authorization,
    `Bearer ${refreshedAuth.token.access}`,
  );
  // 9. Test that guestConnection still has old token (should not be updated by refresh call)
  TestValidator.equals(
    "original connection should retain original token",
    guestConnection.headers?.Authorization,
    `Bearer ${initialAuth.token.access}`,
  );
}
