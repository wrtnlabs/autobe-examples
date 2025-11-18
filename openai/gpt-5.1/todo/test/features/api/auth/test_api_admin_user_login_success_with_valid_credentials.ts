import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate successful admin user login with valid credentials.
 *
 * Business goal:
 *
 * - Ensure that an administrative user created via POST /auth/adminUser/join can
 *   subsequently authenticate via POST /auth/adminUser/login using the same
 *   email and password.
 * - Verify that the ITodoAppAdminUser.IAuthorized payload from login preserves
 *   identity information (id, email, display_name) and reflects a plausibly
 *   active account state.
 * - Confirm that the embedded IAuthorizationToken contains a usable token bundle
 *   with non-empty access/refresh tokens and properly shaped expiration
 *   timestamps.
 *
 * High-level steps:
 *
 * 1. Register a new admin user using api.functional.auth.adminUser.join.
 * 2. Login with the same email and password using
 *    api.functional.auth.adminUser.login.
 * 3. Compare identity fields between join and login responses.
 * 4. Validate status, failed_login_count, last_login_at, and deleted_at.
 * 5. Validate token structure and basic business expectations.
 */
export async function test_api_admin_user_login_success_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Register a new admin user.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);

  const joinBody = {
    email,
    password,
    display_name: RandomGenerator.name(2),
  } satisfies ITodoAppAdminUser.IJoin;

  const joined: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(joined);

  // 2. Login with the same credentials, providing audit context.
  const loginBody = {
    email,
    password,
    href: "https://admin.todo-app.local/login" as string & tags.Format<"uri">,
    referrer: "https://admin.todo-app.local/" as string & tags.Format<"uri">,
    ip: "203.0.113.10",
    user_agent: "Mozilla/5.0 (E2E Test Admin Login)",
  } satisfies ITodoAppAdminUser.ILogin;

  const loggedIn: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: loginBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(loggedIn);

  // 3. Identity invariants between join and login.
  TestValidator.equals(
    "admin id should remain consistent between join and login",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "admin email should remain consistent between join and login",
    loggedIn.email,
    joined.email,
  );

  // display_name is optional and nullable; compare raw values safely.
  TestValidator.equals(
    "display_name should remain consistent between join and login",
    loggedIn.display_name ?? null,
    joined.display_name ?? null,
  );

  // 4. Account status and security counters.
  TestValidator.predicate(
    "status should be a non-empty string",
    () => typeof loggedIn.status === "string" && loggedIn.status.length > 0,
  );

  TestValidator.predicate(
    "failed_login_count should be non-negative",
    () => loggedIn.failed_login_count >= 0,
  );

  TestValidator.predicate(
    "last_login_at should be set after successful login",
    () =>
      loggedIn.last_login_at !== null && loggedIn.last_login_at !== undefined,
  );

  TestValidator.predicate(
    "deleted_at should not be set for an active admin user",
    () => loggedIn.deleted_at === null || loggedIn.deleted_at === undefined,
  );

  // 5. Token bundle validation.
  const token: IAuthorizationToken = loggedIn.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token should be a non-empty string",
    () => typeof token.access === "string" && token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be a non-empty string",
    () => typeof token.refresh === "string" && token.refresh.length > 0,
  );

  TestValidator.predicate(
    "expired_at should be a non-empty date-time string",
    () => token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refreshable_until should be a non-empty date-time string",
    () => token.refreshable_until.length > 0,
  );

  TestValidator.notEquals(
    "expired_at and refreshable_until should not be identical",
    token.expired_at,
    token.refreshable_until,
  );
}
