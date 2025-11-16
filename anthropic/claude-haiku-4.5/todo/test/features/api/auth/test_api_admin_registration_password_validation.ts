import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test password security requirements during admin registration.
 *
 * This test validates that the admin registration endpoint properly enforces
 * password security standards. It verifies:
 *
 * - Strong passwords meeting requirements are accepted
 * - Weak passwords (too short, only lowercase, only numbers) are rejected
 * - Boundary conditions for password length
 * - Successful registration returns admin data with tokens
 * - Passwords are properly secured and not exposed in responses
 *
 * Steps:
 *
 * 1. Test successful admin registration with a strong password
 * 2. Verify the response contains proper admin data and authorization tokens
 * 3. Test that weak passwords (too short) are rejected
 * 4. Test that passwords with only lowercase letters are rejected
 * 5. Test that passwords with only numbers are rejected
 * 6. Verify boundary conditions for password length
 * 7. Verify password is not exposed in API responses
 */
export async function test_api_admin_registration_password_validation(
  connection: api.IConnection,
) {
  // Test 1: Successful registration with a strong password
  const strongPassword = "SecureAdminPass123!@#";
  const adminEmail = typia.random<string & tags.Format<"email">>();

  const successfulAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: strongPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });

  typia.assert(successfulAdmin);
  TestValidator.equals(
    "admin email matches input",
    successfulAdmin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "authorization access token is present",
    !!successfulAdmin.token && !!successfulAdmin.token.access,
  );
  TestValidator.predicate(
    "authorization refresh token is present",
    !!successfulAdmin.token.refresh,
  );

  // Test 2: Weak password - too short
  const shortPassword = "abc";
  const weakEmail1 = typia.random<string & tags.Format<"email">>();

  await TestValidator.error("short password should be rejected", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: weakEmail1,
        password: shortPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });
  });

  // Test 3: Weak password - only lowercase letters
  const lowercasePassword = "onlylowercaseletters";
  const weakEmail2 = typia.random<string & tags.Format<"email">>();

  await TestValidator.error(
    "lowercase-only password should be rejected",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: weakEmail2,
          password: lowercasePassword,
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 4: Weak password - only numbers
  const numbersOnlyPassword = "12345678901234";
  const weakEmail3 = typia.random<string & tags.Format<"email">>();

  await TestValidator.error(
    "numbers-only password should be rejected",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: weakEmail3,
          password: numbersOnlyPassword,
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 5: Boundary condition - password at minimum acceptable length with complexity
  const minLengthPassword = "Pass1!";
  const minLengthEmail = typia.random<string & tags.Format<"email">>();

  const minLengthAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: minLengthEmail,
        password: minLengthPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });

  typia.assert(minLengthAdmin);
  TestValidator.equals(
    "min length password accepted",
    minLengthAdmin.email,
    minLengthEmail,
  );

  // Test 6: Verify password is not exposed in response
  TestValidator.predicate(
    "strong password not in response",
    !JSON.stringify(successfulAdmin).includes(strongPassword),
  );

  TestValidator.predicate(
    "min length password not in response",
    !JSON.stringify(minLengthAdmin).includes(minLengthPassword),
  );

  // Test 7: Verify admin has proper timestamps
  TestValidator.predicate(
    "created_at timestamp present",
    !!successfulAdmin.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp present",
    !!successfulAdmin.updated_at,
  );

  // Test 8: Verify token expiration information is present
  TestValidator.predicate(
    "access token expiration present",
    !!successfulAdmin.token.expired_at,
  );
  TestValidator.predicate(
    "refresh token expiration present",
    !!successfulAdmin.token.refreshable_until,
  );
}
