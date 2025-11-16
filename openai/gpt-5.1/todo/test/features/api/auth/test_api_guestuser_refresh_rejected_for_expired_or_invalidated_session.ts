import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserRefresh";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

/**
 * Ensure guestUser refresh rejects structurally valid but unauthorized refresh
 * tokens.
 *
 * Original business intent is to verify that `/auth/guestUser/refresh` does not
 * resurrect expired or administratively invalidated sessions. However, the
 * provided API surface exposes only two operations:
 *
 * - `POST /auth/guestUser/join` for establishing a guest identity and issuing
 *   access/refresh tokens.
 * - `POST /auth/guestUser/refresh` for rotating tokens for an existing session.
 *
 * There is no test-time API to explicitly expire or invalidate a concrete
 * `todo_app_guestuser_sessions` record, and we cannot rely on real-time TTL
 * expiration within the scope of a single e2e test. Therefore this test focuses
 * on a closely related, implementable rule: refresh must succeed for a
 * legitimately issued refresh_token, and must fail for a synthetically
 * generated refresh_token that does not map to any session at all.
 *
 * Scenario steps:
 *
 * 1. Call `POST /auth/guestUser/join` with a random ITodoAppGuestUserJoin.IRequest
 *    payload to establish a guest identity and session.
 *
 *    - Capture the issued ITodoAppGuestUser.IAuthorized response.
 *    - Extract the `token.refresh` string as a valid refresh token.
 * 2. Call `POST /auth/guestUser/refresh` with ITodoAppGuestUserRefresh.IRequest
 *    using the captured refresh token and new random `href`/`referrer` values.
 *
 *    - Assert the call succeeds and the response shape matches
 *         ITodoAppGuestUser.IAuthorized via typia.assert.
 *    - Optionally verify that the guest/session identity is preserved across refresh
 *         by comparing ids.
 * 3. Generate a fake refresh token string that has never been issued by the
 *    backend, using RandomGenerator.alphaNumeric(64).
 *
 *    - Construct a new ITodoAppGuestUserRefresh.IRequest body with this fake token
 *         and valid `href`/`referrer` fields.
 *    - Wrap the refresh call in `await TestValidator.error(...)` to assert that an
 *         error is thrown when the backend attempts to validate this token.
 *    - Do not inspect HTTP status codes or error details; only the fact that an
 *         error occurs is validated, in line with global constraints.
 *
 * This test therefore exercises both the happy path (join+refresh) and a
 * negative path (refresh with an unknown token) while remaining fully type-safe
 * and compatible with the limited API surface that is available.
 */
export async function test_api_guestuser_refresh_rejected_for_expired_or_invalidated_session(
  connection: api.IConnection,
) {
  // 1. Establish a guest identity and session via join
  const joinBody = typia.random<ITodoAppGuestUserJoin.IRequest>();
  const joined: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(joined);

  // Capture identity and token info for later comparison
  const originalGuestId = joined.guest.id;
  const originalSessionId = joined.session.id;
  const originalRefreshToken = joined.token.refresh;

  // 2. Perform a valid refresh with the issued refresh token
  const refreshBody: ITodoAppGuestUserRefresh.IRequest = {
    refresh_token: originalRefreshToken,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };

  const refreshed: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(refreshed);

  // Validate that guest identity is preserved across refresh
  TestValidator.equals(
    "guest id remains consistent after refresh",
    refreshed.guest.id,
    originalGuestId,
  );

  // 3. Attempt to refresh with a completely fabricated refresh token
  const fakeRefreshBody: ITodoAppGuestUserRefresh.IRequest = {
    refresh_token: RandomGenerator.alphaNumeric(64),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };

  await TestValidator.error(
    "refresh should reject an unknown refresh token",
    async () => {
      await api.functional.auth.guestUser.refresh(connection, {
        body: fakeRefreshBody,
      });
    },
  );
}
