import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test admin login with non-existent email address.
 *
 * This test validates security behavior when attempting to authenticate with an
 * email address that is not registered as an admin account. The system should
 * return a generic authentication error (AUTH_INVALID_CREDENTIALS) without
 * revealing whether the email exists, preventing email enumeration attacks.
 *
 * Test Flow:
 *
 * 1. Register a baseline admin account to verify the system is operational
 * 2. Attempt login with a non-existent email address with valid password format
 * 3. Verify that the system returns generic error without email disclosure
 * 4. Confirm error response is identical to invalid password scenarios
 */
export async function test_api_admin_login_nonexistent_email(
  connection: api.IConnection,
) {
  // 1. Register a baseline admin account to verify system is operational
  const validAdminEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = RandomGenerator.alphabets(12); // At least 8 characters

  const registeredAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: validAdminEmail,
        password: validPassword,
        password_confirmation: validPassword,
      } satisfies ITodoAppAdmin.IRegister,
    });
  typia.assert(registeredAdmin);

  // 2. Attempt login with non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphabets(12);

  // Verify that login with non-existent email fails
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: nonExistentEmail,
          password: testPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoAppAdmin.ILogin,
      });
    },
  );

  // 3. Verify that login with valid email but wrong password also fails
  // to confirm error responses are identical (security measure against enumeration)
  await TestValidator.error(
    "login with valid email but wrong password should fail",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: validAdminEmail,
          password: RandomGenerator.alphabets(12), // Different password
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoAppAdmin.ILogin,
      });
    },
  );

  // 4. Verify successful login with correct credentials still works
  const successfulLogin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: validAdminEmail,
        password: validPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppAdmin.ILogin,
    });
  typia.assert(successfulLogin);

  // Verify the authenticated admin matches the registered admin
  TestValidator.equals(
    "authenticated admin matches registered admin",
    successfulLogin.id,
    registeredAdmin.id,
  );
  TestValidator.equals(
    "authenticated admin email matches",
    successfulLogin.email,
    registeredAdmin.email,
  );
}
