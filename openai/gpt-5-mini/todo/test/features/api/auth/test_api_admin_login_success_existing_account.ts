import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * E2E test: admin login success with an existing account.
 *
 * Business purpose:
 *
 * - Ensure that creating an admin account (POST /auth/admin/join) yields a safe
 *   authorized payload and that subsequent login (POST /auth/admin/login) with
 *   the same credentials returns an authorized response with tokens and an
 *   admin summary that does not expose sensitive fields such as password_hash.
 *
 * Steps:
 *
 * 1. Generate unique admin credentials (email, password).
 * 2. Call api.functional.auth.admin.join to create the admin account.
 * 3. Validate join response shape and business invariants (email match, tokens
 *    present, no password_hash).
 * 4. Call api.functional.auth.admin.login with the same credentials.
 * 5. Validate login response (tokens present, timestamps parsable when present, no
 *    password_hash).
 */
export async function test_api_admin_login_success_existing_account(
  connection: api.IConnection,
) {
  // 1) Generate unique credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  // 2) Create admin account (setup)
  const joinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies ITodoAppAdmin.ICreate;

  const created: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(created);

  // Business validations for join response
  TestValidator.equals(
    "join returned same email as requested",
    created.email,
    adminEmail,
  );
  TestValidator.predicate(
    "join returned access token",
    typeof created.token?.access === "string" &&
      created.token.access.length > 0,
  );
  TestValidator.predicate(
    "join returned refresh token",
    typeof created.token?.refresh === "string" &&
      created.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "join response must not contain password_hash",
    !("password_hash" in created),
  );

  // If last_active_at is present, ensure it's a valid ISO 8601 date-time
  if (created.last_active_at !== null && created.last_active_at !== undefined) {
    TestValidator.predicate(
      "join last_active_at is valid date-time",
      !Number.isNaN(Date.parse(created.last_active_at)),
    );
  }

  // 3) Perform login with same credentials
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies ITodoAppAdmin.ILogin;

  const logged: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(logged);

  // Business validations for login response
  TestValidator.equals(
    "login returned same email as requested",
    logged.email,
    adminEmail,
  );
  TestValidator.predicate(
    "login returned access token",
    typeof logged.token?.access === "string" && logged.token.access.length > 0,
  );
  TestValidator.predicate(
    "login returned refresh token",
    typeof logged.token?.refresh === "string" &&
      logged.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login response must not contain password_hash",
    !("password_hash" in logged),
  );

  // Validate token timestamps are ISO 8601 parsable
  TestValidator.predicate(
    "access token expired_at is a parsable date-time",
    !Number.isNaN(Date.parse(logged.token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token refreshable_until is a parsable date-time",
    !Number.isNaN(Date.parse(logged.token.refreshable_until)),
  );

  // last_active_at validation (if present)
  if (logged.last_active_at !== null && logged.last_active_at !== undefined) {
    TestValidator.predicate(
      "login last_active_at is valid date-time",
      !Number.isNaN(Date.parse(logged.last_active_at)),
    );
  }
}
