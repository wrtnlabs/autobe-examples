import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";

/**
 * Validate that an active guestUser can refresh JWT tokens while preserving
 * identity.
 *
 * Business purpose:
 *
 * - Ensure that a guest, once materialized in discussion_board_guestusers via
 *   /auth/guestUser/join, can use the issued refresh token to obtain a new
 *   IDiscussionBoardGuestUser.IAuthorized via /auth/guestUser/refresh.
 * - Confirm that refresh does not change the underlying guest identity (id,
 *   anonymous_token) and that updated_at reflects recent activity.
 *
 * Test steps:
 *
 * 1. Prepare a realistic IDiscussionBoardGuestUser.IJoin payload:
 *
 *    - Anonymous_token: non-empty opaque string
 *    - Href/referrer: well-formed URI strings
 *    - Ip: either a string IP or null/undefined (we will send a concrete value)
 * 2. Call api.functional.auth.guestUser.join with the join payload and capture the
 *    IDiscussionBoardGuestUser.IAuthorized response as `joined`.
 *
 *    - Typia.assert(joined) to ensure schema conformity.
 * 3. Build an IDiscussionBoardGuestUser.IRefresh payload using
 *    joined.token.refresh:
 *
 *    - RefreshToken: joined.token.refresh
 *    - Href/referrer: realistic URIs (can reuse or vary from join request)
 *    - Ip: provide a concrete IP string to model client context.
 * 4. Call api.functional.auth.guestUser.refresh with the refresh payload and
 *    capture the IDiscussionBoardGuestUser.IAuthorized response as
 *    `refreshed`.
 *
 *    - Typia.assert(refreshed) to ensure schema conformity.
 * 5. Validate business invariants using TestValidator:
 *
 *    - `refreshed.id` equals `joined.id` (same guest record).
 *    - `refreshed.anonymous_token` equals `joined.anonymous_token`.
 *    - `refreshed.token.access` is different from `joined.token.access` to
 *         demonstrate access token rotation.
 *    - `refreshed.token.refresh` is a non-empty string (we do not constrain
 *         equality/inequality vs original, as implementation may rotate it or
 *         not).
 *    - `refreshed.updated_at` is greater than or equal to `joined.updated_at`.
 * 6. (Optional in scenario but skipped in implementation) We could exercise an
 *    additional guest-allowed endpoint to prove the new access token is usable.
 *    However, since no such endpoint is provided, we limit checks to the
 *    authorization DTO invariants and timestamps.
 */
export async function test_api_guest_user_refresh_issues_new_tokens_for_active_guest(
  connection: api.IConnection,
) {
  // 1. Prepare join payload with realistic context values
  const anonymousToken: string = RandomGenerator.alphaNumeric(32);
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const ip: string = "203.0.113.10";

  const joinBody = {
    anonymous_token: anonymousToken,
    ip,
    href,
    referrer,
  } satisfies IDiscussionBoardGuestUser.IJoin;

  // 2. Call guestUser.join and validate response
  const joined: IDiscussionBoardGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Basic invariants from join
  TestValidator.equals(
    "join: anonymous_token echoes input",
    joined.anonymous_token,
    anonymousToken,
  );

  // 3. Build refresh payload using the refresh token from join
  const refreshHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const refreshReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const refreshIp: string = "203.0.113.20";

  const refreshBody = {
    refreshToken: joined.token.refresh,
    ip: refreshIp,
    href: refreshHref,
    referrer: refreshReferrer,
  } satisfies IDiscussionBoardGuestUser.IRefresh;

  // 4. Call guestUser.refresh and validate response
  const refreshed: IDiscussionBoardGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 5. Business invariants
  // Identity continuity
  TestValidator.equals(
    "refresh: id must match original guest id",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "refresh: anonymous_token must remain the same",
    refreshed.anonymous_token,
    joined.anonymous_token,
  );

  // Access token rotation
  TestValidator.notEquals(
    "refresh: access token should rotate",
    refreshed.token.access,
    joined.token.access,
  );

  // Refresh token presence and non-emptiness
  TestValidator.predicate(
    "refresh: refresh token must be non-empty string",
    refreshed.token.refresh.length > 0,
  );

  // updated_at monotonicity: refreshed.updated_at >= joined.updated_at
  const joinedUpdatedAt = new Date(joined.updated_at).getTime();
  const refreshedUpdatedAt = new Date(refreshed.updated_at).getTime();

  TestValidator.predicate(
    "refresh: updated_at should be greater than or equal to join.updated_at",
    refreshedUpdatedAt >= joinedUpdatedAt,
  );
}
