import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

/**
 * Validate successful JWT token rotation for an existing guest user identity.
 *
 * Business goal: Ensure that the guestUser authentication flow properly issues
 * a new pair of JWT tokens using the refresh endpoint while preserving the
 * underlying guest identity and maintaining logical lifecycle semantics.
 *
 * Steps:
 *
 * 1. Initialize a guest identity via /auth/guestUser/join.
 *
 *    - Build a minimal IShoppingMallGuestUser.IJoin body. external_reference may be
 *         omitted or filled with a random string.
 *    - Call api.functional.auth.guestUser.join and await the
 *         IShoppingMallGuestUser.IAuthorized response.
 *    - Assert the response type with typia.assert.
 * 2. Capture baseline fields from the join response.
 *
 *    - GuestId: id
 *    - OriginalToken: token (IAuthorizationToken)
 *    - OriginalAccess, originalRefresh, originalExpiredAt, originalRefreshableUntil
 *    - Lifecycle fields: created_at, updated_at, deleted_at
 * 3. Build a refresh request using IShoppingMallGuestUser.IRefresh.
 *
 *    - Body: { refresh_token: originalRefresh } satisfies
 *         IShoppingMallGuestUser.IRefresh
 * 4. Call /auth/guestUser/refresh.
 *
 *    - Use api.functional.auth.guestUser.refresh with the prepared body.
 *    - Await the IShoppingMallGuestUser.IAuthorized response.
 *    - Assert the response type with typia.assert.
 * 5. Validate identity continuity and lifecycle stability.
 *
 *    - TestValidator.equals("guest id remains stable across refresh", refreshed.id,
 *         guestId).
 *    - TestValidator.equals("created_at is stable across refresh",
 *         refreshed.created_at, createdAt).
 *    - TestValidator.equals("deleted_at remains null or unchanged after refresh",
 *         refreshed.deleted_at ?? null, originalDeletedAt ?? null).
 *    - TestValidator.predicate("updated_at does not go backwards", new
 *         Date(refreshed.updated_at).getTime() >= new
 *         Date(originalUpdatedAt).getTime()).
 * 6. Validate token rotation semantics.
 *
 *    - TestValidator.notEquals("access token is rotated", refreshed.token.access,
 *         originalAccess).
 *    - TestValidator.notEquals("refresh token is rotated", refreshed.token.refresh,
 *         originalRefresh).
 *    - TestValidator.predicate("new access token is non-empty",
 *         refreshed.token.access.length > 0).
 *    - TestValidator.predicate("new refresh token is non-empty",
 *         refreshed.token.refresh.length > 0).
 *    - TestValidator.predicate("access expiry does not decrease", new
 *         Date(refreshed.token.expired_at).getTime() >= new
 *         Date(originalExpiredAt).getTime()).
 *    - TestValidator.predicate("refreshable_until does not decrease", new
 *         Date(refreshed.token.refreshable_until).getTime() >= new
 *         Date(originalRefreshableUntil).getTime()).
 *
 * This test focuses solely on the happy path: a valid refresh token producing a
 * new, valid authorization payload for the same guest identity.
 */
export async function test_api_guestuser_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Initialize a guest identity via join
  const joinBody = {
    external_reference: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallGuestUser.IJoin;

  const joined = await api.functional.auth.guestUser.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallGuestUser.IAuthorized>(joined);

  // 2. Capture baseline fields
  const guestId = joined.id;
  const originalToken: IAuthorizationToken = joined.token;
  const originalAccess = originalToken.access;
  const originalRefresh = originalToken.refresh;
  const originalExpiredAt = originalToken.expired_at;
  const originalRefreshableUntil = originalToken.refreshable_until;
  const originalCreatedAt = joined.created_at;
  const originalUpdatedAt = joined.updated_at;
  const originalDeletedAt = joined.deleted_at ?? null;

  // Sanity predicates on initial payload
  TestValidator.predicate(
    "initial access token is non-empty",
    originalAccess.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token is non-empty",
    originalRefresh.length > 0,
  );

  // 3. Build refresh request
  const refreshBody = {
    refresh_token: originalRefresh,
  } satisfies IShoppingMallGuestUser.IRefresh;

  // 4. Call refresh endpoint
  const refreshed = await api.functional.auth.guestUser.refresh(connection, {
    body: refreshBody,
  });
  typia.assert<IShoppingMallGuestUser.IAuthorized>(refreshed);

  // 5. Validate identity continuity and lifecycle stability
  TestValidator.equals(
    "guest id remains stable across refresh",
    refreshed.id,
    guestId,
  );
  TestValidator.equals(
    "created_at is stable across refresh",
    refreshed.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "deleted_at remains unchanged (typically null) after refresh",
    refreshed.deleted_at ?? null,
    originalDeletedAt,
  );
  TestValidator.predicate(
    "updated_at does not go backwards on refresh",
    new Date(refreshed.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );

  // 6. Validate token rotation semantics
  const newToken: IAuthorizationToken = refreshed.token;
  TestValidator.notEquals(
    "access token is rotated on refresh",
    newToken.access,
    originalAccess,
  );
  TestValidator.notEquals(
    "refresh token is rotated on refresh",
    newToken.refresh,
    originalRefresh,
  );
  TestValidator.predicate(
    "refreshed access token is non-empty",
    newToken.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token is non-empty",
    newToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiry does not move backwards",
    new Date(newToken.expired_at).getTime() >=
      new Date(originalExpiredAt).getTime(),
  );
  TestValidator.predicate(
    "refreshable_until does not move backwards",
    new Date(newToken.refreshable_until).getTime() >=
      new Date(originalRefreshableUntil).getTime(),
  );
}
