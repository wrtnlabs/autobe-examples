import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that a user can refresh authentication tokens with a valid refresh
 * token.
 *
 * This test simulates an authenticated user session, providing a valid and
 * active refresh token. It verifies that a new access/refresh token pair is
 * issued and the authorized user response structure is returned. Only the happy
 * path is covered: the refresh token is assumed to be valid, active, and
 * unrevoked.
 *
 * Steps:
 *
 * 1. Generate a random valid refresh token (simulating a valid authenticated
 *    session)
 * 2. Call the /auth/user/refresh API with the refresh token
 * 3. Validate that the response is a valid ITodoListUser.IAuthorized structure,
 *    including its token
 */
export async function test_api_auth_user_refresh_valid_token(
  connection: api.IConnection,
) {
  // 1. Generate a valid simulated user refresh token structure
  const refreshBody = {
    refresh_token: typia.random<string>(),
  } satisfies ITodoListUser.IRefresh;

  // 2. Call the /auth/user/refresh API endpoint with a valid refresh token
  const authorized = await api.functional.auth.user.refresh(connection, {
    body: refreshBody,
  });
  typia.assert<ITodoListUser.IAuthorized>(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);
}
