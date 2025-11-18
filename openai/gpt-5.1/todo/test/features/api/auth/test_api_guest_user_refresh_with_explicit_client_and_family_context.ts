import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";

/**
 * Validate guestUser token refresh behavior with explicit client and token
 * family metadata.
 *
 * Business objective:
 *
 * - Ensure that the `/auth/guestUser/refresh` endpoint correctly accepts an
 *   `ITodoAppGuestUser.IRefreshRequest` containing optional `clientId` and
 *   `tokenFamily` values.
 * - Verify that refresh does not change the underlying guest identity (`id`),
 *   while issuing a fresh set of authorization tokens.
 * - Demonstrate that subsequent refreshes using the newly issued refresh token
 *   and the same clientId/tokenFamily continue to work and preserve identity.
 *
 * Scenario steps:
 *
 * 1. Create a guest concept via `/auth/guestUser/join` using
 *    `ITodoAppGuestUser.IJoinRequest` with an explicit `external_ref`.
 * 2. From the returned `ITodoAppGuestUser.IAuthorized`, capture:
 *
 *    - `id` (guest id)
 *    - `token` (IAuthorizationToken)
 *    - Top-level `accessToken` and `refreshToken` convenience mirrors.
 * 3. Build an `ITodoAppGuestUser.IRefreshRequest` payload that includes:
 *
 *    - `refreshToken`: taken from the join response (prefer top-level
 *         `refreshToken`, but fall back to `token.refresh` when needed).
 *    - `clientId`: a stable, realistic client identifier string (e.g., "web-spa-1").
 *    - `tokenFamily`: a logical family identifier string (e.g., "fam-guest-001").
 * 4. Call `/auth/guestUser/refresh` with this payload and validate:
 *
 *    - The response is a valid `ITodoAppGuestUser.IAuthorized` via `typia.assert`.
 *    - `id` matches the original guest id.
 *    - The returned `token` field is a valid `IAuthorizationToken` and
 *         access/refresh values are strings.
 *    - If present, `accessToken` equals `token.access`, and `refreshToken` equals
 *         `token.refresh`.
 *    - At least one of `token.access` or `token.refresh` differs from the original
 *         token set to reflect rotation.
 * 5. Perform a second refresh call using the newly issued `refreshToken` and the
 *    same `clientId`/`tokenFamily` and validate:
 *
 *    - The second response is `ITodoAppGuestUser.IAuthorized`.
 *    - `id` remains stable across all generations.
 *    - The latest token set differs from the previous token set to demonstrate
 *         ongoing rotation.
 * 6. Use `TestValidator` helpers only for business-focused assertions:
 *
 *    - `TestValidator.equals` for equality of guest id and mirror consistency.
 *    - `TestValidator.notEquals` to confirm token rotation.
 *    - `TestValidator.predicate` for boolean or structural conditions.
 */
export async function test_api_guest_user_refresh_with_explicit_client_and_family_context(
  connection: api.IConnection,
) {
  // 1. Join as a new guest user with an explicit external_ref.
  const joinRequestBody = {
    external_ref: `guest-corr-${RandomGenerator.alphaNumeric(8)}`,
  } satisfies ITodoAppGuestUser.IJoinRequest;

  const joined: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(joined);

  const originalGuestId = joined.id;
  const originalToken: IAuthorizationToken = joined.token;
  const originalAccessMirror: string | undefined = joined.accessToken;
  const originalRefreshMirror: string | undefined = joined.refreshToken;

  // Ensure mirrors (when present) match the canonical token fields.
  if (originalAccessMirror !== undefined) {
    TestValidator.equals(
      "initial accessToken mirror matches token.access",
      originalAccessMirror,
      originalToken.access,
    );
  }
  if (originalRefreshMirror !== undefined) {
    TestValidator.equals(
      "initial refreshToken mirror matches token.refresh",
      originalRefreshMirror,
      originalToken.refresh,
    );
  }

  // Determine the refresh token to use, preferring the top-level mirror.
  const firstRefreshTokenSource =
    originalRefreshMirror !== undefined
      ? originalRefreshMirror
      : originalToken.refresh;

  // 2. First refresh with explicit clientId and tokenFamily.
  const clientId = "web-spa-1";
  const tokenFamily = "fam-guest-001";

  const firstRefreshBody = {
    refreshToken: firstRefreshTokenSource,
    clientId,
    tokenFamily,
  } satisfies ITodoAppGuestUser.IRefreshRequest;

  const refreshed1: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: firstRefreshBody,
    });
  typia.assert(refreshed1);

  // Validate identity stability.
  TestValidator.equals(
    "first refresh preserves guest id",
    refreshed1.id,
    originalGuestId,
  );

  const refreshedToken1: IAuthorizationToken = refreshed1.token;

  // Validate mirrors on the first refresh response.
  if (refreshed1.accessToken !== undefined) {
    TestValidator.equals(
      "first refresh accessToken mirror matches token.access",
      refreshed1.accessToken,
      refreshedToken1.access,
    );
  }
  if (refreshed1.refreshToken !== undefined) {
    TestValidator.equals(
      "first refresh refreshToken mirror matches token.refresh",
      refreshed1.refreshToken,
      refreshedToken1.refresh,
    );
  }

  // Ensure some rotation has occurred on token values.
  TestValidator.predicate(
    "first refresh should rotate access or refresh token",
    refreshedToken1.access !== originalToken.access ||
      refreshedToken1.refresh !== originalToken.refresh,
  );

  // 3. Second refresh using the newly issued refresh token and same context.
  const secondRefreshTokenSource =
    refreshed1.refreshToken !== undefined
      ? refreshed1.refreshToken
      : refreshedToken1.refresh;

  const secondRefreshBody = {
    refreshToken: secondRefreshTokenSource,
    clientId,
    tokenFamily,
  } satisfies ITodoAppGuestUser.IRefreshRequest;

  const refreshed2: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: secondRefreshBody,
    });
  typia.assert(refreshed2);

  const refreshedToken2: IAuthorizationToken = refreshed2.token;

  // Identity must remain stable across all refreshes.
  TestValidator.equals(
    "second refresh preserves guest id",
    refreshed2.id,
    originalGuestId,
  );

  // Validate mirrors on the second refresh response.
  if (refreshed2.accessToken !== undefined) {
    TestValidator.equals(
      "second refresh accessToken mirror matches token.access",
      refreshed2.accessToken,
      refreshedToken2.access,
    );
  }
  if (refreshed2.refreshToken !== undefined) {
    TestValidator.equals(
      "second refresh refreshToken mirror matches token.refresh",
      refreshed2.refreshToken,
      refreshedToken2.refresh,
    );
  }

  // Ensure ongoing rotation between first and second refresh token sets.
  TestValidator.predicate(
    "second refresh should rotate access or refresh token again",
    refreshedToken2.access !== refreshedToken1.access ||
      refreshedToken2.refresh !== refreshedToken1.refresh,
  );
}
