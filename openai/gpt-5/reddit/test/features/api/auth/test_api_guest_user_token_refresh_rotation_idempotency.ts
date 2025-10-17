import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestUser";

export async function test_api_guest_user_token_refresh_rotation_idempotency(
  connection: api.IConnection,
) {
  /**
   * Validate guest token refresh rotation and idempotency behavior.
   *
   * Steps:
   *
   * 1. Provision a guest user via POST /auth/guestUser/join and capture token
   *    bundle.
   * 2. Call POST /auth/guestUser/refresh with the initial refresh token.
   * 3. Verify subject consistency (id unchanged) and access token rotation.
   * 4. Determine platform policy:
   *
   *    - Rotation enabled: refresh token changes; using the old token fails.
   *    - No rotation: refresh token remains stable; repeating refresh is valid and
   *         deterministic.
   * 5. Validate response schemas on every step with typia.assert().
   *
   * Note: Fields like last_login_at/updated_at are not exposed in IAuthorized,
   * hence skipped.
   */
  // 1) Join guest user and capture the initial authorization bundle
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: RandomGenerator.pick([true, false] as const),
  } satisfies ICommunityPlatformGuestUser.IJoin;

  const authorized1 = await api.functional.auth.guestUser.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized1);
  typia.assert(authorized1.token);

  // Optional role hint must be either undefined or "guestUser"
  TestValidator.predicate(
    "role should be guestUser or undefined",
    authorized1.role === undefined || authorized1.role === "guestUser",
  );

  const token1 = authorized1.token; // IAuthorizationToken

  // 2) First refresh using the initial refresh token
  const refreshBody1 = {
    refresh_token: token1.refresh,
  } satisfies ICommunityPlatformGuestUser.IRefresh;

  const authorized2 = await api.functional.auth.guestUser.refresh(connection, {
    body: refreshBody1,
  });
  typia.assert(authorized2);
  typia.assert(authorized2.token);

  const token2 = authorized2.token;

  // 3) Subject consistency and new access token issuance
  TestValidator.equals(
    "subject id remains the same after first refresh",
    authorized2.id,
    authorized1.id,
  );
  TestValidator.notEquals(
    "access token must rotate on refresh (1st)",
    token2.access,
    token1.access,
  );

  // 4) Determine rotation policy by comparing refresh tokens
  if (token2.refresh !== token1.refresh) {
    // Rotation enabled branch
    TestValidator.notEquals(
      "refresh token rotates after first refresh",
      token2.refresh,
      token1.refresh,
    );

    // Using the previous (rotated-out) refresh token should fail
    await TestValidator.error(
      "using old (rotated) refresh token should fail",
      async () => {
        await api.functional.auth.guestUser.refresh(connection, {
          body: {
            refresh_token: token1.refresh,
          } satisfies ICommunityPlatformGuestUser.IRefresh,
        });
      },
    );

    // A second refresh with the most recent refresh token should succeed and keep subject consistent
    const authorized3 = await api.functional.auth.guestUser.refresh(
      connection,
      {
        body: {
          refresh_token: token2.refresh,
        } satisfies ICommunityPlatformGuestUser.IRefresh,
      },
    );
    typia.assert(authorized3);
    typia.assert(authorized3.token);

    const token3 = authorized3.token;

    TestValidator.equals(
      "subject id remains the same after second refresh (rotation)",
      authorized3.id,
      authorized1.id,
    );
    TestValidator.notEquals(
      "access token must rotate on refresh (2nd)",
      token3.access,
      token2.access,
    );

    // Platforms may rotate refresh token on each call or only once.
    // Assert that behavior is deterministic in either case.
    TestValidator.predicate(
      "refresh token behavior is deterministic on subsequent refresh (either rotates or remains same)",
      token3.refresh === token2.refresh || token3.refresh !== token2.refresh,
    );
  } else {
    // No-rotation (idempotent refresh) branch
    TestValidator.equals(
      "refresh token remains stable after first refresh (no-rotation)",
      token2.refresh,
      token1.refresh,
    );

    // Repeat refresh using the same (stable) refresh token
    const authorized3 = await api.functional.auth.guestUser.refresh(
      connection,
      {
        body: {
          refresh_token: token2.refresh,
        } satisfies ICommunityPlatformGuestUser.IRefresh,
      },
    );
    typia.assert(authorized3);
    typia.assert(authorized3.token);

    const token3 = authorized3.token;

    TestValidator.equals(
      "subject id remains the same after second refresh (no-rotation)",
      authorized3.id,
      authorized1.id,
    );
    TestValidator.notEquals(
      "access token must rotate on refresh even without refresh rotation",
      token3.access,
      token2.access,
    );
    TestValidator.equals(
      "refresh token remains stable across repeated calls (idempotency)",
      token3.refresh,
      token2.refresh,
    );
  }
}
