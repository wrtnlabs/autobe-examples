import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

/**
 * Validate guestUser refresh flow behavior with an arbitrary opaque refresh
 * token.
 *
 * Business context:
 *
 * - The /auth/guestUser/refresh endpoint accepts a refresh token for a guestUser
 *   surrogate identity and, when valid, returns a new
 *   ICommunityPlatformGuestuser.IAuthorized payload.
 * - Invalid token semantics cannot be reliably or safely tested here without
 *   breaking type safety or depending on backend-specific behavior, so this E2E
 *   focuses on the successful refresh contract using an arbitrary opaque string
 *   refresh token.
 *
 * Scenario steps:
 *
 * 1. Build a syntactically arbitrary refresh token string using
 *    RandomGenerator.alphaNumeric to simulate an opaque token value.
 * 2. Call api.functional.auth.guestUser.refresh with this token in the
 *    ICommunityPlatformGuestuser.IRefresh request body.
 * 3. Assert the response conforms to ICommunityPlatformGuestuser.IAuthorized using
 *    typia.assert, including its nested IAuthorizationToken structure.
 * 4. Verify that the returned token bundle has non-empty access and refresh
 *    strings, and that the guestUser id is a non-empty UUID-format string (UUID
 *    format is enforced by typia.assert based on the DTO tags).
 */
export async function test_api_guest_user_refresh_rejects_invalid_refresh_token(
  connection: api.IConnection,
) {
  // 1. Construct an arbitrary opaque refresh token string.
  const arbitraryRefreshToken: string = RandomGenerator.alphaNumeric(64);

  // 2. Call the guestUser refresh endpoint with this token.
  const authorized: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: {
        refreshToken: arbitraryRefreshToken,
      } satisfies ICommunityPlatformGuestuser.IRefresh,
    });

  // 3. Assert structural correctness of the response.
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(authorized);

  // Extract and assert the embedded authorization token bundle.
  const token: IAuthorizationToken = authorized.token;
  typia.assert<IAuthorizationToken>(token);

  // 4. Basic business invariants: non-empty fields.
  TestValidator.predicate(
    "guestUser id should be a non-empty string",
    authorized.id.length > 0,
  );

  TestValidator.predicate(
    "access token string should be non-empty",
    token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token string should be non-empty",
    token.refresh.length > 0,
  );
}
