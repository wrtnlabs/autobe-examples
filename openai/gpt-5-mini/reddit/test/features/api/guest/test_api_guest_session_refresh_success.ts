import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalGuest";

export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
) {
  /**
   * Test flow:
   *
   * 1. Create two independent guest sessions via POST /auth/guest/join
   * 2. Refresh the first guest token via POST /auth/guest/refresh
   * 3. Refresh the second guest token to ensure independent sessions
   * 4. Assert token presence, token rotation or expiry-extension, and that
   *    refreshing one session does not invalidate the other.
   */

  // 1) Create initial guest session A
  const initialA: ICommunityPortalGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies ICommunityPortalGuest.ICreate,
    });
  typia.assert(initialA);

  // Basic presence checks for initialA
  TestValidator.predicate(
    "guest token present (A)",
    typeof initialA.guest_token === "string" && initialA.guest_token.length > 0,
  );
  TestValidator.predicate(
    "authorization.access present (A)",
    typeof initialA.token?.access === "string" &&
      initialA.token.access.length > 0,
  );

  // 1b) Create initial guest session B (unrelated)
  const initialB: ICommunityPortalGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies ICommunityPortalGuest.ICreate,
    });
  typia.assert(initialB);

  TestValidator.predicate(
    "guest token present (B)",
    typeof initialB.guest_token === "string" && initialB.guest_token.length > 0,
  );

  // 2) Refresh A
  const refreshedA: ICommunityPortalGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        guest_token: initialA.guest_token,
      } satisfies ICommunityPortalGuest.IRefresh,
    });
  typia.assert(refreshedA);

  // 3) Refresh B to ensure independent sessions remain valid after A is refreshed
  const refreshedB: ICommunityPortalGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        guest_token: initialB.guest_token,
      } satisfies ICommunityPortalGuest.IRefresh,
    });
  typia.assert(refreshedB);

  // Validate A: either token rotated OR expiry extended (if expiry exists).
  // Treat both-null expiry as acceptable behavior (non-expiring semantics).
  const tokenRotatedA: boolean =
    refreshedA.guest_token !== initialA.guest_token;
  const expiryExtendedA: boolean = (() => {
    const a = initialA.expired_at;
    const b = refreshedA.expired_at;
    if (a == null && b == null) return true; // both non-expiring — acceptable
    if (a == null || b == null) return false; // one is null, the other is not — cannot compare meaningfully
    try {
      return new Date(b).getTime() > new Date(a).getTime();
    } catch {
      return false;
    }
  })();

  TestValidator.predicate(
    "refresh A should rotate token or extend expiry (or both non-expiring)",
    tokenRotatedA || expiryExtendedA,
  );

  // Validate B: same criteria for B after its refresh
  const tokenRotatedB: boolean =
    refreshedB.guest_token !== initialB.guest_token;
  const expiryExtendedB: boolean = (() => {
    const a = initialB.expired_at;
    const b = refreshedB.expired_at;
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    try {
      return new Date(b).getTime() > new Date(a).getTime();
    } catch {
      return false;
    }
  })();

  TestValidator.predicate(
    "refresh B should rotate token or extend expiry (or both non-expiring)",
    tokenRotatedB || expiryExtendedB,
  );

  // Ensure refreshed authorization tokens exist and look well-formed
  TestValidator.predicate(
    "authorization.access present (refreshed A)",
    typeof refreshedA.token?.access === "string" &&
      refreshedA.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization.refresh present (refreshed A)",
    typeof refreshedA.token?.refresh === "string" &&
      refreshedA.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "authorization.access present (refreshed B)",
    typeof refreshedB.token?.access === "string" &&
      refreshedB.token.access.length > 0,
  );

  // Confirm refreshing one session did not invalidate the other by reusing
  // the fact that refreshedB is a valid authorized response (typia.assert done)
  TestValidator.predicate(
    "refreshing A did not invalidate B",
    typeof refreshedB.guest_token === "string" &&
      refreshedB.guest_token.length > 0,
  );

  // Additional business sanity checks: ids are UUIDs (typia.assert ensures format), created_at exists
  TestValidator.predicate(
    "created_at present (A)",
    typeof refreshedA.created_at === "string" &&
      refreshedA.created_at.length > 0,
  );
  TestValidator.predicate(
    "created_at present (B)",
    typeof refreshedB.created_at === "string" &&
      refreshedB.created_at.length > 0,
  );
}
