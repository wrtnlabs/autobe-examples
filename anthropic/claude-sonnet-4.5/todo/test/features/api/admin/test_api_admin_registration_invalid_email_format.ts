import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test administrator registration validation for malformed email addresses.
 *
 * This test validates that the admin registration endpoint properly enforces
 * email format validation by rejecting various types of invalid email
 * addresses. It attempts to register admin accounts with multiple malformed
 * email patterns including: emails missing the @ symbol, emails with multiple @
 * symbols, emails with invalid domain structures, emails with spaces, emails
 * with only local part and no domain, and completely non-email strings.
 *
 * The test verifies that the endpoint's email validation (using
 * tags.Format<"email">) properly rejects all invalid formats with clear error
 * responses, ensuring that no admin accounts are created in the
 * todo_list_admins table for any invalid email submissions. This protects the
 * data integrity of the admin authentication system and the unique constraint
 * on the email column.
 *
 * Each invalid email format is tested independently using TestValidator.error()
 * to confirm that the registration attempt fails as expected. The test ensures
 * robust email format validation at the API boundary before any database
 * operations.
 */
export async function test_api_admin_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Test 1: Email missing @ symbol
  await TestValidator.error(
    "should reject email without @ symbol",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "invalidemail.com",
          password: "securePassword123",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoListAdmin.ICreate,
      });
    },
  );

  // Test 2: Email with multiple @ symbols
  await TestValidator.error(
    "should reject email with multiple @ symbols",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "user@@example.com",
          password: "securePassword123",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoListAdmin.ICreate,
      });
    },
  );

  // Test 3: Email missing domain
  await TestValidator.error("should reject email without domain", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: "user@",
        password: "securePassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  });

  // Test 4: Email missing local part
  await TestValidator.error(
    "should reject email without local part",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "@example.com",
          password: "securePassword123",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoListAdmin.ICreate,
      });
    },
  );

  // Test 5: Email with spaces
  await TestValidator.error(
    "should reject email containing spaces",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "user name@example.com",
          password: "securePassword123",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoListAdmin.ICreate,
      });
    },
  );

  // Test 6: Email with invalid domain structure
  await TestValidator.error(
    "should reject email with invalid domain structure",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "user@domain",
          password: "securePassword123",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoListAdmin.ICreate,
      });
    },
  );

  // Test 7: Completely non-email string
  await TestValidator.error("should reject non-email string", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: "notanemail",
        password: "securePassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  });

  // Test 8: Empty string
  await TestValidator.error("should reject empty email string", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: "",
        password: "securePassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  });

  // Test 9: Email with consecutive dots
  await TestValidator.error(
    "should reject email with consecutive dots",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "user..name@example.com",
          password: "securePassword123",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoListAdmin.ICreate,
      });
    },
  );

  // Test 10: Email starting with dot
  await TestValidator.error(
    "should reject email starting with dot",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: ".user@example.com",
          password: "securePassword123",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoListAdmin.ICreate,
      });
    },
  );
}
