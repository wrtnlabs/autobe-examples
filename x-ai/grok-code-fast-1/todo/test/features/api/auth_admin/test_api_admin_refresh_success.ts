import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Validate successful admin JWT token refresh lifecycle.
 *
 * This test covers the scenario where an authenticated admin refreshes their
 * JWT tokens using a valid, previously issued refresh token.
 *
 * Steps:
 *
 * 1. Generate valid admin credentials and perform a login to obtain an initial
 *    ITodoListAdmin.IAuthorized response (including access and refresh
 *    tokens).
 * 2. Submit the received refresh token to the /auth/admin/refresh endpoint.
 * 3. Verify that a new ITodoListAdmin.IAuthorized object is returned.
 * 4. Assert that the new token values are different from the originals.
 * 5. Assert that the admin identity fields (id, email, display_name) remain
 *    unchanged across refresh.
 * 6. Assert presence and correctness of session summary in the refreshed response
 *    (if provided).
 * 7. Validate the structure and type of all response fields with typia.assert().
 */
export async function test_api_admin_refresh_success(
  connection: api.IConnection,
) {
  // 1. Generate valid login credentials for the admin
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ITodoListAdmin.ILogin;

  // 2. Log in to obtain original IAuthorized (with tokens)
  const original = await api.functional.auth.admin.login(connection, {
    body: loginBody,
  });
  typia.assert(original);

  // 3. Prepare payload for refresh using returned refresh token
  const refreshBody = {
    refresh_token: original.token.refresh,
  } satisfies ITodoListAdmin.IRefresh;

  // 4. Call refresh endpoint with the valid refresh token
  const refreshed = await api.functional.auth.admin.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshed);

  // 5. The id, email, display_name must stay the same between original and refreshed
  TestValidator.equals(
    "admin id is consistent after refresh",
    refreshed.id,
    original.id,
  );
  TestValidator.equals(
    "admin email is consistent after refresh",
    refreshed.email,
    original.email,
  );
  TestValidator.equals(
    "display_name is consistent after refresh",
    refreshed.display_name,
    original.display_name,
  );

  // 6. Check that new access and refresh tokens are issued and different
  TestValidator.notEquals(
    "new access token is issued on refresh",
    refreshed.token.access,
    original.token.access,
  );
  TestValidator.notEquals(
    "new refresh token is issued on refresh",
    refreshed.token.refresh,
    original.token.refresh,
  );

  // 7. Assert session summary (presence and type if provided)
  if (refreshed.session !== null && refreshed.session !== undefined) {
    typia.assert(refreshed.session);
    TestValidator.equals(
      "session admin id matches",
      refreshed.session.id,
      refreshed.id,
    );
    TestValidator.equals(
      "session admin email matches",
      refreshed.session.email,
      refreshed.email,
    );
  }
}
