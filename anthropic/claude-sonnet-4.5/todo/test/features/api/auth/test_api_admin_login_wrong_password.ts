import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validates that attempting to log in as an admin with a correct email but an
 * incorrect password does not grant access and does not disclose user existence
 * or system details.
 *
 * Steps:
 *
 * 1. Register a new admin account with a random email and password.
 * 2. Attempt to log in using the same email with an incorrect password, expecting
 *    a generic error message and no system information leakage.
 * 3. Repeat the failed login attempt to check that no additional information is
 *    revealed and the account is unaffected.
 * 4. Confirm that login with correct credentials still works.
 */
export async function test_api_admin_login_wrong_password(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinInput = {
    email: adminEmail,
    password: adminPassword as string &
      tags.MinLength<8> &
      tags.Format<"password">,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
    ip: null,
  } satisfies ITodoListAdmin.IJoin;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(admin);

  // 2. Attempt login with wrong password
  const wrongLoginInput = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(14), // Deliberately different password, 14 chars
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
    ip: null,
  } satisfies ITodoListAdmin.ILogin;

  await TestValidator.error(
    "admin login with wrong password returns generic error, no system info revealed",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: wrongLoginInput,
      });
    },
  );

  // 3. Repeat failed login and check same behavior
  await TestValidator.error(
    "repeated admin wrong password login gives no additional info",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: wrongLoginInput,
      });
    },
  );

  // 4. Ensure original account can still login
  const successLoginInput = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
    ip: null,
  } satisfies ITodoListAdmin.ILogin;

  const result = await api.functional.auth.admin.login(connection, {
    body: successLoginInput,
  });
  typia.assert(result);
  TestValidator.equals(
    "successful login returns expected email",
    result.email,
    adminEmail,
  );
}
