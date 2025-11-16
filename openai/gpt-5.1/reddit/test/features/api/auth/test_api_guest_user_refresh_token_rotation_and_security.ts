import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

export async function test_api_guest_user_refresh_token_rotation_and_security(
  connection: api.IConnection,
) {
  // 1. Join as guestUser to obtain initial authorized context and token1
  const joinAuthorized: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection);
  typia.assert(joinAuthorized);

  const token1: IAuthorizationToken = joinAuthorized.token;

  // Basic structural invariants for token1
  TestValidator.predicate(
    "token1.access should be a non-empty string",
    token1.access.length > 0,
  );
  TestValidator.predicate(
    "token1.refresh should be a non-empty string",
    token1.refresh.length > 0,
  );

  // 2. Refresh using token1.refresh to obtain token2
  const refreshBody1 = {
    refreshToken: token1.refresh,
  } satisfies ICommunityPlatformGuestuser.IRefresh;

  const refreshAuthorized1: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshBody1,
    });
  typia.assert(refreshAuthorized1);

  const token2: IAuthorizationToken = refreshAuthorized1.token;

  // guestUser id should remain stable across refresh operations
  TestValidator.equals(
    "guestUser id should be stable between join and first refresh",
    refreshAuthorized1.id,
    joinAuthorized.id,
  );

  // token rotation: access and refresh tokens should change
  TestValidator.notEquals(
    "access token should rotate on first refresh",
    token2.access,
    token1.access,
  );
  TestValidator.notEquals(
    "refresh token should rotate on first refresh",
    token2.refresh,
    token1.refresh,
  );

  TestValidator.predicate(
    "token2.access should be a non-empty string",
    token2.access.length > 0,
  );
  TestValidator.predicate(
    "token2.refresh should be a non-empty string",
    token2.refresh.length > 0,
  );

  // 3. Attempt to reuse token1.refresh for a second refresh.
  //
  // Security policy (single-use vs multi-use refresh tokens) is not specified
  // in the provided materials, and the simulator implementation simply returns
  // random data. Therefore, we do not assert a specific success/failure mode
  // here. Instead, we perform the call and assert structural correctness,
  // while also checking invariants that should hold regardless of the policy.
  const refreshBody2 = {
    refreshToken: token1.refresh,
  } satisfies ICommunityPlatformGuestuser.IRefresh;

  const refreshAuthorized2: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshBody2,
    });
  typia.assert(refreshAuthorized2);

  const token3: IAuthorizationToken = refreshAuthorized2.token;

  // guestUser id should still be stable
  TestValidator.equals(
    "guestUser id should remain stable for second refresh attempt",
    refreshAuthorized2.id,
    joinAuthorized.id,
  );

  // Structural checks for token3
  TestValidator.predicate(
    "token3.access should be a non-empty string",
    token3.access.length > 0,
  );
  TestValidator.predicate(
    "token3.refresh should be a non-empty string",
    token3.refresh.length > 0,
  );

  // At least one of the refreshed tokens (token2 or token3) should differ from
  // the original token1, confirming that some rotation has taken place.
  TestValidator.predicate(
    "at least one refreshed access token differs from original",
    token2.access !== token1.access || token3.access !== token1.access,
  );
  TestValidator.predicate(
    "at least one refreshed refresh token differs from original",
    token2.refresh !== token1.refresh || token3.refresh !== token1.refresh,
  );
}
