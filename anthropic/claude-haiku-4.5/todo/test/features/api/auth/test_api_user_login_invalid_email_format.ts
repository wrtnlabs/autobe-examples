import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that login with malformed email addresses is rejected.
 *
 * This test validates that the login endpoint properly rejects authentication
 * attempts with invalid email formats that do not conform to RFC 5322 standard.
 * The system should validate email format and reject authentication, ensuring
 * that no tokens are issued for invalid requests.
 *
 * Test scenarios:
 *
 * 1. Email missing @ symbol
 * 2. Email with missing domain extension
 * 3. Email with invalid characters
 * 4. Email with spaces
 * 5. Email with multiple @ symbols
 * 6. Completely empty email
 */
export async function test_api_user_login_invalid_email_format(
  connection: api.IConnection,
) {
  // Test 1: Email missing @ symbol
  await TestValidator.error(
    "login should reject email without @ symbol",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: "invalidemail.com" satisfies ITodoListUser.ILogin["email"],
          password: RandomGenerator.alphabets(8),
        } satisfies ITodoListUser.ILogin,
      });
    },
  );

  // Test 2: Email with missing domain extension
  await TestValidator.error(
    "login should reject email with missing domain extension",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: "user@domain" satisfies ITodoListUser.ILogin["email"],
          password: RandomGenerator.alphabets(8),
        } satisfies ITodoListUser.ILogin,
      });
    },
  );

  // Test 3: Email with invalid characters
  await TestValidator.error(
    "login should reject email with invalid characters",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: "user@domain#.com" satisfies ITodoListUser.ILogin["email"],
          password: RandomGenerator.alphabets(8),
        } satisfies ITodoListUser.ILogin,
      });
    },
  );

  // Test 4: Email with spaces
  await TestValidator.error(
    "login should reject email with spaces",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: "user @domain.com" satisfies ITodoListUser.ILogin["email"],
          password: RandomGenerator.alphabets(8),
        } satisfies ITodoListUser.ILogin,
      });
    },
  );

  // Test 5: Email with multiple @ symbols
  await TestValidator.error(
    "login should reject email with multiple @ symbols",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: "user@@domain.com" satisfies ITodoListUser.ILogin["email"],
          password: RandomGenerator.alphabets(8),
        } satisfies ITodoListUser.ILogin,
      });
    },
  );

  // Test 6: Empty email
  await TestValidator.error("login should reject empty email", async () => {
    await api.functional.auth.user.login(connection, {
      body: {
        email: "" satisfies ITodoListUser.ILogin["email"],
        password: RandomGenerator.alphabets(8),
      } satisfies ITodoListUser.ILogin,
    });
  });
}
