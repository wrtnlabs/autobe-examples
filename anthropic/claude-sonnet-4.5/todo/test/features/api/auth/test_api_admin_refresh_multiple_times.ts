import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test that admin refresh token can be used multiple times sequentially.
 *
 * This test validates the reusability of admin refresh tokens across multiple
 * consecutive refresh operations. It ensures that administrators can maintain
 * long-running sessions by repeatedly refreshing their access tokens without
 * needing to re-authenticate with credentials.
 *
 * The test follows this workflow:
 *
 * 1. Create a new admin account
 * 2. Authenticate to obtain initial tokens
 * 3. Perform first token refresh
 * 4. Perform second token refresh with the same refresh token
 * 5. Perform third token refresh to confirm continued validity
 * 6. Validate access token updates and expiration progression
 * 7. Verify session metadata preservation throughout all refreshes
 */
export async function test_api_admin_refresh_multiple_times(
  connection: api.IConnection,
) {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123!";

  const createBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies ITodoListAdmin.ICreate;

  const createdAdmin = await api.functional.auth.admin.join(connection, {
    body: createBody,
  });
  typia.assert(createdAdmin);

  const loginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://admin.example.com/register" satisfies string &
      tags.Format<"uri">,
  } satisfies ITodoListAdmin.ILogin;

  const loginResponse = await api.functional.auth.admin.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResponse);

  TestValidator.equals(
    "login admin ID matches",
    loginResponse.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "login admin email matches",
    loginResponse.email,
    createdAdmin.email,
  );

  const initialRefreshToken = loginResponse.token.refresh;
  const initialAccessToken = loginResponse.token.access;
  const initialExpiredAt = loginResponse.token.expired_at;

  const firstRefreshBody = {
    refreshToken: initialRefreshToken,
  } satisfies ITodoListAdmin.IRefresh;

  const firstRefresh = await api.functional.auth.admin.refresh(connection, {
    body: firstRefreshBody,
  });
  typia.assert(firstRefresh);

  TestValidator.equals(
    "first refresh admin ID matches",
    firstRefresh.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "first refresh admin email matches",
    firstRefresh.email,
    createdAdmin.email,
  );
  TestValidator.notEquals(
    "first refresh access token changed",
    firstRefresh.token.access,
    initialAccessToken,
  );

  const firstRefreshAccessToken = firstRefresh.token.access;
  const firstRefreshExpiredAt = firstRefresh.token.expired_at;

  TestValidator.predicate(
    "first refresh expiration is after initial",
    new Date(firstRefreshExpiredAt).getTime() >=
      new Date(initialExpiredAt).getTime(),
  );

  const secondRefreshBody = {
    refreshToken: initialRefreshToken,
  } satisfies ITodoListAdmin.IRefresh;

  const secondRefresh = await api.functional.auth.admin.refresh(connection, {
    body: secondRefreshBody,
  });
  typia.assert(secondRefresh);

  TestValidator.equals(
    "second refresh admin ID matches",
    secondRefresh.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "second refresh admin email matches",
    secondRefresh.email,
    createdAdmin.email,
  );
  TestValidator.notEquals(
    "second refresh access token changed from first",
    secondRefresh.token.access,
    firstRefreshAccessToken,
  );

  const secondRefreshAccessToken = secondRefresh.token.access;
  const secondRefreshExpiredAt = secondRefresh.token.expired_at;

  TestValidator.predicate(
    "second refresh expiration is after first",
    new Date(secondRefreshExpiredAt).getTime() >=
      new Date(firstRefreshExpiredAt).getTime(),
  );

  const thirdRefreshBody = {
    refreshToken: initialRefreshToken,
  } satisfies ITodoListAdmin.IRefresh;

  const thirdRefresh = await api.functional.auth.admin.refresh(connection, {
    body: thirdRefreshBody,
  });
  typia.assert(thirdRefresh);

  TestValidator.equals(
    "third refresh admin ID matches",
    thirdRefresh.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "third refresh admin email matches",
    thirdRefresh.email,
    createdAdmin.email,
  );
  TestValidator.notEquals(
    "third refresh access token changed from second",
    thirdRefresh.token.access,
    secondRefreshAccessToken,
  );

  const thirdRefreshExpiredAt = thirdRefresh.token.expired_at;

  TestValidator.predicate(
    "third refresh expiration is after second",
    new Date(thirdRefreshExpiredAt).getTime() >=
      new Date(secondRefreshExpiredAt).getTime(),
  );

  TestValidator.equals(
    "admin created_at preserved",
    thirdRefresh.created_at,
    createdAdmin.created_at,
  );
}
