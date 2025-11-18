import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate administrator login with valid credentials.
 *
 * This test function
 *
 * 1. Registers a new admin user with a unique email and password via the join API.
 * 2. Attempts to login with the same email and password, providing session
 *    context:
 *
 *    - Current page URL (href)
 *    - Referring page URL (referrer)
 * 3. Asserts the login response includes a valid authorization token and complete
 *    admin user information respecting the schema.
 *
 * This test assures that newly created admins can successfully authenticate and
 * receive predictable API response shape including tokens.
 */
export async function test_api_admin_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // Register new admin account
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassw0rd!",
  } satisfies ITodoListAdmin.ICreate;

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createBody,
    });
  typia.assert(admin);

  // Attempt login with the same admin credentials
  const loginBody = {
    email: admin.email,
    password: createBody.password,
    href: `https://${typia.random<string & tags.Format<"uri">>()}`,
    referrer: `https://${typia.random<string & tags.Format<"uri">>()}`,
    ip: null,
  } satisfies ITodoListAdmin.ILogin;

  const loginResponse: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResponse);

  // Verify token existence and admin details
  TestValidator.predicate(
    "login token exists",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.equals(
    "admin email matches",
    loginResponse.email,
    createBody.email,
  );
  TestValidator.predicate(
    "admin id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      loginResponse.id,
    ),
  );
  TestValidator.predicate(
    "created_at is date-time",
    typeof loginResponse.created_at === "string" &&
      loginResponse.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is date-time",
    typeof loginResponse.updated_at === "string" &&
      loginResponse.updated_at.length > 0,
  );
}
