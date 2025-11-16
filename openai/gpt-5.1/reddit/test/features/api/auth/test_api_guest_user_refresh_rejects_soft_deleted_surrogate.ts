import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

/**
 * Validate guestUser join and refresh lifecycle for an active surrogate.
 *
 * Business goal (adapted): Ensure that a guestUser pseudo-account obtained via
 * POST /auth/guestUser/join can successfully refresh its authorization envelope
 * via POST /auth/guestUser/refresh while preserving the underlying surrogate
 * identity (same id) and rotating access tokens.
 *
 * Original scenario mentioned validating behavior when the underlying
 * `community_platform_guestusers` row has been soft-deleted (deleted_at set),
 * but no admin or maintenance APIs are exposed in this test harness to
 * manipulate or inspect that state. Therefore, this test focuses on the
 * implementable subset of the lifecycle: join followed by a successful refresh
 * for an active surrogate record.
 *
 * Step-by-step process:
 *
 * 1. Call POST /auth/guestUser/join and obtain an
 *    ICommunityPlatformGuestuser.IAuthorized payload containing `id` and
 *    `token` (IAuthorizationToken).
 * 2. Validate the join response shape with typia.assert and basic logical checks
 *    (non-empty token strings).
 * 3. Construct a refresh request body using the `token.refresh` string from the
 *    join response, satisfying ICommunityPlatformGuestuser.IRefresh.
 * 4. Call POST /auth/guestUser/refresh with this body and obtain a new
 *    ICommunityPlatformGuestuser.IAuthorized payload.
 * 5. Validate the refresh response with typia.assert and business logic:
 *
 *    - The `id` remains unchanged across join and refresh (same surrogate).
 *    - The `token.access` value after refresh differs from the original
 *         `token.access`, indicating access token rotation.
 *    - The refreshed token fields are non-empty strings.
 * 6. This confirms the happy-path lifecycle of guestUser authorization without
 *    relying on unexposed soft-delete behavior.
 */
export async function test_api_guest_user_refresh_rejects_soft_deleted_surrogate(
  connection: api.IConnection,
) {
  // 1. Join as a guestUser to obtain initial authorized context
  const joined: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection);
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(joined);

  // Basic logical checks on join response
  TestValidator.predicate(
    "guestUser id from join should be a non-empty string",
    typeof joined.id === "string" && joined.id.length > 0,
  );
  TestValidator.predicate(
    "access token from join should be a non-empty string",
    typeof joined.token.access === "string" && joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token from join should be a non-empty string",
    typeof joined.token.refresh === "string" && joined.token.refresh.length > 0,
  );

  const originalId: string & tags.Format<"uuid"> = joined.id;
  const originalToken: IAuthorizationToken = joined.token;

  // 2. Build refresh request body using the refresh token from join
  const refreshBody = {
    refreshToken: originalToken.refresh,
  } satisfies ICommunityPlatformGuestuser.IRefresh;

  // 3. Call refresh endpoint to obtain refreshed authorized context
  const refreshed: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(refreshed);

  // 4. Business logic validations between join and refresh
  // Identity continuity: id must remain the same
  TestValidator.equals(
    "guestUser id should remain the same after refresh",
    refreshed.id,
    originalId,
  );

  // Access token rotation: access token after refresh should differ
  TestValidator.notEquals(
    "access token should rotate on refresh",
    refreshed.token.access,
    originalToken.access,
  );

  // Refreshed token sanity checks
  TestValidator.predicate(
    "refreshed access token should be a non-empty string",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token should be a non-empty string",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );
}
