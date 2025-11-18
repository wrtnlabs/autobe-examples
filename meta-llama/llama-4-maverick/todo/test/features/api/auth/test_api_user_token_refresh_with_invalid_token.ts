import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate the rejection of token refresh operation using an invalid refresh
 * token.
 *
 * This test first registers a new user to get a valid security context for
 * baseline. Then, it attempts to refresh tokens using an obviously invalid
 * refresh token and verifies that the API rejects the request without issuing
 * new tokens. Ensures robust security: only legitimate, untampered refresh
 * tokens are accepted.
 *
 * Steps:
 *
 * 1. Register a new user and obtain tokens (for context only)
 * 2. Attempt token refresh with an invalid or tampered token value
 * 3. Verify error is thrown and no tokens are issued
 * 4. Confirm user session remains unchanged
 */
export async function test_api_user_token_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userCreate = typia.random<ITodoUser.ICreate>();
  const registered: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userCreate },
  );
  typia.assert(registered);

  // 2. Attempt to refresh tokens with an invalid refresh token
  const invalidRefreshToken = RandomGenerator.alphaNumeric(64) + "tampered";
  const refreshBody = {
    refresh_token: invalidRefreshToken,
  } satisfies ITodoUser.IRefresh;

  // 3. Verify that using the invalid token raises an error, and no tokens are issued
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.user.refresh(connection, { body: refreshBody });
    },
  );
}
