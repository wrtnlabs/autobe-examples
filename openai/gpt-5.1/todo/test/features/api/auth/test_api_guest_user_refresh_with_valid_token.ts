import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";

/**
 * Validate guestUser token refresh flow with a valid refresh token.
 *
 * Business context:
 *
 * - Guest users are anonymous visitors represented by a stable guest UUID in the
 *   todo_app_guestusers table.
 * - The /auth/guestUser/join endpoint creates this guest concept and issues
 *   initial access and refresh tokens encapsulated in
 *   ITodoAppGuestUser.IAuthorized.
 * - The /auth/guestUser/refresh endpoint should accept a previously issued
 *   refresh token and return a new ITodoAppGuestUser.IAuthorized while keeping
 *   the guest id stable and rotating token values.
 *
 * This test covers the happy-path refresh flow and a chained refresh.
 *
 * Steps:
 *
 * 1. Call POST /auth/guestUser/join with a minimal ITodoAppGuestUser.IJoinRequest
 *    (optionally providing an external_ref) to obtain an initial
 *    ITodoAppGuestUser.IAuthorized object.
 * 2. Validate the join response shape using typia.assert and basic invariants like
 *    non-empty token strings and well-formed timestamps.
 * 3. Extract the canonical refresh token from authorized.token.refresh and verify
 *    that the top-level refreshToken mirror matches it when present.
 * 4. Build an ITodoAppGuestUser.IRefreshRequest using that refresh token and
 *    include deterministic clientId and tokenFamily strings to simulate a
 *    concrete client/device.
 * 5. Call POST /auth/guestUser/refresh with the constructed body.
 * 6. Assert that:
 *
 *    - Response is a valid ITodoAppGuestUser.IAuthorized (typia.assert).
 *    - The id in the refresh response equals the id from the original join response,
 *         ensuring continuity of the guest concept.
 *    - External_ref and created_at are preserved, while updated_at is equal to or
 *         later than the original updated_at.
 *    - The embedded token.access and token.refresh strings differ from the previous
 *         values, demonstrating token rotation.
 *    - The top-level accessToken and refreshToken mirrors, when defined, match the
 *         nested token.access and token.refresh values.
 *    - The new token.expired_at and token.refreshable_until timestamps are not
 *         earlier than the previous ones (refresh should not shorten the
 *         window).
 * 7. Perform a second refresh call, using the latest refresh token from step 6, to
 *    confirm that chained refresh within the refreshable window continues to
 *    work and again rotates token values while keeping id stable.
 */
export async function test_api_guest_user_refresh_with_valid_token(
  connection: api.IConnection,
) {
  // 1. Join as a new guest user with optional external_ref
  const joinBody = {
    external_ref: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoAppGuestUser.IJoinRequest;

  const joined: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(joined);

  // Validate basic invariants of join result
  TestValidator.predicate(
    "joined guest id is non-empty UUID",
    () => typeof joined.id === "string" && joined.id.length > 0,
  );
  TestValidator.predicate(
    "joined guest token.access is non-empty",
    () =>
      typeof joined.token.access === "string" && joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "joined guest token.refresh is non-empty",
    () =>
      typeof joined.token.refresh === "string" &&
      joined.token.refresh.length > 0,
  );

  // When top-level mirrors exist, they must match nested token values
  if (joined.accessToken !== undefined) {
    TestValidator.equals(
      "top-level accessToken mirrors token.access in join",
      joined.accessToken,
      joined.token.access,
    );
  }
  if (joined.refreshToken !== undefined) {
    TestValidator.equals(
      "top-level refreshToken mirrors token.refresh in join",
      joined.refreshToken,
      joined.token.refresh,
    );
  }

  // Keep original values for comparison
  const originalId = joined.id;
  const originalExternalRef = joined.external_ref ?? null;
  const originalCreatedAt = joined.created_at;
  const originalUpdatedAt = joined.updated_at;
  const originalToken: IAuthorizationToken = joined.token;

  // 2. Build refresh request using the canonical refresh token
  const clientId = `guest-client-${RandomGenerator.alphaNumeric(8)}`;
  const tokenFamily = `guest-family-${RandomGenerator.alphaNumeric(8)}`;

  const firstRefreshRequest = {
    refreshToken: originalToken.refresh,
    clientId,
    tokenFamily,
  } satisfies ITodoAppGuestUser.IRefreshRequest;

  const refreshed: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: firstRefreshRequest,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(refreshed);

  // 3. Validate invariants between original join and first refresh
  TestValidator.equals("refresh preserves guest id", refreshed.id, originalId);

  // external_ref may be nullable/undefined, but when present should match
  TestValidator.equals(
    "refresh preserves external_ref (including null/undefined semantics)",
    refreshed.external_ref ?? null,
    originalExternalRef,
  );

  // created_at should remain the same
  TestValidator.equals(
    "refresh preserves created_at timestamp",
    refreshed.created_at,
    originalCreatedAt,
  );

  // updated_at should be equal or later than original
  TestValidator.predicate(
    "refresh updated_at is not earlier than original",
    () =>
      new Date(refreshed.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );

  // Token rotation: new access/refresh tokens should differ from originals
  TestValidator.notEquals(
    "access token is rotated on refresh",
    refreshed.token.access,
    originalToken.access,
  );
  TestValidator.notEquals(
    "refresh token is rotated on refresh",
    refreshed.token.refresh,
    originalToken.refresh,
  );

  // Top-level mirrors must match nested token values when defined
  if (refreshed.accessToken !== undefined) {
    TestValidator.equals(
      "top-level accessToken mirrors token.access after refresh",
      refreshed.accessToken,
      refreshed.token.access,
    );
  }
  if (refreshed.refreshToken !== undefined) {
    TestValidator.equals(
      "top-level refreshToken mirrors token.refresh after refresh",
      refreshed.refreshToken,
      refreshed.token.refresh,
    );
  }

  // Token lifetime window: refreshed tokens should not have earlier expiry
  TestValidator.predicate(
    "refreshed token.expired_at is not earlier than original",
    () =>
      new Date(refreshed.token.expired_at).getTime() >=
      new Date(originalToken.expired_at).getTime(),
  );
  TestValidator.predicate(
    "refreshed token.refreshable_until is not earlier than original",
    () =>
      new Date(refreshed.token.refreshable_until).getTime() >=
      new Date(originalToken.refreshable_until).getTime(),
  );

  // 4. Perform a second chained refresh using the latest refresh token
  const secondRefreshRequest = {
    refreshToken: refreshed.token.refresh,
    clientId,
    tokenFamily,
  } satisfies ITodoAppGuestUser.IRefreshRequest;

  const refreshedAgain: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: secondRefreshRequest,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(refreshedAgain);

  // Validate that id remains stable across chained refresh
  TestValidator.equals(
    "chained refresh preserves guest id",
    refreshedAgain.id,
    originalId,
  );

  // Validate that tokens rotate again
  TestValidator.notEquals(
    "access token rotates again on chained refresh",
    refreshedAgain.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotates again on chained refresh",
    refreshedAgain.token.refresh,
    refreshed.token.refresh,
  );

  // Ensure the newest expiry window is not earlier than previous refresh
  TestValidator.predicate(
    "chained refresh token.expired_at is not earlier than previous",
    () =>
      new Date(refreshedAgain.token.expired_at).getTime() >=
      new Date(refreshed.token.expired_at).getTime(),
  );
  TestValidator.predicate(
    "chained refresh token.refreshable_until is not earlier than previous",
    () =>
      new Date(refreshedAgain.token.refreshable_until).getTime() >=
      new Date(refreshed.token.refreshable_until).getTime(),
  );
}
