import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

/**
 * Validate guestUser token refresh behavior with stable identity and rotating
 * tokens.
 *
 * Original scenario requested testing that refresh fails after logical deletion
 * of the guest identity. However, no admin API exists in the provided SDK to
 * perform or verify such logical deletion. Therefore, this test focuses on the
 * implementable subset: verifying that refresh works correctly for an active
 * guest identity and that token rotation semantics behave as expected.
 *
 * Steps:
 *
 * 1. Register an admin with POST /auth/admin/join to exercise admin auth surface
 *    (not strictly required for guest flows, but confirms that admin join
 *    works).
 * 2. Create a guest identity via POST /auth/guestUser/join and capture the
 *    returned IShoppingMallGuestUser.IAuthorized, including its token payload.
 * 3. Call POST /auth/guestUser/refresh once using IShoppingMallGuestUser.IRefresh
 *    with the initial refresh_token and assert that:
 *
 *    - The call succeeds and returns IShoppingMallGuestUser.IAuthorized.
 *    - The guest id remains identical to the id from the join response.
 *    - The new token set differs from the original (at least one of access, refresh,
 *         expired_at, or refreshable_until changes).
 * 4. Call POST /auth/guestUser/refresh again using the latest refresh_token to
 *    verify chained refresh behavior and that each call issues a fresh token
 *    set while preserving the same guest id.
 * 5. Use TestValidator for business assertions and typia.assert for structural
 *    validation of API responses.
 */
export async function test_api_guestuser_token_refresh_after_guest_logical_deletion(
  connection: api.IConnection,
) {
  // 1. Admin join: create a new administrator to exercise admin auth.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Use random, but valid, metadata for href/referrer and optional ip.
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Ensure basic invariants on the admin payload.
  TestValidator.predicate(
    "admin id is a non-empty string",
    adminAuthorized.id.length > 0,
  );

  // 2. Guest join: create a new guest identity and capture its authorization.
  const guestJoinBody = {
    // external_reference is optional; use a simple random string to correlate.
    external_reference: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallGuestUser.IJoin;

  const initialGuest: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: guestJoinBody,
    });
  typia.assert(initialGuest);

  const initialToken: IAuthorizationToken = initialGuest.token;
  typia.assert<IAuthorizationToken>(initialToken);

  TestValidator.predicate(
    "guest id from join is non-empty",
    initialGuest.id.length > 0,
  );

  // 3. First refresh using the initial refresh token.
  const firstRefreshBody = {
    refresh_token: initialToken.refresh,
  } satisfies IShoppingMallGuestUser.IRefresh;

  const refreshedOnce: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: firstRefreshBody,
    });
  typia.assert(refreshedOnce);

  const refreshedOnceToken: IAuthorizationToken = refreshedOnce.token;
  typia.assert<IAuthorizationToken>(refreshedOnceToken);

  // Identity must remain stable across refresh.
  TestValidator.equals(
    "guest id remains stable after first refresh",
    refreshedOnce.id,
    initialGuest.id,
  );

  // Token rotation: expect at least one of the key token fields to change.
  const tokenChanged: boolean =
    refreshedOnceToken.access !== initialToken.access ||
    refreshedOnceToken.refresh !== initialToken.refresh ||
    refreshedOnceToken.expired_at !== initialToken.expired_at ||
    refreshedOnceToken.refreshable_until !== initialToken.refreshable_until;

  TestValidator.predicate(
    "token payload changes after first refresh",
    tokenChanged,
  );

  // 4. Second refresh using the latest refresh token to verify chainability.
  const secondRefreshBody = {
    refresh_token: refreshedOnceToken.refresh,
  } satisfies IShoppingMallGuestUser.IRefresh;

  const refreshedTwice: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: secondRefreshBody,
    });
  typia.assert(refreshedTwice);

  const refreshedTwiceToken: IAuthorizationToken = refreshedTwice.token;
  typia.assert<IAuthorizationToken>(refreshedTwiceToken);

  // Identity must still remain stable after second refresh.
  TestValidator.equals(
    "guest id remains stable after second refresh",
    refreshedTwice.id,
    initialGuest.id,
  );

  // Token should rotate again between first and second refresh.
  const secondTokenChanged: boolean =
    refreshedTwiceToken.access !== refreshedOnceToken.access ||
    refreshedTwiceToken.refresh !== refreshedOnceToken.refresh ||
    refreshedTwiceToken.expired_at !== refreshedOnceToken.expired_at ||
    refreshedTwiceToken.refreshable_until !==
      refreshedOnceToken.refreshable_until;

  TestValidator.predicate(
    "token payload changes after second refresh",
    secondTokenChanged,
  );
}
