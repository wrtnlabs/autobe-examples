import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestUser";

/**
 * Guest user token refresh must fail with invalid or malformed refresh tokens.
 *
 * Purpose:
 *
 * - Ensure that the guest refresh endpoint rejects invalid inputs that are still
 *   type-correct (string), without issuing any new tokens.
 * - Focus on business logic failure (not type errors), and avoid asserting
 *   specific HTTP status codes or error payloads.
 *
 * Flow:
 *
 * 1. Prepare an isolated unauthenticated connection (headers: {}) for safety.
 * 2. Try POST /auth/guestUser/refresh with a random invalid token string.
 *
 *    - Expect the call to fail (TestValidator.error).
 * 3. Try again with a malformed JWT-like token string (e.g.,
 *    "malformed.invalid.token").
 *
 *    - Expect the call to fail (TestValidator.error).
 *
 * Notes:
 *
 * - Do not access or assert connection.headers after creation.
 * - Do not check status codes or error messages; only ensure an error occurs.
 */
export async function test_api_guest_user_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // 1) Isolated unauthenticated connection (never touch headers afterwards)
  const unauth: api.IConnection = { ...connection, headers: {} };

  // 2) Random invalid token string (correct type, invalid business value)
  const randomInvalidToken: string = RandomGenerator.alphaNumeric(32);
  await TestValidator.error(
    "guest refresh with random invalid token must fail",
    async () => {
      await api.functional.auth.guestUser.refresh(unauth, {
        body: {
          refresh_token: randomInvalidToken,
        } satisfies ICommunityPlatformGuestUser.IRefresh,
      });
    },
  );

  // 3) Malformed JWT-like token should also fail
  const malformedJwtToken = "malformed.invalid.token";
  await TestValidator.error(
    "guest refresh with malformed token string must fail",
    async () => {
      await api.functional.auth.guestUser.refresh(unauth, {
        body: {
          refresh_token: malformedJwtToken,
        } satisfies ICommunityPlatformGuestUser.IRefresh,
      });
    },
  );
}
