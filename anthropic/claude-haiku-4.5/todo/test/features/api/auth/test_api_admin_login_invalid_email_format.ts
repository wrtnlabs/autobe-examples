import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test admin login with invalid email format. Verifies that the system
 * validates email format and rejects malformed addresses.
 */
export async function test_api_admin_login_invalid_email_format(
  connection: api.IConnection,
) {
  // Test various invalid email formats
  const invalidEmails = [
    "notanemail", // Missing @
    "admin@", // Missing domain
    "@example.com", // Missing local part
    "admin @example.com", // Space in email
    "admin@.com", // Missing domain name
    "admin@@example.com", // Double @
    "admin@example..com", // Double dot
    "admin@example.com.", // Trailing dot
    ".admin@example.com", // Leading dot
  ];

  // Test that each invalid email format is rejected
  for (const invalidEmail of invalidEmails) {
    await TestValidator.error(
      `admin login should reject invalid email format: ${invalidEmail}`,
      async () => {
        await api.functional.auth.admin.login(connection, {
          body: {
            email: invalidEmail,
            password: "validPassword123",
          } satisfies ITodoAppAdmin.ICreate,
        });
      },
    );
  }
}
