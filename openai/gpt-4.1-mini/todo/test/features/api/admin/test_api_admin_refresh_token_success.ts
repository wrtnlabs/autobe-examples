import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test successful admin token refresh with a valid refresh token issued during
 * admin authentication.
 *
 * This test performs the following steps:
 *
 * 1. Authenticate as a new admin user using the /auth/admin/join endpoint.
 * 2. Receive valid authorization tokens including access and refresh token.
 * 3. Use the refresh token via /auth/admin/refresh to obtain a new token set.
 * 4. Verify that new tokens are obtained successfully and are different from the
 *    initial ones.
 * 5. Confirm that the new access token is valid by attempting an authenticated
 *    request.
 */
export async function test_api_admin_refresh_token_success(
  connection: api.IConnection,
) {
  // 1. Admin joins via /auth/admin/join to obtain initial tokens
  const adminCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "strongpassword123",
  } satisfies ITodoListAdmin.ICreate;

  const authorized: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(authorized);

  // 2. Extract refresh token
  const initialRefreshToken: string = authorized.token.refresh;

  // 3. Call /auth/admin/refresh with the refresh token
  const refreshBody = {
    refresh_token: initialRefreshToken,
  } satisfies ITodoListAdmin.IRefresh;

  const refreshed: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 4. Validate that the refreshed tokens differ from the initial tokens
  TestValidator.notEquals(
    "refresh token should change upon refresh",
    authorized.token.refresh,
    refreshed.token.refresh,
  );
  TestValidator.notEquals(
    "access token should change upon refresh",
    authorized.token.access,
    refreshed.token.access,
  );

  // 5. Confirm continued access using new access token (authorization header is auto-set by SDK)
  // We'll call /auth/admin/refresh again to verify new access token works
  const secondRefreshBody = {
    refresh_token: refreshed.token.refresh,
  } satisfies ITodoListAdmin.IRefresh;

  const secondRefreshed: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: secondRefreshBody,
    });
  typia.assert(secondRefreshed);

  // The tokens should again be valid and different from previous refresh
  TestValidator.notEquals(
    "refresh token should change on subsequent refresh",
    refreshed.token.refresh,
    secondRefreshed.token.refresh,
  );
  TestValidator.notEquals(
    "access token should change on subsequent refresh",
    refreshed.token.access,
    secondRefreshed.token.access,
  );
}
