import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

/**
 * Test that guest session refresh maintains session continuity and preserves
 * browsing context across multiple refresh operations. Validate that refreshed
 * sessions retain the same guest identity and do not disrupt ongoing anonymous
 * platform exploration.
 */
export async function test_api_guest_session_refresh_session_continuity(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session
  const initialGuest = await api.functional.auth.guest.join(connection, {
    body: {} satisfies ICommunityPlatformGuest.ICreate,
  });
  typia.assert(initialGuest);

  // Step 2: Perform first refresh operation
  const firstRefresh = await api.functional.auth.guest.refresh(connection, {
    body: {
      session_token: initialGuest.session_token,
    } satisfies ICommunityPlatformGuest.IRefresh,
  });
  typia.assert(firstRefresh);

  // Validate session continuity after first refresh
  TestValidator.equals(
    "session token should remain identical after first refresh",
    firstRefresh.session_token,
    initialGuest.session_token,
  );
  TestValidator.equals(
    "guest ID should remain identical after first refresh",
    firstRefresh.id,
    initialGuest.id,
  );
  TestValidator.equals(
    "created_at timestamp should remain constant",
    firstRefresh.created_at,
    initialGuest.created_at,
  );
  TestValidator.notEquals(
    "updated_at timestamp should advance after first refresh",
    firstRefresh.updated_at,
    initialGuest.updated_at,
  );
  TestValidator.notEquals(
    "access token should be rotated after first refresh",
    firstRefresh.token.access,
    initialGuest.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated after first refresh",
    firstRefresh.token.refresh,
    initialGuest.token.refresh,
  );

  // Step 3: Perform second refresh operation
  const secondRefresh = await api.functional.auth.guest.refresh(connection, {
    body: {
      session_token: firstRefresh.session_token,
    } satisfies ICommunityPlatformGuest.IRefresh,
  });
  typia.assert(secondRefresh);

  // Validate session continuity after second refresh
  TestValidator.equals(
    "session token should remain identical after second refresh",
    secondRefresh.session_token,
    initialGuest.session_token,
  );
  TestValidator.equals(
    "guest ID should remain identical after second refresh",
    secondRefresh.id,
    initialGuest.id,
  );
  TestValidator.equals(
    "created_at timestamp should remain constant through multiple refreshes",
    secondRefresh.created_at,
    initialGuest.created_at,
  );
  TestValidator.notEquals(
    "updated_at timestamp should advance after second refresh",
    secondRefresh.updated_at,
    firstRefresh.updated_at,
  );
  TestValidator.notEquals(
    "access token should be rotated after second refresh",
    secondRefresh.token.access,
    firstRefresh.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated after second refresh",
    secondRefresh.token.refresh,
    firstRefresh.token.refresh,
  );

  // Validate token expiration progression
  TestValidator.predicate(
    "token expiration should advance with each refresh",
    new Date(secondRefresh.token.expired_at) >
      new Date(firstRefresh.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable until should advance with each refresh",
    new Date(secondRefresh.token.refreshable_until) >
      new Date(firstRefresh.token.refreshable_until),
  );

  // Additional validation for session integrity
  TestValidator.predicate(
    "deleted_at should remain undefined throughout session lifecycle",
    initialGuest.deleted_at === undefined &&
      firstRefresh.deleted_at === undefined &&
      secondRefresh.deleted_at === undefined,
  );
}
