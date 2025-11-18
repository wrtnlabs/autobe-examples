import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Validate that an administrator with a valid, unexpired refresh token can
 * successfully renew their session by obtaining new access and refresh JWT
 * tokens.
 *
 * 1. Prepare administrator login credentials (unique, random email & password).
 * 2. Log in as the administrator to obtain initial IAuthorized output and refresh
 *    token.
 * 3. Immediately call the refresh endpoint with the valid refresh token just
 *    obtained.
 * 4. Validate that the IAuthorized response from refresh contains new access and
 *    refresh tokens (tokens must differ from the original ones).
 * 5. Validate that the session record in the refreshed IAuthorized output differs
 *    from the original session, indicating that session activity is updated.
 * 6. Validate the returned administrator fields (id, email, password_hash,
 *    created_at, updated_at) match the admin's identity and are not
 *    soft-deleted (deleted_at is null or undefined).
 * 7. All tokens and session outputs must satisfy their respective type contracts
 *    via typia.assert().
 */
export async function test_api_admin_refresh_successful_token_renewal(
  connection: api.IConnection,
) {
  // 1. Generate unique admin credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // At least 8 chars
  const href = "https://admin.todoapp.example.com/login";
  const referrer = "https://admin.todoapp.example.com/";

  // 2. Administrator logs in to obtain initial authorized session and token
  const loginBody = {
    email,
    password,
    ip: undefined,
    href,
    referrer,
  } satisfies ITodoAppAdmin.ILogin;
  const initialAuth = await api.functional.auth.admin.login(connection, {
    body: loginBody,
  });
  typia.assert(initialAuth);

  // 3. Refresh session using the valid refresh token from login
  const refreshBody = {
    refresh_token: initialAuth.token.refresh,
  } satisfies ITodoAppAdmin.IRefresh;
  const refreshedAuth = await api.functional.auth.admin.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshedAuth);

  // 4. Validate new tokens are different & valid, both token and admin info
  TestValidator.notEquals(
    "access token is renewed",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token is renewed",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );

  // 5. Session record in refreshed output is updated
  TestValidator.notEquals(
    "session is updated after refresh",
    refreshedAuth.session,
    initialAuth.session,
  );

  // 6. Admin is still active (not soft-deleted)
  TestValidator.equals(
    "admin id is consistent",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "admin email is consistent",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "password hash is consistent",
    refreshedAuth.password_hash,
    initialAuth.password_hash,
  );
  TestValidator.equals(
    "account created_at is consistent",
    refreshedAuth.created_at,
    initialAuth.created_at,
  );
  TestValidator.equals(
    "account updated_at is present",
    typeof refreshedAuth.updated_at,
    "string",
  );
  TestValidator.equals(
    "admin is not soft-deleted",
    refreshedAuth.deleted_at,
    null,
  );

  // 7. Type asserts: token and session
  typia.assert<IAuthorizationToken>(refreshedAuth.token);
  if (refreshedAuth.session !== undefined)
    typia.assert<ITodoAppAdminSession.ISummary>(refreshedAuth.session);
}
