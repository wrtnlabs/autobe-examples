import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_login_success_and_invalid_credentials(
  connection: api.IConnection,
) {
  // 1) Register a fresh admin account for isolated test context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "P@ssw0rd123"; // meets minlength 8
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const joined: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        href,
        referrer,
      } satisfies ITodoAppAdmin.ICreate,
    });
  // Validate join response thoroughly
  typia.assert(joined);

  // 2) Successful login using the created credentials
  const loginSuccess: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href,
        referrer,
      } satisfies ITodoAppAdmin.ILogin,
    });
  typia.assert(loginSuccess);
  // Explicitly assert token shape as well (clarity)
  typia.assert<IAuthorizationToken>(loginSuccess.token);

  // 3) Business-level validations
  TestValidator.equals(
    "returned admin id equals joined id",
    loginSuccess.id,
    joined.id,
  );
  TestValidator.equals("admin email matches", loginSuccess.email, adminEmail);
  TestValidator.equals("admin is active", loginSuccess.is_active, true);

  TestValidator.predicate(
    "access token present",
    typeof loginSuccess.token.access === "string" &&
      loginSuccess.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    typeof loginSuccess.token.refresh === "string" &&
      loginSuccess.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiry present",
    typeof loginSuccess.token.expired_at === "string" &&
      loginSuccess.token.expired_at.length > 0,
  );

  // Ensure no sensitive fields leaked (server must not return password_hash)
  TestValidator.predicate(
    "no password_hash leaked",
    !Object.prototype.hasOwnProperty.call(loginSuccess, "password_hash"),
  );

  // 4) Negative case: invalid credentials
  await TestValidator.error(
    "invalid credentials should be rejected",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password: adminPassword + "-wrong",
          href,
          referrer,
        } satisfies ITodoAppAdmin.ILogin,
      });
    },
  );
}
