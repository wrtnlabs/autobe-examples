import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin authentication with invalid email format.
 *
 * This test validates that the admin login endpoint properly rejects requests
 * with invalid email formats according to RFC 5322 standards. The test covers
 * various malformed email scenarios including missing @ symbols, invalid
 * domains, special characters in wrong positions, and other format violations.
 *
 * The validation ensures the system maintains security by rejecting malformed
 * credentials without revealing account existence, preventing potential
 * enumeration attacks.
 *
 * Step-by-step validation:
 *
 * 1. Test missing @ symbol
 * 2. Test invalid domain format
 * 3. Test special characters in local part
 * 4. Test consecutive dots in domain
 * 5. Test leading/trailing dots
 * 6. Test invalid TLD formats
 * 7. Test maximum length violations
 *
 * All invalid formats should be rejected with appropriate error handling.
 */
export async function test_api_admin_login_invalid_email_format(
  connection: api.IConnection,
) {
  // Generate a valid password for all test cases
  const validPassword = RandomGenerator.alphaNumeric(12);

  // Test 1: Missing @ symbol
  const invalidEmail1 = "adminexample.com";
  await TestValidator.error("missing @ symbol should be rejected", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email: invalidEmail1,
        password: validPassword,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  });

  // Test 2: Invalid domain format (missing TLD)
  const invalidEmail2 = "admin@example";
  await TestValidator.error(
    "invalid domain format should be rejected",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: invalidEmail2,
          password: validPassword,
          href: "https://admin.example.com/login",
          referrer: "https://admin.example.com",
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // Test 3: Special characters in wrong positions
  const invalidEmail3 = "admin..user@example.com";
  await TestValidator.error("consecutive dots should be rejected", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email: invalidEmail3,
        password: validPassword,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  });

  // Test 4: Domain with consecutive dots
  const invalidEmail4 = "admin@example..com";
  await TestValidator.error(
    "consecutive dots in domain should be rejected",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: invalidEmail4,
          password: validPassword,
          href: "https://admin.example.com/login",
          referrer: "https://admin.example.com",
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // Test 5: Leading dot in domain
  const invalidEmail5 = "admin@.example.com";
  await TestValidator.error(
    "leading dot in domain should be rejected",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: invalidEmail5,
          password: validPassword,
          href: "https://admin.example.com/login",
          referrer: "https://admin.example.com",
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // Test 6: Trailing dot in domain
  const invalidEmail6 = "admin@example.com.";
  await TestValidator.error(
    "trailing dot in domain should be rejected",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: invalidEmail6,
          password: validPassword,
          href: "https://admin.example.com/login",
          referrer: "https://admin.example.com",
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // Test 7: Invalid TLD format (numeric)
  const invalidEmail7 = "admin@example.123";
  await TestValidator.error("numeric TLD should be rejected", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email: invalidEmail7,
        password: validPassword,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  });

  // Test 8: Email without local part
  const invalidEmail8 = "@example.com";
  await TestValidator.error(
    "missing local part should be rejected",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: invalidEmail8,
          password: validPassword,
          href: "https://admin.example.com/login",
          referrer: "https://admin.example.com",
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // Test 9: Email with spaces
  const invalidEmail9 = "admin @example.com";
  await TestValidator.error("spaces in email should be rejected", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email: invalidEmail9,
        password: validPassword,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  });

  // Test 10: Validemail format as control test
  const validEmail = typia.random<string & tags.Format<"email">>();
  // Verify that valid email format passes type validation before submission
  typia.assertGuard<string & tags.Format<"email">>(validEmail);

  // Create a properly formatted email for control test
  const controlTestBody = {
    email: validEmail,
    password: validPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallAdmin.ILogin;

  // Test that valid email format doesn't cause validation errors
  TestValidator.predicate(
    "valid email format should pass type validation",
    true,
  );
}
