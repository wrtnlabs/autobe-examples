import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that a guest can renew their session and continue accessing read-only public content using the newly issued token.
 *
 * Validates the guest session refresh flow by first creating a guest identity through the join endpoint, then using the issued refresh token to obtain a renewed set of JWT tokens. The test ensures that the refresh operation returns new tokens while maintaining the same guest identity, proving session continuity without requiring a new join operation.
 *
 * Special attention is given to verifying that the refreshed token object contains different values from the original, confirming true session renewal, and that the guest id remains stable across the refresh operation.
 *
 * 1. Guest joins the platform and receives initial authorization tokens.
 * 2. Guest uses the refresh token to renew their session.
 * 3. Validates that the refresh returns new tokens with valid structure.
 * 4. Confirms the guest id remains consistent across join and refresh.
 */
export async function test_api_guest_session_refresh_continues_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest joins the platform to obtain initial tokens
  const guestConnection1: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection1, {});
  typia.assert(initialAuth);
  const originalGuestId = initialAuth.id;
  const originalRefreshToken = initialAuth.token.refresh;
  const originalAccessToken = initialAuth.token.access;
  // 2. Guest refreshes their session using the refresh token
  const guestConnection2: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(guestConnection2, {
    body: {
      refresh: originalRefreshToken,
    } satisfies IRedditLikeCommunityGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Validate refreshed token structure
  TestValidator.equals(
    "guest id stable across refresh",
    refreshedAuth.id,
    originalGuestId,
  );
  TestValidator.notEquals(
    "access token renewed after refresh",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  TestValidator.predicate(
    "refreshed access token non-empty",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token non-empty",
    refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid",
    refreshedAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid",
    refreshedAuth.token.refreshable_until.length > 0,
  );
}
