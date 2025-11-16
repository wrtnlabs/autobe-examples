import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test admin registration with weak passwords.
 *
 * Validates that the admin registration endpoint properly enforces password
 * security requirements. Tests various weak password scenarios including:
 *
 * - Empty passwords
 * - Very short passwords (1-3 characters)
 * - Passwords with only lowercase letters
 * - Passwords with only numbers
 * - Passwords with only special characters
 *
 * Confirms that all weak password attempts are rejected with appropriate error
 * responses, ensuring that only passwords meeting security requirements can be
 * used to create admin accounts.
 *
 * 1. Attempt registration with empty password
 * 2. Attempt registration with very short password (1 character)
 * 3. Attempt registration with short password (3 characters)
 * 4. Attempt registration with password containing only lowercase letters
 * 5. Attempt registration with password containing only numbers
 * 6. Verify that weak passwords are consistently rejected
 * 7. Verify that appropriate error responses are provided for security violations
 */
export async function test_api_admin_registration_weak_password(
  connection: api.IConnection,
) {
  // Test 1: Attempt registration with empty password
  await TestValidator.error("empty password should be rejected", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "",
      } satisfies ITodoAppAdmin.ICreate,
    });
  });

  // Test 2: Attempt registration with very short password (1 character)
  await TestValidator.error(
    "single character password should be rejected",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "a",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 3: Attempt registration with short password (2 characters)
  await TestValidator.error("short password should be rejected", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ab",
      } satisfies ITodoAppAdmin.ICreate,
    });
  });

  // Test 4: Attempt registration with short password (3 characters)
  await TestValidator.error(
    "three character password should be rejected",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "abc",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 5: Attempt registration with lowercase only password
  await TestValidator.error(
    "lowercase only password should be rejected",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "abcdefgh",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 6: Attempt registration with numbers only password
  await TestValidator.error(
    "numbers only password should be rejected",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "12345678",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 7: Attempt registration with special characters only
  await TestValidator.error(
    "special characters only password should be rejected",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "!@#$%^&*",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 8: Attempt registration with uppercase and lowercase but no numbers
  await TestValidator.error(
    "password without numbers should be rejected",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "AbCdEfGh",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 9: Attempt registration with uppercase and numbers but no lowercase
  await TestValidator.error(
    "password without lowercase should be rejected",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "ABCD1234",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );
}
