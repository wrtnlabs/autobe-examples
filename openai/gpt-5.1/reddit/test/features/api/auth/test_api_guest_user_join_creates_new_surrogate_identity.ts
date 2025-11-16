import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

/**
 * Validate guestUser join creates a new surrogate identity and authorization
 * token bundle.
 *
 * Business intent:
 *
 * - When an unauthenticated visitor calls the public guestUser join endpoint, the
 *   backend must create a new `community_platform_guestusers` surrogate record
 *   and issue an authorization token bundle tied to that identity.
 * - The SDK helper `api.functional.auth.guestUser.join` encapsulates this
 *   behavior and also propagates the issued access token into the
 *   `connection.headers.Authorization` field for subsequent calls.
 *
 * This test focuses on the happy path for a single call, validating:
 *
 * 1. The endpoint can be called without any prior Authorization header (the
 *    function takes only the connection, with no request body).
 * 2. The response structurally matches `ICommunityPlatformGuestuser.IAuthorized`
 *    using `typia.assert` as the canonical validator.
 * 3. The issued token bundle looks sensible at a business level; we check that:
 *
 *    - `id` is a non-empty UUID string (format enforced by typia, non-empty length
 *         enforced by a simple predicate as a business rule).
 *    - `token.access` and `token.refresh` are non-empty strings.
 * 4. The SDK’s documented side-effect on the connection object occurs:
 *
 *    - After the call, `connection.headers` exists.
 *    - `connection.headers.Authorization` is exactly equal to `output.token.access`.
 *
 * We intentionally do NOT:
 *
 * - Decode the JWT token or inspect its claims (no JWT library is available in
 *   imports, and token structure is out of scope for this test).
 * - Call any additional endpoints using the token, because no other
 *   auth-consuming endpoints are provided in the current test materials.
 *   Instead we assert the header mutation as the observable side effect.
 */
export async function test_api_guest_user_join_creates_new_surrogate_identity(
  connection: api.IConnection,
) {
  // 1. Call the public guestUser join endpoint with the given connection.
  const authorized: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection);

  // 2. Validate the response structure exactly matches IAuthorized.
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(authorized);

  // 3. Business-level sanity checks on returned identity and token bundle.
  TestValidator.predicate(
    "guestUser id must be a non-empty UUID string",
    () => authorized.id.length > 0,
  );

  TestValidator.predicate(
    "access token must be a non-empty string",
    () => authorized.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token must be a non-empty string",
    () => authorized.token.refresh.length > 0,
  );

  // 4. Validate SDK-side side effect on connection headers.
  TestValidator.predicate(
    "connection.headers must be defined after join call",
    () => connection.headers !== undefined && connection.headers !== null,
  );

  TestValidator.equals(
    "Authorization header must be set to the access token after join",
    connection.headers?.Authorization,
    authorized.token.access,
  );
}
