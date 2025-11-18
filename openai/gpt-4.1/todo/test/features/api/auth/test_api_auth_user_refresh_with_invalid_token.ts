import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that the /auth/user/refresh endpoint rejects invalid or expired
 * refresh tokens.
 *
 * This test simulates usage of a refresh token that is not associated with any
 * current session (random invalid string). The endpoint should respond with an
 * error, preventing session renewal. No authentication state must be granted in
 * this case. Steps:
 *
 * 1. Generate a random string to simulate a refresh token that is not in use
 *    (invalid token).
 * 2. Attempt to refresh with the invalid token.
 * 3. Confirm that an error is thrown and no token or session is refreshed.
 */
export async function test_api_auth_user_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // 1. Generate a random refresh_token that is not associated with any active session
  const invalid_refresh_token: string = RandomGenerator.alphaNumeric(48);

  // 2. Attempt to refresh with this invalid token
  await TestValidator.error(
    "refresh endpoint rejects invalid refresh_token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: invalid_refresh_token,
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );
}
